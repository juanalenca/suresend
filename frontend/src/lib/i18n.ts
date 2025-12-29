import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import LanguageDetector from 'i18next-browser-languagedetector';

// Import main translation files (not subdirectory)
import ptTranslation from '../locales/pt.json';
import enTranslation from '../locales/en.json';

i18n
    .use(LanguageDetector)
    .use(initReactI18next)
    .init({
        resources: {
            pt: { translation: ptTranslation },
            en: { translation: enTranslation }
        },
        fallbackLng: 'pt',
        interpolation: {
            escapeValue: false,
        },
        detection: {
            order: ['navigator'],
        }
    });

export default i18n;
