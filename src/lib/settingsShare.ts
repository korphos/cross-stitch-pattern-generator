import type { AppSettings } from './persistence'
import type { SizeUnit } from './physicalSize'

/** URL query param name used to carry a shared-settings token. */
export const SETTINGS_SHARE_PARAM = 'settings'

// Bump if the byte layout itself changes (not for adding/removing/reordering
// DMC colors elsewhere in the app - this encoding never looks at
// allDmcColors, it parses/rebuilds each code's own text, so it stays valid
// however that table changes later).
const VERSION = 2

const PREFIXES = ['', 'B', 'E', 'S'] as const
const WHITE_SENTINEL = 0xfffe
const ECRU_SENTINEL = 0xffff
const ZERO_PAD_BIT = 1 << 13
const NUMBER_MASK = 0x1fff

function toBase64Url(bytes: Uint8Array): string {
  let binary = ''
  for (const b of bytes) binary += String.fromCharCode(b)
  return btoa(binary).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '')
}

function fromBase64Url(token: string): Uint8Array {
  const base64 = token.replace(/-/g, '+').replace(/_/g, '/')
  const padded = base64 + '='.repeat((4 - (base64.length % 4)) % 4)
  const binary = atob(padded)
  const bytes = new Uint8Array(binary.length)
  for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i)
  return bytes
}

/** Packs one DMC code into a prefix (2 bits) + zero-pad flag (1 bit) + number (13 bits), or null if the code doesn't match the `[BES]?<digits>` / White / Ecru shape every known DMC code follows. */
function packCode(code: string): number | null {
  if (code === 'White') return WHITE_SENTINEL
  if (code === 'Ecru') return ECRU_SENTINEL
  const match = /^([BES]?)(\d+)$/.exec(code)
  if (!match) return null
  const prefixIndex = PREFIXES.indexOf(match[1] as (typeof PREFIXES)[number])
  const digits = match[2]
  const number = Number(digits)
  // codes 01-09 print with a leading zero on the real skein/label - preserve it so round-tripping
  // through a share link doesn't silently turn "09" into "9" (a different, wrong code).
  const zeroPad = digits.length === 2 && digits.startsWith('0') ? ZERO_PAD_BIT : 0
  if (number > NUMBER_MASK) return null // never happens for a real DMC number, just a safety net
  return (prefixIndex << 14) | zeroPad | number
}

function unpackCode(packed: number): string {
  if (packed === WHITE_SENTINEL) return 'White'
  if (packed === ECRU_SENTINEL) return 'Ecru'
  const prefix = PREFIXES[packed >> 14]
  const number = packed & NUMBER_MASK
  const numberText = packed & ZERO_PAD_BIT ? String(number).padStart(2, '0') : String(number)
  return `${prefix}${numberText}`
}

/**
 * Packs owned-threads + size unit into a compact URL-safe token: one header
 * byte (version + size unit) followed by 2 bytes per owned code. Codes are
 * stored as their own parsed text (prefix letter + number), not as an index
 * into any color table, so the token keeps decoding correctly even if
 * `allDmcColors` is reordered, extended, or trimmed in a later version.
 */
export function encodeSettings(settings: AppSettings): string {
  const packed = settings.ownedThreadCodes.map(packCode).filter((n): n is number => n !== null)
  const bytes = new Uint8Array(1 + packed.length * 2)
  bytes[0] = (VERSION << 1) | (settings.sizeUnit === 'in' ? 1 : 0)
  packed.forEach((n, i) => {
    bytes[1 + i * 2] = n >> 8
    bytes[2 + i * 2] = n & 0xff
  })
  return toBase64Url(bytes)
}

/** Inverse of `encodeSettings`. Returns null if the token is malformed or from an incompatible version. */
export function decodeSettings(token: string): AppSettings | null {
  try {
    const bytes = fromBase64Url(token)
    if (bytes.length < 1) return null
    const header = bytes[0]
    if (header >> 1 !== VERSION) return null
    const sizeUnit: SizeUnit = header & 1 ? 'in' : 'cm'
    const rest = bytes.subarray(1)
    if (rest.length % 2 !== 0) return null
    const ownedThreadCodes: string[] = []
    for (let i = 0; i < rest.length; i += 2) {
      ownedThreadCodes.push(unpackCode((rest[i] << 8) | rest[i + 1]))
    }
    return { ownedThreadCodes, sizeUnit }
  } catch {
    return null
  }
}
