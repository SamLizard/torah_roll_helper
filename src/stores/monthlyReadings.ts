import { defineStore } from 'pinia';
import { ref, watch } from 'vue';
import { generateMonthlyReadings, type MonthlyReadings } from '@/composables/calendar/calendar';
import { useOptionsStore } from '@/stores/options';

const EMPTY_MONTHLY_READINGS: MonthlyReadings = {
  lastMonth: [],
  nextMonth: [],
};

const useMonthlyReadingsStore = defineStore('monthlyReadings', () => {
  const options = useOptionsStore();
  const monthlyReadings = ref<MonthlyReadings>(EMPTY_MONTHLY_READINGS);
  const lastSignature = ref<string>('');

  const getTodayKey = () => new Date().toISOString().slice(0, 10);

  const refresh = () => {
    const currentSignature = `${getTodayKey()}|${options.isInGola ? 'gola' : 'israel'}`;
    if (currentSignature === lastSignature.value) return;

    monthlyReadings.value = generateMonthlyReadings();
    lastSignature.value = currentSignature;
  };

  watch(() => options.isInGola, refresh, { immediate: true });

  return {
    monthlyReadings,
    refresh,
  };
});

export { useMonthlyReadingsStore };
