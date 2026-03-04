import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import { getLocales } from 'expo-localization';
import en from './en.json';
import hi from './hi.json';

const resources = { en: { translation: en }, hi: { translation: hi } };
const deviceLang = getLocales()[0]?.languageCode ?? 'en';

i18n.use(initReactI18next).init({
  resources,
  lng: deviceLang === 'hi' ? 'hi' : 'en',
  fallbackLng: 'en',
  interpolation: { escapeValue: false },
});

export default i18n;
