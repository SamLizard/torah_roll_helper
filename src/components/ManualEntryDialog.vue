<template>
  <v-dialog v-model="dialog" max-width="500px">
    <v-card class="rounded-xl pa-4">
      <v-card-title class="manual-dialog-title">
        <div class="manual-dialog-title-text text-h6 font-weight-bold">
          {{ $t('manual.title') }}
        </div>

        <div class="manual-dialog-title-actions">
          <v-btn
            icon="mdi-restore"
            variant="text"
            size="small"
            :title="$t('actions.restore')"
            :disabled="!hasInitialSelection"
            @click="restoreInitial"
          />
          <v-btn
            icon="mdi-delete-outline"
            variant="text"
            color="error"
            size="small"
            :title="$t('actions.clear')"
            :disabled="isLocalEmpty"
            @click="clearLocal"
          />
        </div>
      </v-card-title>
      
      <v-card-text>
        <v-form v-model="isValid" @submit.prevent="confirm">
          <v-select
            v-model="localState.book"
            :items="bookOptions"
            item-title="title"
            item-value="value"
            :label="$t('manual.book')"
            variant="outlined"
            density="comfortable"
            class="mb-2"
            hide-details="auto"
          ></v-select>

          <div class="d-flex gap-4 mt-4">
            <v-text-field
              v-model.number="localState.chapter"
              type="number"
              :label="$t('manual.chapter')"
              :rules="chapterRules"
              variant="outlined"
              density="comfortable"
              min="1"
              :max="maxChapters"
            ></v-text-field>

            <v-text-field
              v-model.number="localState.verse"
              type="number"
              :label="$t('manual.verse')"
              :rules="verseRules"
              variant="outlined"
              density="comfortable"
              min="1"
              max="90"
            ></v-text-field>
          </div>

          <v-divider class="my-4" />

          <div class="text-caption text-medium-emphasis mb-2">{{ $t('manual.use_page') }}</div>
          <v-text-field
            v-model.number="pageNumber"
            type="number"
            :label="$t('manual.page')"
            :rules="pageRules"
            variant="outlined"
            density="comfortable"
            min="1"
            :max="maxPage"
          ></v-text-field>
        </v-form>
      </v-card-text>

      <v-card-actions class="justify-end pt-0">
        <v-btn variant="text" @click="close">{{ $t('actions.cancel') }}</v-btn>
        <v-btn 
          color="primary" 
          variant="flat" 
          :disabled="!canConfirm" 
          @click="confirm"
        >
          {{ $t('actions.confirm') }}
        </v-btn>
      </v-card-actions>
    </v-card>
  </v-dialog>
</template>

<script setup lang="ts">
import { ref, computed, watch, reactive } from 'vue';
import { useI18n } from 'vue-i18n';
import { getPageNumber } from '@/composables/utils';
import { useManualEntryRules } from '@/composables/rules';
import realDb from '@/data/real_db.json';
import type { RealDb } from '@/types';
import { useOptionsStore } from '@/stores/options';
import Swal from 'sweetalert2';

export interface ManualData {
  book: number;
  chapter: number | null;
  verse: number | null;
}

const props = defineProps<{
  modelValue: boolean;
  initialData: ManualData;
  initialPage?: number | null;
}>();

const emit = defineEmits<{
  (e: 'update:modelValue', val: boolean): void;
  (e: 'save', data: ManualData, page: number): void;
  (e: 'draft', data: ManualData): void;
}>();

const { t } = useI18n();
const db = realDb as RealDb;
const optionsStore = useOptionsStore();

const localState = reactive<ManualData>({
  book: 1,
  chapter: null,
  verse: null
});

const isValid = ref(false);
const pageNumber = ref<number | null>(null);
const initialRefSnapshot = ref<ManualData>({
  book: 1,
  chapter: null,
  verse: null
});
const initialPageSnapshot = ref<number | null>(null);
const hasPage = computed(() => {
  const raw = pageNumber.value as unknown;
  if (raw == null || raw === '') return false;
  const v = typeof raw === 'number' ? raw : Number(raw);
  return Number.isFinite(v);
});

const hasInitialSelection = computed(() => {
  const initialPage = initialPageSnapshot.value;
  const hasInitialPage = initialPage != null && Number.isFinite(initialPage);
  const hasInitialRef =
    initialRefSnapshot.value.chapter != null &&
    initialRefSnapshot.value.verse != null;
  return hasInitialPage || hasInitialRef;
});

const isLocalEmpty = computed(() =>
  localState.book === 1 &&
  localState.chapter == null &&
  localState.verse == null &&
  !hasPage.value
);

const BOOKS = ['genesis', 'exodus', 'leviticus', 'numbers', 'deuteronomy'];
const MAX_CHAPTERS = [50, 40, 27, 36, 34];

const dialog = computed({
  get: () => props.modelValue,
  set: (val) => emit('update:modelValue', val)
});

let suppressAutoClear = false;
let suppressPageWatch = false;
let suppressRefWatch = false;

const lastValidRef = ref<ManualData | null>(null);
const lastValidPage = ref<number | null>(null);

const isSameRef = (a: ManualData | null, b: ManualData | null) =>
  !!a && !!b && a.book === b.book && a.chapter === b.chapter && a.verse === b.verse;

watch(() => props.modelValue, (isOpen) => {
  if (isOpen) {
    const initialBook = props.initialData.book || 1;
    const initialChapter = props.initialData.chapter;
    const initialVerse = props.initialData.verse;
    const initialPage = props.initialPage ?? null;

    initialRefSnapshot.value = {
      book: initialBook,
      chapter: initialChapter,
      verse: initialVerse
    };
    initialPageSnapshot.value = initialPage;

    suppressAutoClear = true;
    localState.book = initialBook;
    localState.chapter = initialChapter;
    localState.verse = initialVerse;
    pageNumber.value = initialPage;
    lastValidRef.value = isRefValid.value
      ? { book: localState.book, chapter: localState.chapter, verse: localState.verse }
      : null;
    lastValidPage.value = isPageValid.value ? (pageNumber.value as number) : null;
    queueMicrotask(() => {
      suppressAutoClear = false;
    });
  }
});

watch(localState, (newState) => {
  emit('draft', { ...newState });
}, { deep: true });

watch(
  () => [localState.book, localState.chapter, localState.verse],
  () => {
    if (suppressAutoClear || suppressRefWatch) return;
    if (!isRefValid.value) return;

    const currentRef = {
      book: localState.book,
      chapter: localState.chapter,
      verse: localState.verse
    };
    if (isSameRef(currentRef, lastValidRef.value)) return;
    lastValidRef.value = currentRef;

    if (hasPage.value) {
      suppressPageWatch = true;
      pageNumber.value = null;
      queueMicrotask(() => {
        suppressPageWatch = false;
      });
    }
  }
);

watch(pageNumber, () => {
  if (suppressAutoClear || suppressPageWatch) return;
  if (!isPageValid.value) return;

  const currentPage = pageNumber.value as number;
  if (lastValidPage.value === currentPage) return;
  lastValidPage.value = currentPage;

  if (localState.chapter != null || localState.verse != null) {
    suppressRefWatch = true;
    localState.chapter = null;
    localState.verse = null;
    queueMicrotask(() => {
      suppressRefWatch = false;
    });
  }
});

watch(() => localState.book, () => {
  if (localState.chapter && localState.chapter > maxChapters.value) {
    localState.chapter = null;
  }
});

const bookOptions = computed(() => {
  return BOOKS.map((key, index) => ({
    title: t(`group.${key}`),
    value: index + 1
  }));
});

const maxChapters = computed(() => {
  if (!localState.book) return 50;
  return MAX_CHAPTERS[localState.book - 1];
});

const maxPage = computed<number>(() => optionsStore.maxTorahPages);

const isPageValid = computed(() => {
  const raw = pageNumber.value as unknown;
  const v = typeof raw === 'number' ? raw : Number(raw);
  return Number.isFinite(v) && v >= 1 && v <= maxPage.value;
});

const isRefValid = computed(() => {
  const rawC = localState.chapter as unknown;
  const rawV = localState.verse as unknown;
  const c = typeof rawC === 'number' ? rawC : Number(rawC);
  const v = typeof rawV === 'number' ? rawV : Number(rawV);
  return (
    Number.isFinite(c) &&
    Number.isFinite(v) &&
    c >= 1 &&
    c <= maxChapters.value &&
    v >= 1 &&
    v <= 90
  );
});

const isSameAsInitial = computed(() => {
  if (hasPage.value) {
    const raw = pageNumber.value as unknown;
    const current = typeof raw === 'number' ? raw : Number(raw);
    const initial = initialPageSnapshot.value;
    return initial != null && Number.isFinite(current) && current === initial;
  }

  return (
    localState.book === initialRefSnapshot.value.book &&
    localState.chapter === initialRefSnapshot.value.chapter &&
    localState.verse === initialRefSnapshot.value.verse
  );
});

const canConfirm = computed(() =>
  (hasPage.value ? isPageValid.value : isRefValid.value) && !isSameAsInitial.value
);

const { chapterRules, verseRules, pageRules } = useManualEntryRules({
  hasPage,
  maxChapters,
  maxPage,
  t
});

const clearLocal = () => {
  localState.book = 1;
  localState.chapter = null;
  localState.verse = null;
  pageNumber.value = null;
  lastValidRef.value = null;
  lastValidPage.value = null;
};

const restoreInitial = () => {
  suppressAutoClear = true;
  suppressRefWatch = true;
  suppressPageWatch = true;

  localState.book = initialRefSnapshot.value.book;
  localState.chapter = initialRefSnapshot.value.chapter;
  localState.verse = initialRefSnapshot.value.verse;
  pageNumber.value = initialPageSnapshot.value;

  lastValidRef.value = isRefValid.value
    ? { book: localState.book, chapter: localState.chapter, verse: localState.verse }
    : null;
  lastValidPage.value = isPageValid.value ? (pageNumber.value as number) : null;

  queueMicrotask(() => {
    suppressAutoClear = false;
    suppressRefWatch = false;
    suppressPageWatch = false;
  });
};

const close = () => {
  dialog.value = false;
};

const confirm = () => {
  if (isSameAsInitial.value) return;
  if (hasPage.value) {
    if (isPageValid.value) {
      emit('save', { ...localState, chapter: null, verse: null }, pageNumber.value as number);
      close();
    }
    return;
  }

  if (isRefValid.value) {
    const page = getPageNumber(
      db, 
      localState.book, 
      localState.chapter as number, 
      localState.verse as number
    );
    
    if (page > 0) {
      emit('save', { ...localState }, page);
      close();
    } else {
      Swal.fire({
        icon: 'warning',
        title: t('noResults'),
        text: t('manual.page_not_found'),
        confirmButtonText: t('actions.close')
      });
    }
  }
};
</script>

<style scoped>
.gap-4 {
  gap: 16px;
}

.manual-dialog-title {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 8px;
  white-space: normal;
}

.manual-dialog-title-text {
  min-width: 0;
  flex: 1 1 auto;
  line-height: 1.25;
  overflow-wrap: anywhere;
}

.manual-dialog-title-actions {
  display: flex;
  flex: 0 0 auto;
  align-items: center;
}

@media (max-width: 420px) {
  .manual-dialog-title {
    flex-wrap: wrap;
  }

  .manual-dialog-title-actions {
    width: 100%;
    justify-content: flex-end;
  }
}
</style>
