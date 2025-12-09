import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import LanguageDetector from 'i18next-browser-languagedetector';

import ptJson from '../locales/pt.json';
import enJson from '../locales/en.json';

i18n
    .use(LanguageDetector)
    .use(initReactI18next)
    .init({
        resources: {
            pt: { ...ptJson, translation: ptJson }, // i18next expects 'translation' namespace by default if not specified, or we can just pass the object if we change config.
            // actually, usually it's { pt: { translation: { ... } } }
            // Let's check how I imported it. import ptJson from '../locales/pt.json'.
            // If pt.json is { hello: "hola" }, then resources should be { pt: { translation: { hello: "hola" } } }
            // The current structure of pt.json is { menu: { ... } }.
            // So I should map it to the 'translation' namespace or configure i18next to use a different default namespace.
            // Simpler to just wrap it.
            en: { ...enJson, translation: enJson },
        },
        // Better structure:
        // resources: {
        //   pt: { translation: ptJson },
        //   en: { translation: enJson }
        // }
        fallbackLng: 'pt',
        interpolation: {
            escapeValue: false,
        },
        detection: {
            order: ['navigator'],
        }
    });

export default i18n;
