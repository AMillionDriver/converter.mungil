import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import LanguageDetector from 'i18next-browser-languagedetector';

import id from './locales/id.json';
import en from './locales/en.json';
import zh from './locales/zh.json';
import es from './locales/es.json';
import ja from './locales/ja.json';
import fr from './locales/fr.json';
import de from './locales/de.json';

export interface LanguageOption {
  code: string;
  label: string;
  flag: string;
}

export const SUPPORTED_LANGUAGES: LanguageOption[] = [
  { code: 'id', label: 'Indonesia', flag: 'ID' },
  { code: 'en', label: 'English', flag: 'EN' },
  { code: 'zh', label: '中文 (简体)', flag: 'ZH' },
  { code: 'es', label: 'Español', flag: 'ES' },
  { code: 'ja', label: '日本語', flag: 'JA' },
  { code: 'fr', label: 'Français', flag: 'FR' },
  { code: 'de', label: 'Deutsch', flag: 'DE' },
];

i18n
  .use(LanguageDetector)
  .use(initReactI18next)
  .init({
    resources: {
      id: { translation: id },
      en: { translation: en },
      zh: { translation: zh },
      es: { translation: es },
      ja: { translation: ja },
      fr: { translation: fr },
      de: { translation: de },
    },
    fallbackLng: 'id',
    supportedLngs: ['id', 'en', 'zh', 'es', 'ja', 'fr', 'de'],
    interpolation: {
      escapeValue: false, // React already safely escapes values
    },
    detection: {
      order: ['localStorage', 'navigator'],
      lookupLocalStorage: 'mungil_lang',
      caches: ['localStorage'],
    },
  });

export default i18n;
