<template>
  <v-dialog v-model="dialog" max-width="760" scrollable>
    <v-card class="rounded-xl pa-4 first-line-search-card" data-tutorial="first-line-search-dialog">
      <v-card-title class="first-line-search-title">
        <div class="first-line-search-title__text text-h6 font-weight-bold">
          {{ $t('firstLineSearch.title') }}
        </div>

        <v-btn
          icon="mdi-close"
          variant="text"
          size="small"
          :title="$t('actions.close')"
          @click="close"
        />
      </v-card-title>

      <v-card-text class="pt-2">
        <div class="text-body-2 text-medium-emphasis mb-4">
          {{ $t('firstLineSearch.description') }}
        </div>

        <v-text-field
          ref="searchFieldRef"
          v-model="searchQuery"
          :label="$t('firstLineSearch.placeholder')"
          :placeholder="$t('firstLineSearch.placeholder')"
          :readonly="isKeyboardLockingNativeInput"
          variant="outlined"
          density="comfortable"
          prepend-inner-icon="mdi-text-search"
          clearable
          dir="rtl"
          lang="he"
          inputmode="text"
          autocomplete="off"
          autocorrect="off"
          autocapitalize="off"
          spellcheck="false"
          hide-details="auto"
          autofocus
          data-tutorial="first-line-search-input"
          @click:clear="onInputClear"
        />

        <div class="first-line-search-controls">
          <v-switch
            v-model="includeMatches"
            color="primary"
            density="compact"
            hide-details
            inset
            :label="$t('firstLineSearch.searchAnywhere')"
          />

          <v-btn
            size="small"
            variant="tonal"
            color="secondary"
            prepend-icon="mdi-keyboard"
            @pointerdown.prevent="onToggleKeyboardPress"
          >
            {{ showKeyboard ? $t('firstLineSearch.hideKeyboard') : $t('firstLineSearch.showKeyboard') }}
          </v-btn>
        </div>

        <div v-if="showKeyboard" class="first-line-search-keyboard">
          <div class="text-caption text-medium-emphasis mb-2">
            {{ $t('firstLineSearch.keyboardTitle') }}
          </div>

          <div
            v-for="(row, rowIndex) in keyboardRows"
            :key="`keyboard-row-${rowIndex}`"
            class="first-line-search-keyboard__row"
            :style="getKeyboardRowStyle(row)"
          >
            <v-btn
              v-for="key in row"
              :key="key"
              variant="outlined"
              density="comfortable"
              class="first-line-search-keyboard__key"
              :ripple="false"
              @pointerdown.prevent="onKeyboardKeyPress(key, $event)"
            >
              {{ key }}
            </v-btn>
          </div>

          <div class="first-line-search-keyboard__actions">
            <v-btn
              variant="outlined"
              density="comfortable"
              class="first-line-search-keyboard__action"
              :ripple="false"
              @pointerdown.prevent="onKeyboardClear($event)"
            >
              {{ $t('firstLineSearch.clearSearch') }}
            </v-btn>

            <v-btn
              variant="outlined"
              density="comfortable"
              class="first-line-search-keyboard__action first-line-search-keyboard__action--space"
              :ripple="false"
              @pointerdown.prevent="onKeyboardSpace($event)"
            >
              {{ $t('firstLineSearch.space') }}
            </v-btn>

            <v-btn
              variant="outlined"
              density="comfortable"
              class="first-line-search-keyboard__action"
              prepend-icon="mdi-backspace-outline"
              :ripple="false"
              @pointerdown.prevent="onKeyboardBackspace($event)"
            >
              {{ $t('firstLineSearch.backspace') }}
            </v-btn>
          </div>
        </div>

        <div v-if="!hasQuery" class="first-line-search-state text-medium-emphasis">
          <v-icon size="42" class="mb-2 opacity-60">mdi-book-search-outline</v-icon>
          <div class="text-subtitle-2 font-weight-medium">{{ $t('firstLineSearch.emptyState') }}</div>
          <div class="text-body-2 mt-1">{{ $t('firstLineSearch.emptyStateHint') }}</div>
        </div>

        <div v-else-if="!isQueryReady" class="first-line-search-state text-medium-emphasis">
          <v-icon size="42" class="mb-2 opacity-60">mdi-keyboard-outline</v-icon>
          <div class="text-body-2">{{ $t('firstLineSearch.keepTyping') }}</div>
        </div>

        <template v-else-if="searchResults.length > 0">
          <div class="text-caption text-medium-emphasis mb-3">
            {{ $t('firstLineSearch.resultsFound', { count: searchResults.length }) }}
          </div>

          <div v-if="shouldUseCompactResults" class="d-flex flex-column ga-2">
            <v-sheet
              v-for="result in searchResults"
              :key="result.pageNumber"
              rounded="lg"
              border
              class="first-line-search-compact"
            >
              <div class="first-line-search-compact__top">
                <div class="d-flex align-center ga-2 min-w-0">
                  <v-chip color="primary" variant="tonal" size="x-small">
                    {{ result.pageNumber }}
                  </v-chip>
                </div>

                <div class="d-flex align-center ga-1">
                  <v-btn
                    icon="mdi-book-open-page-variant-outline"
                    size="x-small"
                    variant="text"
                    color="primary"
                    :title="$t('firstLineSearch.preview')"
                    @click="onPreviewButtonClick(result.pageNumber, $event)"
                  />
                  <v-btn
                    size="x-small"
                    color="primary"
                    variant="tonal"
                    @click="onSelectPageButtonClick(result.pageNumber, $event)"
                  >
                    {{ $t('firstLineSearch.usePage') }}
                  </v-btn>
                </div>
              </div>

              <div class="first-line-search-compact__text" dir="rtl" lang="he">
                {{ result.displayText }}
              </div>

              <div
                v-if="result.pageTitle"
                class="first-line-search-compact__title text-caption text-primary"
              >
                {{ result.pageTitle }}
              </div>
            </v-sheet>
          </div>

          <div v-else class="d-flex flex-column ga-3">
            <v-card
              v-for="result in searchResults"
              :key="result.pageNumber"
              variant="outlined"
              class="first-line-search-result"
            >
              <v-card-text class="pb-2">
                <div class="d-flex align-center justify-space-between ga-3 mb-3">
                  <div class="text-caption text-medium-emphasis">
                    {{ $t('firstLineSearch.openingLineLabel') }}
                  </div>
                  <v-chip color="primary" variant="tonal" size="small">
                    {{ $t('page') }} {{ result.pageNumber }}
                  </v-chip>
                </div>

                <div class="first-line-search-result__text" dir="rtl" lang="he">
                  {{ result.displayText }}
                </div>

                <div
                  v-if="result.pageTitle"
                  class="first-line-search-result__title text-caption text-primary mt-2"
                >
                  {{ result.pageTitle }}
                </div>
              </v-card-text>

              <v-card-actions class="justify-space-between pt-0">
                <v-btn
                  size="small"
                  variant="text"
                  prepend-icon="mdi-book-open-page-variant-outline"
                  @click="openPreview(result.pageNumber)"
                >
                  {{ $t('firstLineSearch.preview') }}
                </v-btn>

                <v-btn
                  size="small"
                  color="primary"
                  variant="tonal"
                  @click="selectPage(result.pageNumber)"
                >
                  {{ $t('firstLineSearch.usePage') }}
                </v-btn>
              </v-card-actions>
            </v-card>
          </div>
        </template>

        <div v-else class="first-line-search-state text-medium-emphasis">
          <v-icon size="42" class="mb-2 opacity-60">mdi-text-search</v-icon>
          <div class="text-subtitle-2 font-weight-medium">{{ $t('firstLineSearch.noMatches') }}</div>
          <div class="text-body-2 mt-1">{{ $t('firstLineSearch.noMatchesHint') }}</div>
        </div>
      </v-card-text>

      <v-card-actions class="justify-end">
        <v-btn variant="text" @click="close">
          {{ $t('actions.close') }}
        </v-btn>
      </v-card-actions>
    </v-card>

    <PagePreviewDialog
      :model-value="isPreviewOpen"
      :page="previewPage"
      :preview-columns="previewColumns"
      :tikkun-url="previewTikkunUrl"
      @update:model-value="onPreviewDialogModelValueChange"
    />
  </v-dialog>
</template>

<script setup lang="ts">
import { computed, nextTick, ref, watch } from 'vue';
import { useI18n } from 'vue-i18n';
import { useDisplay } from 'vuetify';
import PagePreviewDialog from './PagePreviewDialog.vue';
import realDb from '@/data/real_db.json';
import pageFirstLinesData from '@/data/page_first_lines.json';
import {
  findPreparedPagesByLineStart,
  findPreparedPagesContainingTextInLine,
  normalizeForTypedInput,
  preparePageFirstLines,
  type PageFirstLine,
  type PreparedPageFirstLine,
} from '@/composables/firstLineSearch';
import { getPageStartRef, getPageTitleKeys } from '@/composables/utils';
import { toRefUrl } from '@/composables/tikkunLinks';
import { useOptionsStore } from '@/stores/options';
import type { ManualData, RealDb } from '@/types';

interface SearchResultItem extends PreparedPageFirstLine {
  pageTitle: string;
}

type SearchFieldRef = {
  $el?: Element;
} | null;

const HEBREW_KEYBOARD_ROWS = [
  ['א', 'ב', 'ג', 'ד', 'ה', 'ו', 'ז', 'ח', 'ט'],
  ['י', 'כ', 'ל', 'מ', 'נ', 'ס', 'ע', 'פ', 'צ'],
  ['ק', 'ר', 'ש', 'ת'],
  ['ך', 'ם', 'ן', 'ף', 'ץ'],
] as const;

const props = defineProps<{
  modelValue: boolean;
}>();

const emit = defineEmits<{
  (e: 'update:modelValue', value: boolean): void;
  (e: 'save', data: ManualData, page: number): void;
}>();

const { t } = useI18n();
const { smAndDown } = useDisplay();
const optionsStore = useOptionsStore();
const db = realDb as RealDb;
const preparedPages = preparePageFirstLines(pageFirstLinesData as PageFirstLine[]);

const searchFieldRef = ref<SearchFieldRef>(null);
const searchQuery = ref('');
const includeMatches = ref(false);
const showKeyboard = ref(false);
const previewPage = ref<number | null>(null);

const keyboardRows = HEBREW_KEYBOARD_ROWS;
const isKeyboardLockingNativeInput = computed(() => smAndDown.value && showKeyboard.value);

const dialog = computed({
  get: () => props.modelValue,
  set: (value: boolean) => emit('update:modelValue', value),
});

const normalizedQuery = computed(() => normalizeForTypedInput(searchQuery.value));
const hasQuery = computed(() => normalizedQuery.value.length > 0);
const minimumQueryLength = computed(() => {
  if (includeMatches.value) return 3;

  const firstLetter = normalizedQuery.value[0];
  if (!firstLetter) return 2;
  return firstLetter === 'ו' ? 2 : 1;
});
const isQueryReady = computed(() => normalizedQuery.value.length >= minimumQueryLength.value);

const toManualData = (pageNumber: number): ManualData => {
  const pageStartRef = getPageStartRef(db, pageNumber);

  if (!pageStartRef) {
    return {
      book: 1,
      chapter: null,
      verse: null,
    };
  }

  return {
    book: pageStartRef.book,
    chapter: pageStartRef.chapter,
    verse: pageStartRef.verse,
  };
};

const getTitleForPage = (pageNumber: number): string => {
  const titleKeys = getPageTitleKeys(pageNumber, toManualData(pageNumber), optionsStore.isInGola);
  if (titleKeys.length === 0) return '';
  return titleKeys.map((key) => t(key)).join(t('separator'));
};

const matchedPages = computed(() => {
  if (!isQueryReady.value) return [];

  if (includeMatches.value) {
    return findPreparedPagesContainingTextInLine(searchQuery.value, preparedPages);
  }

  return findPreparedPagesByLineStart(searchQuery.value, preparedPages);
});

const searchResults = computed<SearchResultItem[]>(() => {
  return matchedPages.value.map((page) => ({
    ...page,
    pageTitle: getTitleForPage(page.pageNumber),
  }));
});

const shouldUseCompactResults = computed(() => {
  if (!smAndDown.value) return false;
  const threshold = includeMatches.value ? 5 : 7;
  return searchResults.value.length > threshold;
});

const isPreviewOpen = computed(() => previewPage.value !== null);
const previewResult = computed(() => {
  if (previewPage.value == null) return null;
  return preparedPages.find((page) => page.pageNumber === previewPage.value) ?? null;
});
const previewColumns = computed(() => previewResult.value?.previewColumns ?? []);
const previewTikkunUrl = computed(() => {
  if (previewPage.value == null) return null;
  const pageStartRef = getPageStartRef(db, previewPage.value);
  return pageStartRef ? toRefUrl(pageStartRef) : null;
});

const getNativeInput = (): HTMLInputElement | null => {
  const hostElement = searchFieldRef.value?.$el;
  if (!(hostElement instanceof Element)) return null;

  const inputElement = hostElement.querySelector('input');
  return inputElement instanceof HTMLInputElement ? inputElement : null;
};

const focusSearchField = async () => {
  await nextTick();
  const inputElement = getNativeInput();
  if (!inputElement) return;
  inputElement.focus({ preventScroll: true });
};

const replaceSelection = async (replacement: string) => {
  const inputElement = getNativeInput();
  if (!inputElement) {
    searchQuery.value = `${searchQuery.value}${replacement}`;
    return;
  }

  const selectionStart = inputElement.selectionStart ?? searchQuery.value.length;
  const selectionEnd = inputElement.selectionEnd ?? searchQuery.value.length;

  searchQuery.value = [
    searchQuery.value.slice(0, selectionStart),
    replacement,
    searchQuery.value.slice(selectionEnd),
  ].join('');

  await nextTick();
  const nextCursorPosition = selectionStart + replacement.length;

  if (isKeyboardLockingNativeInput.value) {
    inputElement.setSelectionRange(nextCursorPosition, nextCursorPosition);
    return;
  }

  inputElement.focus({ preventScroll: true });
  inputElement.setSelectionRange(nextCursorPosition, nextCursorPosition);
};

const insertKeyboardText = async (value: string) => {
  await replaceSelection(value);
};

const removeKeyboardCharacter = async () => {
  const inputElement = getNativeInput();
  if (!inputElement) {
    searchQuery.value = searchQuery.value.slice(0, -1);
    return;
  }

  const selectionStart = inputElement.selectionStart ?? searchQuery.value.length;
  const selectionEnd = inputElement.selectionEnd ?? searchQuery.value.length;

  if (selectionStart !== selectionEnd) {
    searchQuery.value = [
      searchQuery.value.slice(0, selectionStart),
      searchQuery.value.slice(selectionEnd),
    ].join('');

    await nextTick();
    if (!isKeyboardLockingNativeInput.value) {
      inputElement.focus({ preventScroll: true });
    }
    inputElement.setSelectionRange(selectionStart, selectionStart);
    return;
  }

  if (selectionStart === 0) return;

  searchQuery.value = [
    searchQuery.value.slice(0, selectionStart - 1),
    searchQuery.value.slice(selectionEnd),
  ].join('');

  await nextTick();
  const nextCursorPosition = selectionStart - 1;
  if (!isKeyboardLockingNativeInput.value) {
    inputElement.focus({ preventScroll: true });
  }
  inputElement.setSelectionRange(nextCursorPosition, nextCursorPosition);
};

const clearSearch = async () => {
  searchQuery.value = '';
  await focusSearchField();
};

const onInputClear = () => {
  void clearSearch();
};

const blurPressedButton = (event: Event) => {
  const currentTarget = event.currentTarget;
  if (!(currentTarget instanceof HTMLElement)) return;

  window.setTimeout(() => {
    currentTarget.blur();
  }, 0);
};

const onKeyboardKeyPress = (value: string, event: Event) => {
  blurPressedButton(event);
  void insertKeyboardText(value);
};

const onKeyboardSpace = (event: Event) => {
  blurPressedButton(event);
  void insertKeyboardText(' ');
};

const onKeyboardBackspace = (event: Event) => {
  blurPressedButton(event);
  void removeKeyboardCharacter();
};

const onKeyboardClear = (event: Event) => {
  blurPressedButton(event);
  void clearSearch();
};

const onPreviewButtonClick = (pageNumber: number, event: Event) => {
  blurPressedButton(event);
  openPreview(pageNumber);
};

const onSelectPageButtonClick = (pageNumber: number, event: Event) => {
  blurPressedButton(event);
  selectPage(pageNumber);
};

const onToggleKeyboardPress = (event: Event) => {
  blurPressedButton(event);

  const activeElement = document.activeElement;
  if (activeElement instanceof HTMLElement) {
    activeElement.blur();
  }

  void toggleKeyboard();
};

const toggleKeyboard = async () => {
  showKeyboard.value = !showKeyboard.value;

  if (showKeyboard.value) {
    await focusSearchField();
  }
};

watch(
  () => props.modelValue,
  async (isOpen) => {
    if (isOpen) {
      searchQuery.value = '';
      includeMatches.value = false;
      showKeyboard.value = false;
      await focusSearchField();
      return;
    }

    previewPage.value = null;
  },
);

const selectPage = (pageNumber: number) => {
  emit('save', toManualData(pageNumber), pageNumber);
  dialog.value = false;
};

const openPreview = (pageNumber: number) => {
  previewPage.value = pageNumber;
};

const onPreviewDialogModelValueChange = (value: boolean) => {
  if (!value) {
    previewPage.value = null;
  }
};

const close = () => {
  dialog.value = false;
};

const getKeyboardRowStyle = (row: readonly string[]) => ({
  gridTemplateColumns: smAndDown.value
    ? `repeat(${Math.min(row.length, 5)}, minmax(0, 1fr))`
    : `repeat(${row.length}, minmax(0, 1fr))`,
});
</script>

<style scoped>
.first-line-search-card {
  overflow: hidden;
}

.first-line-search-title {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 8px;
  white-space: normal;
}

.first-line-search-title__text {
  min-width: 0;
  flex: 1 1 auto;
  line-height: 1.25;
  overflow-wrap: anywhere;
}

.first-line-search-controls {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  flex-wrap: wrap;
  margin-top: 8px;
  margin-bottom: 16px;
}

.first-line-search-keyboard {
  padding: 12px;
  margin-bottom: 16px;
  border: 1px solid rgba(var(--v-border-color), var(--v-border-opacity));
  border-radius: 16px;
  background: rgba(var(--v-theme-surface-variant), 0.12);
}

.first-line-search-keyboard__row,
.first-line-search-keyboard__actions {
  display: grid;
  gap: 8px;
}

.first-line-search-keyboard__row {
  margin-bottom: 8px;
}

.first-line-search-keyboard__actions {
  grid-template-columns: minmax(0, 1fr) minmax(0, 1.4fr) minmax(0, 1fr);
}

.first-line-search-keyboard__key,
.first-line-search-keyboard__action {
  min-width: 0;
}

.first-line-search-keyboard__action--space {
  justify-self: stretch;
}

.first-line-search-state {
  padding: 24px 12px 12px;
  text-align: center;
}

.first-line-search-result__text,
.first-line-search-compact__text {
  font-size: 1rem;
  line-height: 1.7;
  overflow-wrap: anywhere;
}

.first-line-search-result__title,
.first-line-search-compact__title {
  line-height: 1.5;
}

.first-line-search-compact {
  padding: 10px 12px;
}

.first-line-search-compact__top {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 8px;
  margin-bottom: 6px;
}

.first-line-search-compact :deep(.v-chip) {
  min-width: 44px;
  justify-content: center;
}

.first-line-search-compact__text {
  display: -webkit-box;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
  overflow: hidden;
}

@media (max-width: 600px) {
  .first-line-search-keyboard__actions {
    grid-template-columns: 1fr;
  }
}

@media (max-width: 420px) {
  .first-line-search-title {
    align-items: center;
  }
}
</style>
