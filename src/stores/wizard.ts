import { defineStore } from 'pinia';
import { computed, ref } from 'vue';
import { useOptionsStore } from './options';
import type { ManualData } from '@/types';

export const useWizardStore = defineStore('wizard', () => {
  const optionsStore = useOptionsStore();

  const currentStep = ref<number>(1);

  const fromPage = computed(() => optionsStore.fromPage);
  const fromRef = ref<ManualData | null>(null);
  const fromTargetKey = ref<string | null>(null);

  // TO state
  const toPage = computed(() => optionsStore.toPage);
  const toRef = ref<ManualData | null>(null);
  const toTargetKey = ref<string | null>(null);

  const setStep = (step: number) => {
    currentStep.value = step;
  };

  const setFromLocation = (page: number | null, data?: ManualData, targetKey?: string | null) => {
    optionsStore.changeFromPage(page);
    fromRef.value = data ?? null;
    fromTargetKey.value = targetKey ?? null;
  };

  const setToLocation = (page: number | null, data?: ManualData, targetKey?: string | null) => {
    optionsStore.changeToPage(page);
    toRef.value = data ?? null;
    toTargetKey.value = targetKey ?? null;
  };

  const resetWizard = () => {
    currentStep.value = 1;
    setFromLocation(null);
    setToLocation(null);
  };

  return {
    currentStep,
    fromPage,
    fromRef,
    fromTargetKey,
    toPage,
    toRef,
    toTargetKey,
    setStep,
    setFromLocation,
    setToLocation,
    resetWizard,
  };
});
