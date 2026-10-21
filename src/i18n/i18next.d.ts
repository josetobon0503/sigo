// Typed translation keys: t('tabs.today') is checked at compile time.
import 'i18next';

import type en from './en.json';

declare module 'i18next' {
  interface CustomTypeOptions {
    defaultNS: 'translation';
    resources: { translation: typeof en };
  }
}
