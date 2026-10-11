import { describe, it, expect } from 'vitest';
import i18n, { SUPPORTED_LANGUAGES } from '../i18n/config';

import id from '../i18n/locales/id.json';
import en from '../i18n/locales/en.json';
import zh from '../i18n/locales/zh.json';
import es from '../i18n/locales/es.json';
import ja from '../i18n/locales/ja.json';
import fr from '../i18n/locales/fr.json';
import de from '../i18n/locales/de.json';

const allLocales = { id, en, zh, es, ja, fr, de };

describe('Multi-Language & i18n Infrastructure', () => {
  it('should support all 7 configured languages', () => {
    expect(SUPPORTED_LANGUAGES).toHaveLength(7);
    const codes = SUPPORTED_LANGUAGES.map((l) => l.code);
    expect(codes).toEqual(['id', 'en', 'zh', 'es', 'ja', 'fr', 'de']);
  });

  it('should have consistent schema keys across all 7 translation dictionaries', () => {
    const masterKeys = Object.keys(id).sort();
    const expectedSections = [
      'diffModal',
      'docMeta',
      'dropzone',
      'exif',
      'footer',
      'hero',
      'nav',
    ];
    expect(masterKeys).toEqual(expectedSections);

    for (const [langCode, dict] of Object.entries(allLocales)) {
      const keys = Object.keys(dict).sort();
      expect(
        keys,
        `Dictionary ${langCode} must have all top-level keys`
      ).toEqual(masterKeys);

      // Verify second-level keys match id.json
      for (const section of expectedSections) {
        const idSectionKeys = Object.keys(
          id[section as keyof typeof id]
        ).sort();
        const langSectionKeys = Object.keys(
          dict[section as keyof typeof dict]
        ).sort();
        expect(
          langSectionKeys,
          `Section '${section}' in '${langCode}' must match master schema`
        ).toEqual(idSectionKeys);
      }
    }
  });

  it('should dynamically switch language and return localized string', async () => {
    await i18n.changeLanguage('id');
    expect(i18n.t('hero.title')).toBe('Konversikan file dengan mudah');

    await i18n.changeLanguage('en');
    expect(i18n.t('hero.title')).toBe('Convert files with ease');

    await i18n.changeLanguage('zh');
    expect(i18n.t('hero.title')).toBe('轻松转换文件格式');

    await i18n.changeLanguage('es');
    expect(i18n.t('hero.title')).toBe('Convierte archivos con facilidad');

    await i18n.changeLanguage('ja');
    expect(i18n.t('hero.title')).toBe('ファイルを簡単に一括変換');

    await i18n.changeLanguage('fr');
    expect(i18n.t('hero.title')).toBe(
      'Convertissez vos fichiers en toute simplicité'
    );

    await i18n.changeLanguage('de');
    expect(i18n.t('hero.title')).toBe('Dateien mühelos konvertieren');
  });

  it('should fallback gracefully to Indonesian when an unconfigured locale is used', async () => {
    await i18n.changeLanguage('xx');
    expect(i18n.t('hero.title')).toBe('Konversikan file dengan mudah');
  });
});
