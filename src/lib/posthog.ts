import posthog from 'posthog-js'

const posthogKey = import.meta.env.VITE_POSTHOG_KEY
const posthogHost = import.meta.env.VITE_POSTHOG_HOST

if (posthogKey && posthogHost) {
  posthog.init(posthogKey, {
    api_host: posthogHost,
    defaults: '2026-05-30',
    capture_exceptions: {
      capture_unhandled_errors: true,
      capture_unhandled_rejections: true,
      capture_console_errors: false,
    },
  })
} else if (import.meta.env.DEV) {
  const missingVariable = posthogKey ? 'VITE_POSTHOG_HOST' : 'VITE_POSTHOG_KEY'

  throw new Error(
    `${missingVariable} variable required by PostHog is missing or un-configured, this causes events to be silently missed. This error stops appearing once ${missingVariable} is configured`,
  )
}

export default posthogKey && posthogHost ? posthog : undefined

// Grid adjustments (drag, wheel, manual field edits) can fire many times in quick succession
// during a single tweak - debounced so only the settled result after a pause is captured,
// instead of one event per keystroke/tick.
const GRID_ADJUSTED_DEBOUNCE_MS = 800
let gridAdjustedTimeout: ReturnType<typeof setTimeout> | undefined

export function captureGridAdjusted(method: string) {
  if (!posthogKey || !posthogHost) return
  clearTimeout(gridAdjustedTimeout)
  gridAdjustedTimeout = setTimeout(() => posthog.capture('grid_adjusted', { method }), GRID_ADJUSTED_DEBOUNCE_MS)
}
