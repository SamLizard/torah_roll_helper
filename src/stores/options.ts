import { defineStore } from 'pinia';
import { computed, ref } from 'vue';

const NUSACH_OPTIONS = ['sefaradic'] as const;
type NusachOption = (typeof NUSACH_OPTIONS)[number];

const TORAH_TYPE_OPTIONS = [
  { id: 'klaf_245', pageCount: 245 },
] as const;
type TorahTypeOption = (typeof TORAH_TYPE_OPTIONS)[number]['id'];

interface State {
  isInGola: boolean; // DONE 2: make the gola change the data shown.
  nusach: NusachOption;
  torahType: TorahTypeOption;
  fromPage: number | null;
  toPage: number | null;
}

const getTorahPageCount = (torahType: TorahTypeOption): number => {
  const match = TORAH_TYPE_OPTIONS.find((option) => option.id === torahType);
  return match?.pageCount ?? 245;
};

const useOptionsStore = defineStore('options', () => {
  const isInGola = ref<State['isInGola']>(false);
  const nusach = ref<State['nusach']>('sefaradic');
  const torahType = ref<State['torahType']>('klaf_245');
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
    maxTorahPages,
    fromPage,
    changeFromPage,
    toPage,
    changeToPage
  };
});

export { useOptionsStore, NUSACH_OPTIONS, TORAH_TYPE_OPTIONS, getTorahPageCount };
export type { NusachOption, TorahTypeOption };
