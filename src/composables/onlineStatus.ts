import { onMounted, onUnmounted, ref } from 'vue';

const isOnline = ref(typeof navigator === 'undefined' ? true : navigator.onLine);
let listenerCount = 0;

const updateOnlineStatus = (): void => {
  isOnline.value = navigator.onLine;
};

const useOnlineStatus = () => {
  onMounted(() => {
    if (typeof window === 'undefined') {
      return;
    }

    if (listenerCount === 0) {
      updateOnlineStatus();
      window.addEventListener('online', updateOnlineStatus);
      window.addEventListener('offline', updateOnlineStatus);
    }

    listenerCount += 1;
  });

  onUnmounted(() => {
    if (typeof window === 'undefined' || listenerCount === 0) {
      return;
    }

    listenerCount -= 1;

    if (listenerCount === 0) {
      window.removeEventListener('online', updateOnlineStatus);
      window.removeEventListener('offline', updateOnlineStatus);
    }
  });

  return {
    isOnline,
  };
};

export { useOnlineStatus };
