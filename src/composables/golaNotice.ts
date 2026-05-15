import { ref } from 'vue';
import { GOLA_NOTICE_STORAGE_KEY } from '@/composables/storageKeys';

const golaNoticeSeen = ref(
  typeof window !== 'undefined' && window.localStorage.getItem(GOLA_NOTICE_STORAGE_KEY) === 'true',
);

const markGolaNoticeSeen = (): void => {
  golaNoticeSeen.value = true;

  if (typeof window !== 'undefined') {
    window.localStorage.setItem(GOLA_NOTICE_STORAGE_KEY, 'true');
  }
};

const useGolaNotice = () => {
  return {
    golaNoticeSeen,
    markGolaNoticeSeen,
  };
};

export { useGolaNotice, markGolaNoticeSeen };
