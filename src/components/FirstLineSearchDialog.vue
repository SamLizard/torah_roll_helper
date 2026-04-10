<template>
  <!-- DONE 33: Try to use (an option to use) the tesseract library. Pay attention to put a small height so the user can take only the first row. So the user will be able to base the text to write with the detected text (and remove the errors). -->
  <v-dialog
    v-if="!shouldHideDialogForPhoneCamera"
    v-model="dialog"
    max-width="760"
    scrollable
  >
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
        >
          <template #append-inner>
            <v-btn
              icon
              variant="text"
              size="small"
              :loading="isOcrProcessing"
              :disabled="isOcrProcessing || isOcrCameraOpen"
              :title="$t('firstLineSearch.ocrAction')"
              @click.stop="openOcrCamera"
            >
              <v-icon>mdi-camera</v-icon>
            </v-btn>
          </template>
        </v-text-field>

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

          <v-btn
            v-if="canRestoreOcrResults"
            size="small"
            variant="text"
            color="primary"
            prepend-icon="mdi-restore"
            @click="restoreOcrResults"
          >
            {{ $t('firstLineSearch.restoreOcrResults') }}
          </v-btn>
        </div>

        <v-alert
          v-if="ocrErrorMessage"
          type="error"
          variant="tonal"
          density="comfortable"
          class="mb-4"
        >
          {{ ocrErrorMessage }}
        </v-alert>

        <v-sheet
          v-if="isOcrProcessing || isShowingOcrAnalysis"
          rounded="xl"
          border
          class="first-line-search-ocr mb-4"
        >
          <div class="first-line-search-ocr__header">
            <div>
              <div class="text-subtitle-2 font-weight-medium">
                {{ $t('firstLineSearch.ocrPanelTitle') }}
              </div>
              <div class="text-body-2 text-medium-emphasis">
                {{ $t('firstLineSearch.ocrPanelHint') }}
              </div>
            </div>

            <v-chip
              v-if="ocrResult?.ocrConfidence != null"
              size="small"
              variant="tonal"
            >
              {{ $t('firstLineSearch.ocrConfidence', { value: ocrResult.ocrConfidence }) }}
            </v-chip>
          </div>

          <div v-if="isOcrProcessing" class="first-line-search-ocr__progress">
            <div class="text-body-2">
              {{ $t('firstLineSearch.ocrProcessing') }}
            </div>
            <v-progress-linear
              :model-value="ocrProgressPercent"
              color="primary"
              rounded
              height="8"
            />
          </div>

          <template v-else-if="ocrResult && isShowingOcrAnalysis">
            <div
              class="first-line-search-ocr__grid"
              :class="{ 'first-line-search-ocr__grid--single': !shouldShowCorrectedOcrText }"
            >
              <div class="first-line-search-ocr__field">
                <div class="text-caption text-medium-emphasis">
                  {{ $t('firstLineSearch.ocrRawText') }}
                </div>
                <div class="first-line-search-ocr__text" dir="rtl" lang="he">
                  {{ ocrRawPreview }}
                </div>
              </div>

              <div v-if="shouldShowCorrectedOcrText" class="first-line-search-ocr__field">
                <div class="text-caption text-medium-emphasis">
                  {{ $t('firstLineSearch.ocrEditableText') }}
                </div>
                <div class="first-line-search-ocr__text" dir="rtl" lang="he">
                  {{ searchQuery || $t('firstLineSearch.ocrNoText') }}
                </div>
              </div>
            </div>

            <v-alert
              v-if="isOcrResultLowQuality"
              type="warning"
              variant="tonal"
              density="comfortable"
              class="mt-3"
            >
              {{ $t('firstLineSearch.ocrLowQuality') }}
            </v-alert>

            <div v-if="assistantSummary" class="first-line-search-ocr__summary">
              <div class="text-caption text-medium-emphasis">
                {{ $t('firstLineSearch.ocrBestMatch') }}
              </div>

              <div class="first-line-search-ocr__summary-main">
                <div class="text-body-1 font-weight-medium">
                  {{ assistantSummary.displayText }}
                </div>

                <div class="d-flex align-center ga-2 flex-wrap">
                  <v-chip size="small" color="primary" variant="tonal">
                    {{ $t('page') }} {{ assistantSummary.pageNumber }}
                  </v-chip>
                  <v-chip
                    size="small"
                    :color="getConfidenceChipColor(assistantSummary)"
                    variant="tonal"
                  >
                    {{ getConfidenceChipLabel(assistantSummary) }}
                  </v-chip>
                </div>
              </div>
            </div>
          </template>
        </v-sheet>

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

        <template v-else-if="displayedSearchResults.length > 0">
          <div class="text-caption text-medium-emphasis mb-3">
            {{
              shouldUseAssistantResults
                ? $t('firstLineSearch.ocrSuggestionsFound', { count: displayedSearchResults.length })
                : $t('firstLineSearch.resultsFound', { count: displayedSearchResults.length })
            }}
          </div>

          <div v-if="shouldUseCompactResults" class="d-flex flex-column ga-2">
            <v-sheet
              v-for="result in displayedSearchResults"
              :key="result.pageNumber"
              rounded="lg"
              border
              class="first-line-search-compact"
              :class="{ 'first-line-search-compact--best': shouldUseAssistantResults && result.pageNumber === assistantSummary?.pageNumber }"
            >
              <div class="first-line-search-compact__top">
                <div class="d-flex align-center ga-2 min-w-0">
                  <v-chip color="primary" variant="tonal" size="x-small">
                    {{ result.pageNumber }}
                  </v-chip>
                  <v-chip
                    v-if="shouldUseAssistantResults && result.displayConfidence != null"
                    size="x-small"
                    :color="getConfidenceChipColor(result)"
                    variant="tonal"
                  >
                    {{ result.displayConfidence }}%
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
              v-for="result in displayedSearchResults"
              :key="result.pageNumber"
              variant="outlined"
              class="first-line-search-result"
              :class="{ 'first-line-search-result--best': shouldUseAssistantResults && result.pageNumber === assistantSummary?.pageNumber }"
            >
              <v-card-text class="pb-2">
                <div class="d-flex align-center justify-space-between ga-3 mb-3">
                  <div class="text-caption text-medium-emphasis">
                    {{
                      shouldUseAssistantResults
                        ? $t('firstLineSearch.ocrMatchLabel')
                        : $t('firstLineSearch.openingLineLabel')
                    }}
                  </div>
                  <div class="d-flex align-center ga-2 flex-wrap justify-end">
                    <v-chip color="primary" variant="tonal" size="small">
                      {{ $t('page') }} {{ result.pageNumber }}
                    </v-chip>
                    <v-chip
                      v-if="shouldUseAssistantResults && result.displayConfidence != null"
                      size="small"
                      :color="getConfidenceChipColor(result)"
                      variant="tonal"
                    >
                      {{ getConfidenceChipLabel(result) }}
                    </v-chip>
                  </div>
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

        <div
          v-else-if="!shouldUseAssistantResults"
          class="first-line-search-state text-medium-emphasis"
        >
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

  <Teleport to="body">
    <transition name="dialog-bottom-transition">
      <section
        v-if="isPhoneOcrCameraMode && isOcrCameraOpen"
        class="first-line-search-camera-overlay"
      >
        <DictaCameraCapture
          :busy="false"
          :auto-fallback="true"
          :hide-file-button="true"
          :suppress-errors="true"
          :mobile-mode="true"
          :instructions="ocrCameraInstructions"
          :capture-height-ratio="0.18"
          @captured="onOcrCaptured"
          @error="onOcrCameraError"
          @close="closeOcrCamera"
        />
      </section>
    </transition>
  </Teleport>

  <v-dialog
    v-if="!isPhoneOcrCameraMode && isOcrCameraOpen"
    :model-value="isOcrCameraOpen"
    max-width="960"
    @update:model-value="onOcrCameraDialogModelValueChange"
  >
    <v-card class="rounded-xl pa-4">
      <v-card-title class="first-line-search-title">
        <div class="first-line-search-title__text text-h6 font-weight-bold">
          {{ $t('firstLineSearch.ocrCameraTitle') }}
        </div>

        <v-btn
          icon="mdi-close"
          variant="text"
          size="small"
          :title="$t('actions.close')"
          @click="closeOcrCamera"
        />
      </v-card-title>

      <v-card-text class="pt-2">
        <DictaCameraCapture
          :busy="false"
          :instructions="ocrCameraInstructions"
          :capture-height-ratio="0.18"
          @captured="onOcrCaptured"
          @error="onOcrCameraError"
          @close="closeOcrCamera"
        />
      </v-card-text>
    </v-card>
  </v-dialog>
</template>

<script setup lang="ts">
import { computed, nextTick, ref, watch } from 'vue';
import { useI18n } from 'vue-i18n';
import { useDisplay } from 'vuetify';
import DictaCameraCapture from './DictaCameraCapture.vue';
import PagePreviewDialog from './PagePreviewDialog.vue';
import realDb from '@/data/real_db.json';
import pageFirstLinesData from '@/data/page_first_lines.json';
import {
  trackFirstLineSearchOutcome,
  trackFromToAction,
  type FirstLineSearchMode,
  type FirstLineSearchSource,
} from '@/composables/analytics';
import {
  findPreparedPagesByLineStart,
  findPreparedPagesContainingTextInLine,
  normalizeForTypedInput,
  preparePageFirstLines,
  type PageFirstLine,
  type PreparedPageFirstLine,
} from '@/composables/firstLineSearch';
import {
  analyzeFirstLineText,
  recognizeFirstLineFromImage,
  type FirstLineOcrResult,
  type OcrProgressPayload,
} from '@/composables/firstLineOcr';
import { getPageStartRef, getPageTitleKeys } from '@/composables/utils';
import { toRefUrl } from '@/composables/tikkunLinks';
import { useOptionsStore } from '@/stores/options';
import type { ManualData, RealDb } from '@/types';

interface SearchDisplayItem extends PreparedPageFirstLine {
  pageTitle: string;
  score: number | null;
  displayConfidence: number | null;
  scoreGap: number | null;
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

const createFirstResultLettersByMode = (): Record<FirstLineSearchMode, number | null> => ({
  'line-start': null,
  'inside-line': null,
});

const props = defineProps<{
  modelValue: boolean;
  side: 'from' | 'to';
  source: FirstLineSearchSource;
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
const MINIMUM_ASSISTANT_WORD_COVERAGE = 0.25;
const MINIMUM_ASSISTANT_RESULT_SCORE = 70;

const searchFieldRef = ref<SearchFieldRef>(null);
const searchQuery = ref('');
const includeMatches = ref(false);
const showKeyboard = ref(false);
const previewPage = ref<number | null>(null);
const firstResultLettersByMode = ref<Record<FirstLineSearchMode, number | null>>(
  createFirstResultLettersByMode()
);
const hasTrackedSessionOutcome = ref(false);
const ocrResult = ref<FirstLineOcrResult | null>(null);
const isOcrProcessing = ref(false);
const ocrProgressPercent = ref(0);
const ocrErrorMessage = ref('');
const isOcrCameraOpen = ref(false);
const ocrSuggestedQuery = ref('');

const keyboardRows = HEBREW_KEYBOARD_ROWS;
const isKeyboardLockingNativeInput = computed(() => smAndDown.value && showKeyboard.value);
const preparedPagesByNumber = new Map(preparedPages.map((page) => [page.pageNumber, page]));
const isPhoneOcrCameraMode = computed(() => smAndDown.value);
const shouldHideDialogForPhoneCamera = computed(() => isPhoneOcrCameraMode.value && isOcrCameraOpen.value);
const ocrCameraInstructions = computed(() => ([
  t('firstLineSearch.ocrCameraInstruction1'),
  t('firstLineSearch.ocrCameraInstruction2'),
  t('firstLineSearch.ocrCameraInstruction3'),
  t('firstLineSearch.ocrCameraInstruction4'),
]));

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
  if (shouldUseAssistantResults.value) return [];
  if (!isQueryReady.value) return [];

  if (includeMatches.value) {
    return findPreparedPagesContainingTextInLine(searchQuery.value, preparedPages);
  }

  return findPreparedPagesByLineStart(searchQuery.value, preparedPages);
});

const searchResults = computed<SearchDisplayItem[]>(() => {
  return matchedPages.value.map((page) => ({
    ...page,
    pageTitle: getTitleForPage(page.pageNumber),
    score: null,
    displayConfidence: null,
    scoreGap: null,
  }));
});

const isShowingOcrAnalysis = computed(() => {
  if (!ocrResult.value) return false;

  const normalizedOcrQuery = normalizeForTypedInput(ocrSuggestedQuery.value);
  if (normalizedOcrQuery.length === 0) return false;

  return normalizedOcrQuery === normalizedQuery.value;
});

const shouldUseAssistantResults = computed(() => isShowingOcrAnalysis.value);
const canRestoreOcrResults = computed(() => {
  if (!ocrResult.value) return false;
  if (normalizeForTypedInput(ocrSuggestedQuery.value).length === 0) return false;
  return !isShowingOcrAnalysis.value;
});

const getAssistantCandidatePages = (text: string): PreparedPageFirstLine[] => {
  const normalizedText = normalizeForTypedInput(text);
  if (normalizedText.length === 0) return [];

  const words = normalizedText.split(' ');
  let narrowestMatches: PreparedPageFirstLine[] = [];

  for (let wordCount = words.length; wordCount >= 1; wordCount -= 1) {
    const prefix = words.slice(0, wordCount).join(' ');
    const matches = findPreparedPagesByLineStart(prefix, preparedPages);
    if (matches.length === 0) continue;

    if (narrowestMatches.length === 0 || matches.length < narrowestMatches.length) {
      narrowestMatches = matches;
    }

    if (matches.length <= 5) {
      return matches;
    }
  }

  return narrowestMatches;
};

const assistantCandidatePages = computed(() => {
  if (!shouldUseAssistantResults.value) return [];
  return getAssistantCandidatePages(searchQuery.value);
});

const assistantAnalysis = computed(() => {
  if (!shouldUseAssistantResults.value) return null;
  if (normalizedQuery.value.length === 0) return null;
  return analyzeFirstLineText(searchQuery.value, {
    candidatePages: assistantCandidatePages.value.length > 0 ? assistantCandidatePages.value : undefined,
  });
});

const getMatchedWordStats = (candidate: PreparedPageFirstLine, query: string) => {
  const queryWords = new Set(normalizeForTypedInput(query).split(' ').filter((word) => word.length > 0));
  const matchedWords = candidate.words.filter((word) => queryWords.has(word)).length;
  const coverage = candidate.words.length > 0 ? matchedWords / candidate.words.length : 0;

  return {
    matchedWords,
    coverage,
  };
};

const assistantResults = computed<SearchDisplayItem[]>(() => {
  if (!assistantAnalysis.value) return [];

  const mappedResults = assistantAnalysis.value.rankedMatches.reduce<SearchDisplayItem[]>((results, match) => {
    const page = preparedPagesByNumber.get(match.pageNumber);
    if (!page) return results;

    results.push({
      ...page,
      pageTitle: getTitleForPage(match.pageNumber),
      score: match.score,
      displayConfidence: match.displayConfidence,
      scoreGap: match.scoreGap,
    });

    return results;
  }, []);

  if (assistantAnalysis.value.reliability === 'confirmed') {
    return mappedResults.slice(0, 1);
  }

  return mappedResults.filter((result, index) => {
    if (index === 0) return true;

    const { matchedWords, coverage } = getMatchedWordStats(result, searchQuery.value);
    const minimumMatchedWords = Math.min(2, result.words.length);

    return (
      (result.score ?? 0) >= MINIMUM_ASSISTANT_RESULT_SCORE
      && matchedWords >= minimumMatchedWords
      && coverage >= MINIMUM_ASSISTANT_WORD_COVERAGE
    );
  });
});

const displayedSearchResults = computed<SearchDisplayItem[]>(() => {
  return shouldUseAssistantResults.value ? assistantResults.value : searchResults.value;
});

const assistantSummary = computed(() => {
  if (!assistantAnalysis.value?.bestMatch) return null;
  return assistantResults.value.find((result) => result.pageNumber === assistantAnalysis.value?.bestMatch?.pageNumber) ?? null;
});

const ocrRawPreview = computed(() => {
  const rawText = ocrResult.value?.inputText.replace(/\s+/g, ' ').trim();
  return rawText?.length ? rawText : t('firstLineSearch.ocrNoText');
});

const shouldShowCorrectedOcrText = computed(() => {
  if (!ocrResult.value) return false;
  return normalizeForTypedInput(ocrResult.value.inputText) !== normalizeForTypedInput(ocrResult.value.correctedText);
});

const isOcrResultLowQuality = computed(() => {
  if (!ocrResult.value) return false;
  return ocrResult.value.reliability === 'unreliable' || ocrResult.value.lowConfidenceWordCount >= 2;
});

const shouldUseCompactResults = computed(() => {
  if (!smAndDown.value) return false;
  const threshold = includeMatches.value ? 5 : 7;
  return displayedSearchResults.value.length > threshold;
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

const resetOcrState = () => {
  ocrResult.value = null;
  isOcrProcessing.value = false;
  ocrProgressPercent.value = 0;
  ocrErrorMessage.value = '';
  isOcrCameraOpen.value = false;
  ocrSuggestedQuery.value = '';
};

const openOcrCamera = () => {
  ocrErrorMessage.value = '';
  isOcrCameraOpen.value = true;
};

const closeOcrCamera = () => {
  isOcrCameraOpen.value = false;
};

const onOcrProgress = (payload: OcrProgressPayload) => {
  ocrProgressPercent.value = clampProgress(payload.progress * 100);
};

const clampProgress = (value: number): number => {
  return Math.max(0, Math.min(100, Math.round(value)));
};

const runOcrFromFile = async (selectedFile: File) => {
  isOcrProcessing.value = true;
  ocrProgressPercent.value = 0;
  ocrErrorMessage.value = '';
  isOcrCameraOpen.value = false;

  try {
    const result = await recognizeFirstLineFromImage(selectedFile, {
      onProgress: onOcrProgress,
    });

    ocrResult.value = result;
    ocrSuggestedQuery.value = result.correctedText;
    searchQuery.value = result.correctedText;
    ocrProgressPercent.value = 100;
    await focusSearchField();

    if (result.correctedText.length === 0) {
      ocrErrorMessage.value = t('firstLineSearch.ocrNoTextDetected');
    }
  } catch (error) {
    resetOcrState();
    ocrErrorMessage.value = error instanceof Error
      ? error.message
      : t('firstLineSearch.ocrUnexpectedError');
  } finally {
    isOcrProcessing.value = false;
  }
};

const onOcrCaptured = (file: File) => {
  void runOcrFromFile(file);
};

const onOcrCameraError = (message: string) => {
  ocrErrorMessage.value = message;
};

const onOcrCameraDialogModelValueChange = (value: boolean) => {
  if (!value) {
    closeOcrCamera();
  }
};

const restoreOcrResults = async () => {
  searchQuery.value = ocrSuggestedQuery.value;
  await focusSearchField();
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

const getSearchMode = (): FirstLineSearchMode => {
  return includeMatches.value ? 'inside-line' : 'line-start';
};

const trackCurrentSessionOutcome = (status: 'success' | 'no-result') => {
  if (hasTrackedSessionOutcome.value) return;

  trackFirstLineSearchOutcome({
    side: props.side,
    source: props.source,
    status,
    mode: getSearchMode(),
    lettersCount: normalizedQuery.value.length,
    firstResultLettersCount: firstResultLettersByMode.value[getSearchMode()],
  });
  hasTrackedSessionOutcome.value = true;
};

watch(
  () => props.modelValue,
  async (isOpen) => {
    if (isOpen) {
      searchQuery.value = '';
      includeMatches.value = false;
      showKeyboard.value = false;
      firstResultLettersByMode.value = createFirstResultLettersByMode();
      hasTrackedSessionOutcome.value = false;
      resetOcrState();
      await focusSearchField();
      return;
    }

    closeOcrCamera();

    if (isQueryReady.value && searchResults.value.length === 0) {
      trackCurrentSessionOutcome('no-result');
    }

    previewPage.value = null;
  },
);

watch(
  [() => props.modelValue, normalizedQuery, searchResults],
  ([isOpen, queryValue, results]) => {
    const searchMode = getSearchMode();
    if (!isOpen) return;
    if (firstResultLettersByMode.value[searchMode] != null) return;
    if (queryValue.length === 0 || results.length === 0) return;

    firstResultLettersByMode.value = {
      ...firstResultLettersByMode.value,
      [searchMode]: queryValue.length,
    };
  },
);

const selectPage = (pageNumber: number) => {
  trackCurrentSessionOutcome('success');
  emit('save', toManualData(pageNumber), pageNumber);
  dialog.value = false;
};

const openPreview = (pageNumber: number) => {
  trackFromToAction({
    side: props.side,
    action: 'preview-open',
    value: 'first-line-search',
  });
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

const getConfidenceChipColor = (result: SearchDisplayItem) => {
  if ((result.score ?? 0) >= 95 && (result.scoreGap ?? 0) >= 5) return 'success';
  if ((result.score ?? 0) >= 85) return 'primary';
  return 'warning';
};

const getConfidenceChipLabel = (result: SearchDisplayItem) => {
  if ((result.score ?? 0) >= 95 && (result.scoreGap ?? 0) >= 5) {
    return t('firstLineSearch.ocrConfirmed');
  }

  if ((result.score ?? 0) >= 85) {
    return t('firstLineSearch.ocrLikely', {
      value: result.displayConfidence ?? result.score ?? 0,
    });
  }

  return t('firstLineSearch.ocrUnreliable', {
    value: result.displayConfidence ?? result.score ?? 0,
  });
};
</script>

<style scoped>
.first-line-search-camera-overlay {
  position: fixed;
  inset: 0;
  z-index: 9998;
  background: rgb(var(--v-theme-surface));
  overflow: hidden;
}

.dialog-bottom-transition-enter-active,
.dialog-bottom-transition-leave-active {
  transition: transform 0.3s cubic-bezier(0.25, 0.8, 0.5, 1);
}

.dialog-bottom-transition-enter-from,
.dialog-bottom-transition-leave-to {
  transform: translateY(100%);
}

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

.first-line-search-ocr {
  padding: 16px;
  background: rgba(var(--v-theme-surface-variant), 0.08);
}

.first-line-search-ocr__header,
.first-line-search-ocr__summary-main {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 12px;
}

.first-line-search-ocr__progress {
  display: flex;
  flex-direction: column;
  gap: 10px;
}

.first-line-search-ocr__grid {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 12px;
}

.first-line-search-ocr__grid--single {
  grid-template-columns: 1fr;
}

.first-line-search-ocr__field {
  min-width: 0;
}

.first-line-search-ocr__text {
  margin-top: 4px;
  padding: 12px;
  min-height: 68px;
  border-radius: 12px;
  background: rgba(var(--v-theme-surface), 0.92);
  line-height: 1.7;
  overflow-wrap: anywhere;
  white-space: pre-wrap;
}

.first-line-search-ocr__summary {
  margin-top: 16px;
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

.first-line-search-result--best,
.first-line-search-compact--best {
  border-color: rgba(var(--v-theme-primary), 0.55);
  box-shadow: inset 0 0 0 1px rgba(var(--v-theme-primary), 0.2);
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
  .first-line-search-ocr__grid {
    grid-template-columns: 1fr;
  }

  .first-line-search-ocr__header,
  .first-line-search-ocr__summary-main {
    flex-direction: column;
  }

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
