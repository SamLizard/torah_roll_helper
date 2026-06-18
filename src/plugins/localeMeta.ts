export type LocaleMeta = {
  rtl?: boolean;
  vuetifyExportName?: string;
};

const LOCALE_META: Record<string, LocaleMeta> = {
  he: { rtl: true },
};

export const getLocaleMeta = (locale: string): LocaleMeta => {
  return LOCALE_META[locale] ?? {};
};