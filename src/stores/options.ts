import { defineStore } from 'pinia';
import { ref } from 'vue';

interface State {
  isInGola: boolean;
  toPage: number | undefined;
}

export const useOptionsStore = defineStore('options', () => {
  const isInGola = ref<State['isInGola']>(false);
  const toPage = ref<State['toPage']>(undefined);

  function changeIsInGola(newIsInGola: State['isInGola']): void {
    isInGola.value = newIsInGola;
  }

  function changeToPage(newToPage: State['toPage']): void {
    toPage.value = newToPage;
  }

  return {
    isInGola,
    changeIsInGola,
    toPage,
    changeToPage
  };
});