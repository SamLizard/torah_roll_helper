<template>
  <div class="wizard-step-from" :dir="isRtl ? 'rtl' : 'ltr'">
    <!-- Large Current Selection Display -->
    <v-card class="location-display-card mb-6 pa-6 text-center" variant="flat" border>
      <div v-if="wizardStore.fromPage !== null">
        <span class="text-overline text-uppercase text-primary">{{ $t('home.from.subtitle') }}</span>
        <h2 class="display-page-number font-weight-black text-primary my-2">
          {{ $t('page') }} {{ wizardStore.fromPage }}
        </h2>
        <div v-if="resolvedPageTitle" class="text-subtitle-1 font-weight-medium text-medium-emphasis">
          {{ resolvedPageTitle }}
        </div>
        <v-btn 
          variant="tonal" 
          color="error" 
          size="small" 
          class="mt-4" 
          prepend-icon="mdi-close"
          @click="clearSelection"
        >
          {{ $t('home.actions.clear') }}
        </v-btn>
      </div>
      <div v-else class="py-6">
        <v-icon size="48" class="mb-2 text-medium-emphasis">mdi-book-open-page-variant-outline</v-icon>
        <h3 class="text-h6 font-weight-bold">{{ $t('home.from.emptyHint') }}</h3>
      </div>
    </v-card>

    <!-- Choice of Input Methods -->
    <v-row class="mb-6" dense>
      <v-col cols="12" sm="4">
        <v-card 
          class="input-method-card text-center pa-4 cursor-pointer"
          :class="{ 'is-selected': activeInputMethod === 'camera' }"
          variant="outlined"
          @click="activeInputMethod = 'camera'"
        >
          <v-icon size="28" class="mb-2" :color="activeInputMethod === 'camera' ? 'primary' : 'default'">mdi-camera</v-icon>
          <div class="text-subtitle-2 font-weight-bold">{{ $t('home.actions.photo') }}</div>
        </v-card>
      </v-col>
      <v-col cols="12" sm="4">
        <v-card 
          class="input-method-card text-center pa-4 cursor-pointer"
          :class="{ 'is-selected': activeInputMethod === 'search' }"
          variant="outlined"
          @click="activeInputMethod = 'search'"
        >
          <v-icon size="28" class="mb-2" :color="activeInputMethod === 'search' ? 'primary' : 'default'">mdi-text-search</v-icon>
          <div class="text-subtitle-2 font-weight-bold">{{ $t('home.actions.firstLine') }}</div>
        </v-card>
      </v-col>
      <v-col cols="12" sm="4">
        <v-card 
          class="input-method-card text-center pa-4 cursor-pointer"
          :class="{ 'is-selected': activeInputMethod === 'manual' }"
          variant="outlined"
          @click="activeInputMethod = 'manual'"
        >
          <v-icon size="28" class="mb-2" :color="activeInputMethod === 'manual' ? 'primary' : 'default'">mdi-pencil</v-icon>
          <div class="text-subtitle-2 font-weight-bold">{{ $t('home.actions.input') }}</div>
        </v-card>
      </v-col>
    </v-row>

    <!-- Camera / OCR Interface -->
    <div v-if="activeInputMethod === 'camera'" class="camera-interface-container mb-6">
      <v-card variant="outlined" class="pa-4 rounded-xl">
        <div class="d-flex justify-space-between align-center mb-4">
          <span class="text-subtitle-1 font-weight-bold">{{ $t('home.dicta.title') }}</span>
          <div v-if="hasCachedOptions" class="d-flex ga-2">
            <v-btn size="small" variant="text" prepend-icon="mdi-history" @click="showCachedOptions">
              {{ $t('home.dicta.backToOptions') }}
            </v-btn>
            <v-btn size="small" variant="text" prepend-icon="mdi-camera-retake" @click="retakePhoto">
              {{ $t('home.dicta.newPhoto') }}
            </v-btn>
          </div>
        </div>

        <div v-if="isDictaBusy" class="text-center py-8">
          <v-progress-circular indeterminate color="primary" size="48" width="4" class="mb-4" />
          <div class="text-subtitle-2 text-medium-emphasis">
            {{ dictaFlowState === 'analyzing-ocr' ? $t('home.dicta.loadingOcr') : $t('home.dicta.loadingSearch') }}
          </div>
        </div>

        <div v-else-if="dictaFlowState === 'no-result'" class="text-center py-6">
          <v-icon size="40" color="warning" class="mb-2">mdi-alert-circle-outline</v-icon>
          <div class="text-subtitle-1 font-weight-bold">{{ $t('home.dicta.noResultTitle') }}</div>
          <p class="text-body-2 text-medium-emphasis px-4 my-2">{{ $t('home.dicta.noResultSubtitle') }}</p>
          <div class="d-flex justify-center ga-3 mt-4">
            <v-btn size="small" variant="tonal" color="primary" @click="activeInputMethod = 'search'">
              {{ $t('home.dicta.tryFirstWords') }}
            </v-btn>
            <v-btn size="small" variant="tonal" @click="retakePhoto">
              {{ $t('home.dicta.newPhoto') }}
            </v-btn>
          </div>
        </div>

        <div v-else-if="dictaFlowState === 'error'" class="text-center py-6">
          <v-icon size="40" color="error" class="mb-2">mdi-alert-octagon-outline</v-icon>
          <div class="text-subtitle-1 font-weight-bold">{{ $t('home.dicta.errorTitle') }}</div>
          <p class="text-body-2 text-error px-4 my-2">{{ dictaErrorMessage }}</p>
          <div class="d-flex justify-center ga-3 mt-4">
            <v-btn size="small" variant="tonal" color="primary" @click="activeInputMethod = 'search'">
              {{ $t('home.dicta.tryFirstWords') }}
            </v-btn>
            <v-btn size="small" variant="tonal" @click="retakePhoto">
              {{ $t('home.dicta.newPhoto') }}
            </v-btn>
          </div>
        </div>

        <div v-else>
          <DictaCameraCapture
            :busy="isDictaBusy"
            :auto-fallback="isPhoneCameraMode"
            :hide-file-button="isPhoneCameraMode"
            :suppress-errors="isPhoneCameraMode"
            :mobile-mode="isPhoneCameraMode"
            @captured="onCaptured"
            @error="onCameraError"
          />
        </div>
      </v-card>
    </div>

    <!-- First Words Search Dialog Trigger / Button -->
    <div v-if="activeInputMethod === 'search'" class="text-center mb-6 py-6">
      <v-btn 
        color="primary" 
        size="large" 
        prepend-icon="mdi-text-search"
        @click="isFirstLineSearchOpen = true"
      >
        {{ $t('home.actions.firstLine') }}
      </v-btn>
      <div class="text-caption text-medium-emphasis mt-2">
        {{ $t('firstLineSearch.emptyStateHint') }}
      </div>
    </div>

    <!-- Manual Entry Dialog Trigger / Button -->
    <div v-if="activeInputMethod === 'manual'" class="text-center mb-6 py-6">
      <v-btn 
        color="primary" 
        size="large" 
        prepend-icon="mdi-pencil"
        @click="isManualOpen = true"
      >
        {{ $t('home.actions.input') }}
      </v-btn>
      <div class="text-caption text-medium-emphasis mt-2">
        {{ $t('manual.use_page') }}
      </div>
    </div>

    <!-- Recent Readings / Presets Slider -->
    <div class="recent-readings-section mb-6">
      <h3 class="text-subtitle-1 font-weight-bold mb-3 d-flex align-center">
        <v-icon size="20" class="me-2 text-medium-emphasis">mdi-calendar-clock</v-icon>
        {{ $t('home.calendar.from') }}
      </h3>
      <v-slide-group show-arrows class="py-2">
        <v-slide-group-item
          v-for="entry in calendarEntries"
          :key="`from-${entry.key}-${entry.dateIso}`"
        >
          <ReadingOptionCard
            :reading-key="entry.target.key"
            :reading-label="entry.readingLabel"
            :page="resolvePageForLayout(entry.target.ref.page, layoutKey)"
            :active="isSelectedCalendarEntry(entry)"
            :show-date-icon="true"
            :date-label="entry.dateLabel"
            class="ma-2"
            @click="selectCalendarEntry(entry)"
          />
        </v-slide-group-item>
      </v-slide-group>
    </div>

    <!-- Next Step Navigation -->
    <div class="text-end pt-4">
      <v-btn 
        color="primary" 
        size="large" 
        :disabled="wizardStore.fromPage === null" 
        append-icon="mdi-arrow-right"
        @click="wizardStore.setStep(2)"
      >
        {{ $t('onboarding.actions.next') }}
      </v-btn>
    </div>

    <!-- Floating Dialogs -->
    <ManualEntryDialog 
      v-model="isManualOpen"
      :initial-data="wizardStore.fromRef || { book: 1, chapter: null, verse: null }"
      :initial-page="wizardStore.fromPage"
      @save="onManualSave"
      @open-first-line-search="onOpenFirstLineSearchFromManual"
    />

    <FirstLineSearchDialog
      v-model="isFirstLineSearchOpen"
      side="from"
      source="manual"
      @save="onFirstLineSearchSave"
    />

    <!-- Multiple OCR Choice Overlay -->
    <v-dialog v-model="dictaChoiceOpen" max-width="600px">
      <v-card class="rounded-xl pa-4">
        <v-card-title class="d-flex justify-space-between align-center">
          <span class="text-h6 font-weight-bold">{{ $t('home.dicta.chooseTitle') }}</span>
          <v-btn icon="mdi-close" variant="text" size="small" @click="dictaChoiceOpen = false" />
        </v-card-title>
        <v-card-text>
          <p class="text-body-2 mb-4">{{ $t('home.dicta.chooseSubtitle') }}</p>
          <v-table density="comfortable">
            <thead>
              <tr>
                <th>{{ $t('home.dicta.result.matches') }}</th>
                <th>{{ $t('home.dicta.result.rank') }}</th>
                <th>{{ $t('manual.page') }}</th>
                <th>{{ $t('home.dicta.result.pageTitle') }}</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              <tr v-for="option in dictaChoiceOptions" :key="option.key">
                <td>{{ option.matchCount }}</td>
                <td>
                  <v-chip
                    size="x-small"
                    :color="option.rank === 'high' ? 'success' : (option.rank === 'medium' ? 'warning' : 'default')"
                    variant="tonal"
                  >
                    {{ getRankLabel(option.rank) }}
                  </v-chip>
                </td>
                <td class="font-weight-bold">{{ option.page }}</td>
                <td>{{ getOptionPageTitle(option) }}</td>
                <td class="text-end">
                  <v-btn size="small" color="primary" variant="flat" @click="onDictaChoiceSelect(option)">
                    {{ $t('home.dicta.result.choose') }}
                  </v-btn>
                </td>
              </tr>
            </tbody>
          </v-table>
        </v-card-text>
      </v-card>
    </v-dialog>
  </div>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue';
import { useRtl } from 'vuetify';
import { useI18n } from 'vue-i18n';
import { storeToRefs } from 'pinia';
import { useWizardStore } from '@/stores/wizard';
import { useOptionsStore } from '@/stores/options';
import { useMonthlyReadingsStore } from '@/stores/monthlyReadings';
import { useTorahData, resolvePageForLayout } from '@/composables/torahData';
import { getPageTitleKeys, getPageStartRef, getApproximatePages } from '@/composables/utils';
import { splitPairedParashaReadingId } from '@/composables/calendar/calendar';
import { findReadingTargetByKey, readingTargets, type ReadingTarget } from '@/composables/readingTargets';
import { parseDictaPayload, type DictaReference } from '@/composables/dictaBridge';
import { analyzeDictaImage, type DictaParallelItem } from '@/composables/dictaApi';

import ManualEntryDialog from '@/components/ManualEntryDialog.vue';
import FirstLineSearchDialog from '@/components/FirstLineSearchDialog.vue';
import DictaCameraCapture from '@/components/DictaCameraCapture.vue';
import ReadingOptionCard from '@/components/ReadingOptionCard.vue';

import type { ManualData, TorahRef } from '@/types';

interface CalendarEntry {
  key: string;
  readingLabel: string | null;
  dateIso: string;
  dateLabel: string;
  target: ReadingTarget;
}

interface DictaCandidate {
  index: number;
  page: number;
  reference: DictaReference;
}

interface DictaPageOption {
  key: string;
  candidate: DictaCandidate;
  page: number;
  rank: 'high' | 'medium' | 'low';
  matchCount: number;
  sourceCount: number;
}

const wizardStore = useWizardStore();
const optionsStore = useOptionsStore();
const monthlyReadingsStore = useMonthlyReadingsStore();
const { monthlyReadings } = storeToRefs(monthlyReadingsStore);
const { isRtl } = useRtl();
const { t, locale } = useI18n();

const { 
  realDb: torahRealDb, 
  pageFirstLines: torahPageFirstLines, 
  pageTitlesKeys: torahPageTitles, 
  layoutKey 
} = useTorahData();

// Input states
const activeInputMethod = ref<'camera' | 'search' | 'manual'>('camera');
const isManualOpen = ref(false);
const isFirstLineSearchOpen = ref(false);

// Camera / OCR states
type DictaFlowState = 'idle' | 'analyzing-ocr' | 'analyzing-parallels' | 'success' | 'no-result' | 'error';
const dictaFlowState = ref<DictaFlowState>('idle');
const dictaErrorMessage = ref('');
const dictaChoiceOpen = ref(false);
const dictaChoiceOptions = ref<DictaPageOption[]>([]);
const cachedPageOptions = ref<DictaPageOption[]>([]);

const isDictaBusy = computed(
  () => dictaFlowState.value === 'analyzing-ocr' || dictaFlowState.value === 'analyzing-parallels'
);
const hasCachedOptions = computed(() => cachedPageOptions.value.length > 1);

const isPhoneCameraMode = computed(() => {
  if (typeof navigator === 'undefined') return false;
  const userAgent = navigator.userAgent.toLowerCase();
  return /android|iphone|ipod|windows phone|mobile/.test(userAgent) || 
         (/ipad/.test(userAgent) || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1));
});

// Title Computation
const resolvedPageTitle = computed(() => {
  if (wizardStore.fromPage === null) return '';
  const ref = wizardStore.fromRef;
  const keys = getPageTitleKeys(
    wizardStore.fromPage,
    ref ? { book: ref.book, chapter: ref.chapter || 1, verse: ref.verse || 1 } : null,
    optionsStore.isInGola,
    torahPageTitles.value
  );
  return keys.map((key) => t(key)).join(t('separator'));
});

const clearSelection = () => {
  wizardStore.setFromLocation(null);
  cachedPageOptions.value = [];
  dictaFlowState.value = 'idle';
};

// Calendar Presets
const resolveCalendarReading = (readingId: string): { target: ReadingTarget; readingLabel: string | null } | null => {
  const pairedParashaIds = splitPairedParashaReadingId(readingId);
  if (!pairedParashaIds) {
    const target = findReadingTargetByKey(readingId, optionsStore.isInGola);
    if (!target) return null;
    return { target: target as ReadingTarget, readingLabel: null };
  }

  const [startId, endId] = pairedParashaIds;
  const startTarget = findReadingTargetByKey(startId, optionsStore.isInGola);
  const endTarget = findReadingTargetByKey(endId, optionsStore.isInGola);
  if (!startTarget || !endTarget) return null;

  return {
    target: {
      ...startTarget,
      key: readingId,
      specific: startTarget.specific === endTarget.specific ? startTarget.specific : 'both',
      ref: startTarget.ref,
      refEndPartial: startTarget.refEndPartial,
      refEnd: endTarget.refEnd,
    } as ReadingTarget,
    readingLabel: `${t(`readingTargets.${startId}`)}-${t(`readingTargets.${endId}`)}`,
  };
};

const formatCalendarDate = (dateIso: string) => {
  const parsedDate = new Date(`${dateIso}T12:00:00`);
  if (Number.isNaN(parsedDate.getTime())) return dateIso;
  return new Intl.DateTimeFormat(locale.value, { month: 'short', day: 'numeric' }).format(parsedDate);
};

const calendarEntries = computed(() => {
  const sourceReadings = monthlyReadings.value.lastMonth;
  const entries: CalendarEntry[] = [];

  for (const reading of sourceReadings) {
    const resolved = resolveCalendarReading(reading.readingId);
    if (resolved && reading.dates[reading.dates.length - 1]) {
      entries.push({
        key: reading.readingId,
        readingLabel: resolved.readingLabel,
        dateIso: reading.dates[reading.dates.length - 1],
        dateLabel: formatCalendarDate(reading.dates[reading.dates.length - 1]),
        target: resolved.target,
      });
    }
  }

  return entries.sort((a, b) => b.dateIso.localeCompare(a.dateIso));
});

const isSelectedCalendarEntry = (entry: CalendarEntry) => {
  return wizardStore.fromTargetKey === entry.key;
};

const selectCalendarEntry = (entry: CalendarEntry) => {
  const selectedRef = entry.target.refEndPartial ?? entry.target.refEnd;
  const page = resolvePageForLayout(selectedRef.page, layoutKey.value);
  wizardStore.setFromLocation(page, {
    book: selectedRef.book,
    chapter: selectedRef.chapter,
    verse: selectedRef.verse,
  }, entry.key);
};

// Handlers for manual and search dialogs
const onManualSave = (data: ManualData, page: number) => {
  wizardStore.setFromLocation(page, data, null);
};

const onFirstLineSearchSave = (data: ManualData, page: number) => {
  wizardStore.setFromLocation(page, data, null);
};

const onOpenFirstLineSearchFromManual = () => {
  isManualOpen.value = false;
  isFirstLineSearchOpen.value = true;
};

// Camera capture handlers
const onCaptured = async (file: File) => {
  dictaErrorMessage.value = '';
  dictaFlowState.value = 'analyzing-ocr';

  try {
    const analysis = await analyzeDictaImage(file);
    if (!analysis.ocrText || analysis.parallels.length === 0) {
      dictaFlowState.value = 'no-result';
      return;
    }

    dictaFlowState.value = 'analyzing-parallels';
    const candidates = buildCandidates(analysis.parallels);
    const options = buildPageOptions(candidates);

    if (options.length === 0) {
      dictaFlowState.value = 'no-result';
      return;
    }

    cachedPageOptions.value = options;

    if (options.length === 1) {
      dictaFlowState.value = 'success';
      const opt = options[0];
      wizardStore.setFromLocation(opt.page, {
        book: opt.candidate.reference.book,
        chapter: opt.candidate.reference.chapter,
        verse: opt.candidate.reference.verse,
      });
    } else {
      dictaChoiceOptions.value = options;
      dictaChoiceOpen.value = true;
    }
  } catch (error) {
    dictaFlowState.value = 'error';
    dictaErrorMessage.value = error instanceof Error ? error.message : t('home.dicta.unexpectedError');
  }
};

const onCameraError = (message: string) => {
  dictaFlowState.value = 'error';
  dictaErrorMessage.value = message;
};

const showCachedOptions = () => {
  dictaChoiceOptions.value = cachedPageOptions.value;
  dictaChoiceOpen.value = true;
};

const retakePhoto = () => {
  dictaFlowState.value = 'idle';
  cachedPageOptions.value = [];
};

const onDictaChoiceSelect = (option: DictaPageOption) => {
  dictaChoiceOpen.value = false;
  wizardStore.setFromLocation(option.page, {
    book: option.candidate.reference.book,
    chapter: option.candidate.reference.chapter,
    verse: option.candidate.reference.verse,
  });
};

// Helper analysis methods (migrated from HomeView.vue)
const getRankLabel = (rank: 'high' | 'medium' | 'low') => {
  if (rank === 'high') return t('home.dicta.result.rankHigh');
  if (rank === 'medium') return t('home.dicta.result.rankMedium');
  return t('home.dicta.result.rankLow');
};

const getOptionPageTitle = (option: DictaPageOption) => {
  const ref = option.candidate.reference;
  const keys = getPageTitleKeys(
    option.page,
    { book: ref.book, chapter: ref.chapter, verse: ref.verse ?? 1 },
    optionsStore.isInGola,
    torahPageTitles.value
  );
  if (!keys.length) return '-';
  return keys.map((key) => t(key)).join(t('separator'));
};

const buildCandidates = (results: DictaParallelItem[]): DictaCandidate[] => {
  return results
    .map((item, index) => {
      const xml = typeof item.compBookXmlId === 'string' ? item.compBookXmlId.toLowerCase() : '';
      const url = typeof item.url === 'string' ? item.url.toLowerCase() : '';
      const isTorah = xml.includes('tanakh.torah') || 
                      /genesis|exodus|leviticus|numbers|deuteronomy/.test(url);
      
      if (!isTorah) return null;
      
      const reference = parseDictaPayload(item);
      if (!reference) return null;

      const page = getPageNumber(torahRealDb.value, reference.book, reference.chapter, reference.verse ?? 1);
      return { index, page, reference };
    })
    .filter((c): c is DictaCandidate => c !== null)
    .sort((a, b) => a.index - b.index);
};

const getPageNumber = (db: any[], book: number, chapter: number, verse: number): number => {
  const bookData = db[book - 1];
  if (!bookData) return 0;
  
  // Quick matching lookup logic based on realDb format [chapter, verse, page]
  for (const [c, v, p] of bookData) {
    if (c === chapter && v === verse) {
      return p;
    }
  }

  // Fallback to closest match
  let closestPage = 0;
  for (const [c, v, p] of bookData) {
    if (c < chapter || (c === chapter && v <= verse)) {
      closestPage = p;
    } else {
      break;
    }
  }
  return closestPage;
};

const buildPageOptions = (candidates: DictaCandidate[]): DictaPageOption[] => {
  const optionsByPage = new Map<number, { candidates: DictaCandidate[]; matchCount: number }>();

  candidates.forEach((candidate) => {
    const pages = candidate.reference.verse != null ? 
      [candidate.page] : 
      getApproximatePages(torahRealDb.value, candidate.reference.book, candidate.reference.chapter);

    pages.forEach((page) => {
      if (page <= 0) return;
      const existing = optionsByPage.get(page);
      if (!existing) {
        optionsByPage.set(page, { candidates: [candidate], matchCount: 1 });
      } else {
        existing.candidates.push(candidate);
        existing.matchCount += 1;
      }
    });
  });

  return Array.from(optionsByPage.entries())
    .map(([page, value]) => {
      const candidate = value.candidates[0]; // representative
      return {
        key: `page-${page}`,
        candidate,
        page,
        rank: 'low' as const,
        matchCount: value.matchCount,
        sourceCount: value.candidates.length,
      };
    })
    .sort((a, b) => b.matchCount - a.matchCount)
    .map((option, index) => {
      const rank = index === 0 ? 'high' as const : (index <= 3 ? 'medium' as const : 'low' as const);
      return { ...option, rank };
    });
};

defineExpose({
  openManualDialog: () => { isManualOpen.value = true; },
  closeManualDialog: () => { isManualOpen.value = false; },
  openFirstLineSearchDialog: () => { isFirstLineSearchOpen.value = true; },
  closeFirstLineSearchDialog: () => { isFirstLineSearchOpen.value = false; },
  openPagePreview: () => {},
  closePagePreview: () => {}
});
</script>

<style scoped>
.display-page-number {
  font-size: clamp(2rem, 8vw, 3rem);
  line-height: 1;
}

.location-display-card {
  border-radius: 20px;
  background: linear-gradient(135deg, rgba(23, 37, 84, 0.5), rgba(20, 184, 166, 0.03)) !important;
  border: 1px solid rgba(20, 184, 166, 0.15) !important;
  box-shadow: inset 0 0 16px rgba(20, 184, 166, 0.03), 0 8px 24px rgba(15, 23, 42, 0.3) !important;
}

.input-method-card {
  border-radius: 16px;
  background-color: rgb(var(--v-theme-surface));
  border: 1px solid rgba(248, 250, 252, 0.08);
  transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
}

.input-method-card:hover {
  transform: translateY(-2px);
  background-color: rgba(20, 184, 166, 0.04);
  border-color: rgba(20, 184, 166, 0.4);
  box-shadow: 0 8px 16px -6px rgba(20, 184, 166, 0.25);
}

.input-method-card.is-selected {
  border-color: rgb(var(--v-theme-primary)) !important;
  background-color: rgba(20, 184, 166, 0.08) !important;
  border-width: 1.5px;
  box-shadow: 0 8px 20px -6px rgba(20, 184, 166, 0.4);
}
</style>
