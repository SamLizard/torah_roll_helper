import { defineStore } from 'pinia';
import { computed, ref } from 'vue';

const NUSACH_OPTIONS = ['sefaradic'] as const;
type NusachOption = (typeof NUSACH_OPTIONS)[number];

const TORAH_TYPE_OPTIONS = [
  { id: 'klaf_245', pageCount: 245 },
] as const;
type TorahTypeOption = (typeof TORAH_TYPE_OPTIONS)[number]['id'];

interface State {
  isInGola: boolean; // TODO 24.2: there is something that we didn't thought about. When the user switch this option, we have to pay attention that if he was on a page this is only for gola or only for israel, that it will continue to be displayed the same (and not disappear because the it is filtered out). Maybe the name of the page should contain the word "gola" or "israel" to make it more clear for the user. Pay attention that for the moment there is a bug that the reference point disappears (in this case).
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
