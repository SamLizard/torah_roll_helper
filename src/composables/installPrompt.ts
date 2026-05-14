import { computed, ref } from 'vue';

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  readonly userChoice: Promise<{
    outcome: 'accepted' | 'dismissed';
    platform: string;
  }>;
}

type NavigatorWithStandalone = Navigator & {
  standalone?: boolean;
};

const deferredPrompt = ref<BeforeInstallPromptEvent | null>(null);
const isInstallPromptAvailable = ref(false);
const isStandalone = ref(false);
const isInitialized = ref(false);

const getStandaloneState = (): boolean => {
  if (typeof window === 'undefined') {
    return false;
  }

  const hasStandaloneDisplayMode = window.matchMedia('(display-mode: standalone)').matches;
  const hasIosStandaloneMode = (window.navigator as NavigatorWithStandalone).standalone === true;

  return hasStandaloneDisplayMode || hasIosStandaloneMode;
};

const updateStandaloneState = (): void => {
  isStandalone.value = getStandaloneState();
};

const onBeforeInstallPrompt = (event: Event): void => {
  event.preventDefault();
  updateStandaloneState();

  if (isStandalone.value) {
    return;
  }

  deferredPrompt.value = event as BeforeInstallPromptEvent;
  isInstallPromptAvailable.value = true;
};

const onAppInstalled = (): void => {
  deferredPrompt.value = null;
  isInstallPromptAvailable.value = false;
  isStandalone.value = true;
};

const initializeInstallPrompt = (): void => {
  if (typeof window === 'undefined' || isInitialized.value) {
    return;
  }

  isInitialized.value = true;
  updateStandaloneState();
  window.addEventListener('beforeinstallprompt', onBeforeInstallPrompt);
  window.addEventListener('appinstalled', onAppInstalled);
};

const canInstall = computed(() => {
  return isInstallPromptAvailable.value && !isStandalone.value && deferredPrompt.value !== null;
});

const installApp = async (): Promise<void> => {
  if (!deferredPrompt.value) {
    return;
  }

  const promptEvent = deferredPrompt.value;
  await promptEvent.prompt();
  const { outcome } = await promptEvent.userChoice;

  deferredPrompt.value = null;
  isInstallPromptAvailable.value = false;

  if (outcome === 'accepted') {
    updateStandaloneState();
  }
};

const useInstallPrompt = () => {
  return {
    canInstall,
    initializeInstallPrompt,
    installApp,
    isStandalone,
  };
};

export { useInstallPrompt };
