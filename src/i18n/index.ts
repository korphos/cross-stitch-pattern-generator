import i18n from 'i18next'
import { initReactI18next } from 'react-i18next'
import LanguageDetector from 'i18next-browser-languagedetector'
import enUS from './en-US'
import frFR from './fr-FR'
import esES from './es-ES'
import ptBR from './pt-BR'
import deDE from './de-DE'
import plPL from './pl-PL'
import itIT from './it-IT'
import ukUA from './uk-UA'
import ruRU from './ru-RU'
import trTR from './tr-TR'
import nlNL from './nl-NL'
import zhCN from './zh-CN'

export const SUPPORTED_LANGUAGES = [
  { code: 'en-US', label: 'English' },
  { code: 'fr-FR', label: 'Français' },
  { code: 'es-ES', label: 'Español' },
  { code: 'pt-BR', label: 'Português' },
  { code: 'de-DE', label: 'Deutsch' },
  { code: 'it-IT', label: 'Italiano' },
  { code: 'nl-NL', label: 'Nederlands' },
  { code: 'pl-PL', label: 'Polski' },
  { code: 'ru-RU', label: 'Русский' },
  { code: 'uk-UA', label: 'Українська' },
  { code: 'tr-TR', label: 'Türkçe' },
  { code: 'zh-CN', label: '中文' },
] as const

// Maps a bare ISO 639-1 language code (what browsers/crawlers actually send, e.g. "es", "pt",
// "zh") to the one full resource key we ship a translation for. Needed because
// i18next's own nonExplicitSupportedLngs strips the region from BOTH sides of the comparison,
// so it can never match a bare code against a supportedLngs entry that itself has a region
// (e.g. "fr" vs "fr-FR") - an explicit table sidesteps that entirely.
const LANGUAGE_BY_BASE_CODE: Record<string, string> = Object.fromEntries(
  SUPPORTED_LANGUAGES.map(({ code }) => [code.split('-')[0].toLowerCase(), code]),
)

function convertDetectedLanguage(lng: string): string {
  const base = lng.toLowerCase().split('-')[0]
  return LANGUAGE_BY_BASE_CODE[base] ?? 'en-US'
}

// Keeps <html lang>, the document title, and the meta description in sync with the active
// language - search engines and screen readers both rely on <html lang> matching the visible
// text, and a translated title/description is what actually shows up in localized search results.
function syncDocumentMetadata() {
  document.documentElement.lang = i18n.resolvedLanguage ?? i18n.language
  document.title = i18n.t('seo.title')
  document.querySelector('meta[name="description"]')?.setAttribute('content', i18n.t('seo.description'))
}

// Registered before init() - the detector resolves and applies the initial language
// synchronously as part of init() itself, emitting these events before init()'s returned
// promise ever resolves, so listeners attached afterward would miss that first sync.
i18n.on('initialized', syncDocumentMetadata)
i18n.on('languageChanged', syncDocumentMetadata)

void i18n
  .use(LanguageDetector)
  .use(initReactI18next)
  .init({
    resources: {
      'en-US': { translation: enUS },
      'fr-FR': { translation: frFR },
      'es-ES': { translation: esES },
      'pt-BR': { translation: ptBR },
      'de-DE': { translation: deDE },
      'it-IT': { translation: itIT },
      'nl-NL': { translation: nlNL },
      'pl-PL': { translation: plPL },
      'ru-RU': { translation: ruRU },
      'uk-UA': { translation: ukUA },
      'tr-TR': { translation: trTR },
      'zh-CN': { translation: zhCN },
    },
    fallbackLng: 'en-US',
    supportedLngs: SUPPORTED_LANGUAGES.map((l) => l.code),
    detection: {
      // A "?lang=" URL (see the hreflang alternates in index.html, and the URL this app writes
      // back when a user manually picks a language in Settings) wins over anything cached, which
      // in turn wins over the browser's own language - so a crawler or a shared link always gets
      // a deterministic language regardless of past visits from that browser.
      order: ['querystring', 'localStorage', 'navigator'],
      lookupQuerystring: 'lang',
      caches: ['localStorage'],
      convertDetectedLanguage,
    },
    interpolation: { escapeValue: false },
  })

export default i18n
