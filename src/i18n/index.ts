import i18n from 'i18next'
import { initReactI18next } from 'react-i18next'
import LanguageDetector from 'i18next-browser-languagedetector'
import enUS from './en-US'
import frFR from './fr-FR'

void i18n
  .use(LanguageDetector)
  .use(initReactI18next)
  .init({
    resources: {
      'en-US': { translation: enUS },
      'fr-FR': { translation: frFR },
    },
    fallbackLng: 'en-US',
    supportedLngs: ['en-US', 'fr-FR'],
    detection: {
      // A manual pick (see SettingsPage's language select) is cached to localStorage and takes
      // priority on the next load; otherwise fall back to the browser's own language.
      order: ['localStorage', 'navigator'],
      caches: ['localStorage'],
      // Only French and (US) English are translated - fold any detected variant (bare "fr",
      // "fr-CA", "en-GB", ...) onto one of those two exact resource keys, rather than relying on
      // i18next's own supportedLngs fuzzy-matching (nonExplicitSupportedLngs strips the region
      // from BOTH sides of the comparison, so it can't match a bare code against a full one like
      // "fr-FR" - it needs an exact resource key either way).
      convertDetectedLanguage: (lng: string) => (lng.toLowerCase().startsWith('fr') ? 'fr-FR' : 'en-US'),
    },
    interpolation: { escapeValue: false },
  })

export default i18n
