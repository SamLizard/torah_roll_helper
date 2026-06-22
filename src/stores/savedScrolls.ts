import { defineStore } from 'pinia';
import { computed, ref } from 'vue';
import { SAVED_SCROLLS_STORAGE_KEY } from '@/composables/storageKeys';
import type { ManualData } from '@/types';
import type { TorahTypeOption } from '@/stores/options';

interface SavedScrollPosition {
  page: number;
  ref: ManualData | null;
  targetKey: string | null;
  updatedAt: string;
}

interface SavedScroll {
  id: string;
  name: string;
  torahType: TorahTypeOption;
  lastPosition: SavedScrollPosition | null;
  createdAt: string;
  updatedAt: string;
}

interface SavedScrollPositionInput {
  page: number | null;
  ref?: ManualData | null;
  targetKey?: string | null;
}

interface SaveScrollInput {
  name: string;
  torahType: TorahTypeOption;
  position?: SavedScrollPositionInput;
}

interface UpdateScrollInput {
  name?: string;
  torahType?: TorahTypeOption;
  position?: SavedScrollPositionInput;
}

const MAX_SCROLL_NAME_LENGTH = 80;

const cloneManualData = (value: ManualData | null | undefined): ManualData | null => {
  if (!value) return null;

  return {
    book: value.book,
    chapter: value.chapter,
    verse: value.verse,
  };
};

const normalizeScrollName = (name: string): string => {
  return name.trim().replace(/\s+/g, ' ').slice(0, MAX_SCROLL_NAME_LENGTH);
};

const createSavedScrollId = (): string => {
  if (typeof globalThis.crypto?.randomUUID === 'function') {
    return globalThis.crypto.randomUUID();
  }

  return `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`;
};

const buildPosition = (
  position: SavedScrollPositionInput | undefined,
  updatedAt: string,
): SavedScrollPosition | null => {
  if (!position || position.page == null) return null;

  return {
    page: position.page,
    ref: cloneManualData(position.ref),
    targetKey: position.targetKey ?? null,
    updatedAt,
  };
};

const useSavedScrollsStore = defineStore('savedScrolls', () => {
  const savedScrolls = ref<SavedScroll[]>([]);
  const activeScrollId = ref<string | null>(null);

  const activeScroll = computed(() => {
    if (!activeScrollId.value) return null;
    return savedScrolls.value.find((scroll) => scroll.id === activeScrollId.value) ?? null;
  });

  const hasSavedScrolls = computed(() => savedScrolls.value.length > 0);

  const setActiveScroll = (id: string | null): void => {
    activeScrollId.value = id && savedScrolls.value.some((scroll) => scroll.id === id)
      ? id
      : null;
  };

  const addScroll = ({ name, torahType, position }: SaveScrollInput): SavedScroll => {
    const normalizedName = normalizeScrollName(name);
    if (!normalizedName) {
      throw new Error('Saved scroll name is required.');
    }

    const now = new Date().toISOString();
    const savedScroll: SavedScroll = {
      id: createSavedScrollId(),
      name: normalizedName,
      torahType,
      lastPosition: buildPosition(position, now),
      createdAt: now,
      updatedAt: now,
    };

    savedScrolls.value = [savedScroll, ...savedScrolls.value];
    activeScrollId.value = savedScroll.id;
    return savedScroll;
  };

  const updateScroll = (id: string, updates: UpdateScrollInput): SavedScroll | null => {
    const existingIndex = savedScrolls.value.findIndex((scroll) => scroll.id === id);
    if (existingIndex < 0) return null;

    const existing = savedScrolls.value[existingIndex];
    const now = new Date().toISOString();
    const nextName = updates.name === undefined
      ? existing.name
      : normalizeScrollName(updates.name);

    if (!nextName) {
      throw new Error('Saved scroll name is required.');
    }

    const updatedScroll: SavedScroll = {
      ...existing,
      name: nextName,
      torahType: updates.torahType ?? existing.torahType,
      lastPosition: updates.position === undefined
        ? existing.lastPosition
        : buildPosition(updates.position, now),
      updatedAt: now,
    };

    savedScrolls.value = [
      ...savedScrolls.value.slice(0, existingIndex),
      updatedScroll,
      ...savedScrolls.value.slice(existingIndex + 1),
    ];
    return updatedScroll;
  };

  const removeScroll = (id: string): void => {
    savedScrolls.value = savedScrolls.value.filter((scroll) => scroll.id !== id);

    if (activeScrollId.value === id) {
      activeScrollId.value = savedScrolls.value[0]?.id ?? null;
    }
  };

  return {
    savedScrolls,
    activeScrollId,
    activeScroll,
    hasSavedScrolls,
    setActiveScroll,
    addScroll,
    updateScroll,
    removeScroll,
  };
}, {
  persist: {
    key: SAVED_SCROLLS_STORAGE_KEY,
    pick: ['savedScrolls', 'activeScrollId'],
  },
});

export { useSavedScrollsStore };
export type {
  SavedScroll,
  SavedScrollPosition,
  SavedScrollPositionInput,
};