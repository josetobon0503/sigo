import { getLocales } from 'expo-localization';
import { createInstance } from 'i18next';
import { initReactI18next } from 'react-i18next';

import en from './en.json';
import es from './es.json';

export type Lang = 'es' | 'en';

export const SUPPORTED_LANGUAGES: Lang[] = ['es', 'en'];

const i18n = createInstance();

// Spanish if the device language is any es-* locale, English otherwise.
export function getDeviceLanguage(): Lang {
  const languageCode = getLocales()[0]?.languageCode;
  return languageCode === 'es' ? 'es' : 'en';
}

export function setLanguage(lang: Lang): Promise<unknown> {
  return i18n.changeLanguage(lang);
}

void i18n.use(initReactI18next).init({
  resources: {
    es: { translation: es },
    en: { translation: en },
  },
  lng: getDeviceLanguage(),
  fallbackLng: 'en',
  interpolation: { escapeValue: false }, // React already escapes output
});

export default i18n;
