import { computed, ref } from 'vue';

type StorageManagerWithPersistence = StorageManager & {
  persist?: () => Promise<boolean>;
  persisted?: () => Promise<boolean>;
};

type NavigatorWithStoragePersistence = Navigator & {
  storage?: StorageManagerWithPersistence;
};

const isSupported = ref(false);
const isPersisted = ref(false);
const isChecking = ref(false);
const hasChecked = ref(false);
const error = ref(false);

const getStorageManager = (): StorageManagerWithPersistence | null => {
  if (typeof navigator === 'undefined') return null;
  return (navigator as NavigatorWithStoragePersistence).storage ?? null;
};

const refreshPersistenceStatus = async (): Promise<void> => {
  const storageManager = getStorageManager();
  isSupported.value = typeof storageManager?.persist === 'function'
    && typeof storageManager.persisted === 'function';

  if (!isSupported.value || !storageManager?.persisted) {
    isPersisted.value = false;
    hasChecked.value = true;
    return;
  }

  isChecking.value = true;
  error.value = false;

  try {
    isPersisted.value = await storageManager.persisted();
  } catch {
    error.value = true;
    isPersisted.value = false;
  } finally {
    isChecking.value = false;
    hasChecked.value = true;
  }
};

const requestPersistence = async (): Promise<boolean> => {
  const storageManager = getStorageManager();

  if (!isSupported.value || !storageManager?.persist) {
    await refreshPersistenceStatus();
    return false;
  }

  isChecking.value = true;
  error.value = false;

  try {
    const granted = await storageManager.persist();
    isPersisted.value = granted || (storageManager.persisted ? await storageManager.persisted() : false);
    return isPersisted.value;
  } catch {
    error.value = true;
    return false;
  } finally {
    isChecking.value = false;
    hasChecked.value = true;
  }
};

const status = computed<'persisted' | 'best-effort' | 'unsupported'>(() => {
  if (!isSupported.value) return 'unsupported';
  return isPersisted.value ? 'persisted' : 'best-effort';
});

const usePersistentStorage = () => ({
  error,
  hasChecked,
  isChecking,
  isPersisted,
  isSupported,
  requestPersistence,
  refreshPersistenceStatus,
  status,
});

export { usePersistentStorage };