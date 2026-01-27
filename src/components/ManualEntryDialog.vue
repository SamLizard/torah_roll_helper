<template>
  <v-dialog v-model="dialog" max-width="500px">
    <v-card class="rounded-xl pa-4">
      <v-card-title class="text-h6 font-weight-bold">
        {{ $t('manual.title') }}
        <v-btn
          icon="mdi-delete-outline"
          variant="text"
          color="error"
          size="small"
          :title="$t('actions.clear')"
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
        </v-form>
      </v-card-text>

      <v-card-actions class="justify-end pt-0">
        <v-btn variant="text" @click="close">{{ $t('actions.cancel') }}</v-btn>
        <v-btn 
          color="primary" 
          variant="flat" 
          :disabled="!isValid" 
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

// Constants
const BOOKS = ['genesis', 'exodus', 'leviticus', 'numbers', 'deuteronomy'];
const MAX_CHAPTERS = [50, 40, 27, 36, 34];

// Computed
const dialog = computed({
  get: () => props.modelValue,
  set: (val) => emit('update:modelValue', val)
});

// 1. Load data when dialog opens
watch(() => props.modelValue, (isOpen) => {
  if (isOpen) {
    localState.book = props.initialData.book || 1;
    localState.chapter = props.initialData.chapter;
    localState.verse = props.initialData.verse;
  }
});

// 2. Watch for changes and emit 'draft' immediately
watch(localState, (newState) => {
  emit('draft', { ...newState });
}, { deep: true });

// Book change logic (reset chapter if out of bounds)
watch(() => localState.book, () => {
  if (localState.chapter && localState.chapter > maxChapters.value) {
    localState.chapter = null;
  }
});

// --- Computed ---

const bookOptions = computed(() => {
  return BOOKS.map((key, index) => ({
    title: t(`books.${key}`), // Ensure these keys exist in your i18n files
    value: index + 1
  }));
});

const maxChapters = computed(() => {
  if (!localState.book) return 50;
  return MAX_CHAPTERS[localState.book - 1];
});

// Rules
const chapterRules = [
  (v: number) => !!v || t('manual.required'),
  (v: number) => (v >= 1 && v <= maxChapters.value) || `${t('manual.max_chapter')} ${maxChapters.value}`
];

const verseRules = [
  (v: number) => !!v || t('manual.required'),
  (v: number) => (v >= 1 && v <= 90) || `${t('manual.max_verse')} 90`
];

// --- Actions ---

const clearLocal = () => {
  localState.book = 1;
  localState.chapter = null;
  localState.verse = null;
};

const close = () => {
  dialog.value = false;
};

const confirm = () => {
  if (localState.chapter && localState.verse) {
    const page = getPageNumber(
      db, 
      localState.book, 
      localState.chapter, 
      localState.verse
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