import { defineStore } from 'pinia';
import { computed, ref } from 'vue';
import { OPTIONS_STORAGE_KEY } from '@/composables/storageKeys';
import type { TikkunProviderSelection } from '@/composables/tikkunProviders';

const NUSACH_OPTIONS = ['sefaradic'] as const;
type NusachOption = (typeof NUSACH_OPTIONS)[number];

const CALENDAR_DATE_DISPLAY_OPTIONS = ['gregorian', 'hebrew'] as const;
type CalendarDateDisplayOption = (typeof CALENDAR_DATE_DISPLAY_OPTIONS)[number];

const TORAH_TYPE_OPTIONS = [
  { id: 'klaf_245', pageCount: 245 },
  { id: 'klaf_226', pageCount: 226 },
  { id: 'klaf_248', pageCount: 248 },
] as const;
type TorahTypeOption = (typeof TORAH_TYPE_OPTIONS)[number]['id'];

interface State {
  isInGola: boolean;
  nusach: NusachOption;
  torahType: TorahTypeOption;
  tikkunProvider: TikkunProviderSelection;
  calendarDateDisplay: CalendarDateDisplayOption;
  fromPage: number | null;
  toPage: number | null;
}

const getTorahPageCount = (torahType: TorahTypeOption): number => {
  const match = TORAH_TYPE_OPTIONS.find((option) => option.id === torahType);
  return match?.pageCount ?? 245;
};

const getLayoutKey = (torahType: TorahTypeOption): string => {
  return String(getTorahPageCount(torahType));
};

const useOptionsStore = defineStore('options', () => {
  const isInGola = ref<State['isInGola']>(false);
  const nusach = ref<State['nusach']>('sefaradic');
  const torahType = ref<State['torahType']>('klaf_245');
  const tikkunProvider = ref<State['tikkunProvider']>('auto');
  const calendarDateDisplay = ref<State['calendarDateDisplay']>('gregorian');
  const fromPage = ref<State['fromPage']>(null);
  const toPage = ref<State['toPage']>(null);
  const maxTorahPages = computed<number>(() => getTorahPageCount(torahType.value));

  const changeIsInGola = (newIsInGola: State['isInGola']): void => {
    isInGola.value = newIsInGola;
  };

  const changeNusach = (newNusach: State['nusach']): void => {
    nusach.value = newNusach;
  };

  const changeTorahType = (newTorahType: State['torahType']): void => {
    torahType.value = newTorahType;
  };

  const changeTikkunProvider = (newProvider: State['tikkunProvider']): void => {
    tikkunProvider.value = newProvider;
  };

  const changeCalendarDateDisplay = (newDisplay: State['calendarDateDisplay']): void => {
    calendarDateDisplay.value = newDisplay;
  };

  const changeFromPage = (newFromPage: State['fromPage']): void => {
    fromPage.value = newFromPage;
  };

  const changeToPage = (newToPage: State['toPage']): void => {
    toPage.value = newToPage;
  };

  return {
    isInGola,
    changeIsInGola,
    nusach,
    changeNusach,
    torahType,
    changeTorahType,
    tikkunProvider,
    changeTikkunProvider,
    calendarDateDisplay,
    changeCalendarDateDisplay,
    maxTorahPages,
    fromPage,
    changeFromPage,
    toPage,
    changeToPage,
  };
}, {
  persist: {
    key: OPTIONS_STORAGE_KEY,
    pick: ['isInGola', 'nusach', 'torahType', 'tikkunProvider', 'calendarDateDisplay'],
  },
});

export {
  useOptionsStore,
  NUSACH_OPTIONS,
  TORAH_TYPE_OPTIONS,
  CALENDAR_DATE_DISPLAY_OPTIONS,
  getTorahPageCount,
  getLayoutKey,
};
export type { NusachOption, TorahTypeOption, CalendarDateDisplayOption };
