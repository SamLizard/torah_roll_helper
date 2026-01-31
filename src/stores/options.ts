import { defineStore } from 'pinia';
import { ref } from 'vue';

interface State {
  isInGola: boolean; // DONE 2: make the gola change the data shown.
  fromPage: number | null;
  toPage: number | null;
}

export const useOptionsStore = defineStore('options', () => {
  const isInGola = ref<State['isInGola']>(false);
  const fromPage = ref<State['fromPage']>(null);
  const toPage = ref<State['toPage']>(null);

  function changeIsInGola(newIsInGola: State['isInGola']): void {
    isInGola.value = newIsInGola;
  }

  function changeFromPage(newFromPage: State['fromPage']): void {
    fromPage.value = newFromPage;
  }

  function changeToPage(newToPage: State['toPage']): void {
    toPage.value = newToPage;
  }

  return {
    isInGola,
    changeIsInGola,
    fromPage,
    changeFromPage,
    toPage,
    changeToPage
  };
});