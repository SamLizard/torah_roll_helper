<template>
  <!-- DONE 7.7: add an option to choose directly the page (for example, he have tikkun open at some page) -->
  <!-- Add a horizontal bar, then a input for page? -->
  <!-- TODO 8.2: There is a bug - when the manual data is empty, if the user enters the chapter and verse, it doesn't let him define the page using it... -->
  <v-dialog v-model="dialog" max-width="500px">
    <v-card class="rounded-xl pa-4">
      <v-card-title class="text-h6 font-weight-bold">
        {{ $t('manual.title') }}
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
import { getPageNumber } from '@/composables/utils'; // Adjust path if needed
import realDb from '@/data/real_db.json'; // Ensure this path is correct
import type { RealDb } from '@/types';

// Data interface
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
  (e: 'draft', data: ManualData): void; // New emit for live updates
}>();

const { t } = useI18n();
const db = realDb as RealDb;

// Local form state
const localState = reactive<ManualData>({
  book: 1,
  chapter: null,
  verse: null
});

const isValid = ref(false);
const pageNumber = ref<number | null>(null);
const hasPage = computed(() => {
  const raw = pageNumber.value as unknown;
  if (raw == null || raw === '') return false;
  const v = typeof raw === 'number' ? raw : Number(raw);
  return Number.isFinite(v);
});

const hasInitialSelection = computed(() => {
  const initialPage = props.initialPage;
  const hasInitialPage = initialPage != null && Number.isFinite(initialPage);
  const hasInitialRef = props.initialData.chapter != null && props.initialData.verse != null;
  return hasInitialPage || hasInitialRef;
});

const isLocalEmpty = computed(() =>
  localState.book === 1 &&
  localState.chapter == null &&
  localState.verse == null &&
  !hasPage.value
);

// Constants
const BOOKS = ['genesis', 'exodus', 'leviticus', 'numbers', 'deuteronomy'];
const MAX_CHAPTERS = [50, 40, 27, 36, 34];

// Computed
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

// 1. Load data when dialog opens
watch(() => props.modelValue, (isOpen) => {
  if (isOpen) {
    suppressAutoClear = true;
    localState.book = props.initialData.book || 1;
    localState.chapter = props.initialData.chapter;
    localState.verse = props.initialData.verse;
    pageNumber.value = props.initialPage ?? null;
    lastValidRef.value = isRefValid.value
      ? { book: localState.book, chapter: localState.chapter, verse: localState.verse }
      : null;
    lastValidPage.value = isPageValid.value ? (pageNumber.value as number) : null;
    queueMicrotask(() => {
      suppressAutoClear = false;
    });
  }
});

// 2. Watch for changes and emit 'draft' immediately
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

// Book change logic (reset chapter if out of bounds)
watch(() => localState.book, () => {
  if (localState.chapter && localState.chapter > maxChapters.value) {
    localState.chapter = null;
  }
});

// --- Computed ---

const bookOptions = computed(() => {
  return BOOKS.map((key, index) => ({
    title: t(`group.${key}`), // Ensure these keys exist in your i18n files
    value: index + 1
  }));
});

const maxChapters = computed(() => {
  if (!localState.book) return 50;
  return MAX_CHAPTERS[localState.book - 1];
});

const maxPage = 245;

const isPageValid = computed(() => {
  const raw = pageNumber.value as unknown;
  const v = typeof raw === 'number' ? raw : Number(raw);
  return Number.isFinite(v) && v >= 1 && v <= maxPage;
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
    const initial = props.initialPage;
    return initial != null && Number.isFinite(current) && current === initial;
  }

  return (
    localState.book === props.initialData.book &&
    localState.chapter === props.initialData.chapter &&
    localState.verse === props.initialData.verse
  );
});

const canConfirm = computed(() =>
  (hasPage.value ? isPageValid.value : isRefValid.value) && !isSameAsInitial.value
);

// Rules
const requiredIfNoPage = (v: number | null) =>
  hasPage.value || !!v || t('manual.required');

const positiveRule = (v: number | null) =>
  v == null || v > 0 || t('manual.must_be_positive');

const chapterRules = [
  requiredIfNoPage,
  positiveRule,
  (v: number) => v == null || (v <= maxChapters.value) || `${t('manual.max_chapter')} ${maxChapters.value}`
];

const verseRules = [
  requiredIfNoPage,
  positiveRule,
  (v: number) => v == null || (v <= 90) || `${t('manual.max_verse')} 90`
];

const pageRules = [
  positiveRule,
  (v: number | null) => v == null || (v <= maxPage) || `${t('manual.max_page')} ${maxPage}`
];

// --- Actions ---

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

  localState.book = props.initialData.book || 1;
  localState.chapter = props.initialData.chapter;
  localState.verse = props.initialData.verse;
  pageNumber.value = props.initialPage ?? null;

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
  // DONE 14: Check that the new page/ManualData is different from the one that is currently selected (if it was already selected - look at prop), to avoid unnecessary emits/updates.
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
    
    // Even if page is 0 (not found), we might want to let the user know,
    // but here we only emit if valid.
    if (page > 0) {
      // Emit the full data object + the calculated page
      emit('save', { ...localState }, page);
      close();
    } else {
      // TODO 12: use sweetalert instead
      // Optional: Handle "Page not found" error
      console.warn('Page not found for coordinates');
    }
  }
};
</script>

<style scoped>
.gap-4 {
  gap: 16px;
}
</style>