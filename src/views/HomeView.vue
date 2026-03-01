<template>
  <!-- DONE 16: pay attention that the camera popups also have the navbar reachable - like TargetOptionsGrid.vue. So for computers it should be like this in both times the popup is open, and in phones only in the popup to choose from multiple results. -->
  <!-- DONE 17: Look at the jumelées parachiots, and be sure the calendar will work with them, taking the first parasha fort start and middle, and second parasha for end. Look at "For DONE 17" in calendar.ts -->
  <!-- DONE 24: make the photo things rtl/ltr as needed... -->
  <v-container fluid class="pa-4">
    <v-row class="position-relative">
      <v-col cols="12" md="6" class="px-md-5">
        <LocationSelector
          key="from"
          side="from"
          :page="options.fromPage" 
          :selected-ref="fromRef"
          :target-key="fromTargetKey"
          @open-dicta="openDictaFor('from')"
          @choose-manual="openTargets('from')"
          @manual-set="onSetFromPage"
        />
      </v-col>

      <v-icon
        class="position-absolute d-none d-md-flex"
        style="left: 50%; top: 50%; transform: translate(-50%, -50%);"
        size="36"
      >
        mdi-arrow-{{ $vuetify.locale.isRtl ? 'left' : 'right' }}
      </v-icon>

      <v-col cols="12" class="d-flex d-md-none align-center justify-center py-0">
        <v-icon size="36">mdi-arrow-down</v-icon>
      </v-col>

      <v-col cols="12" md="6" class="px-md-5">
        <LocationSelector
          key="to"
          side="to"
          :page="options.toPage" 
          :selected-ref="toRef"
          :target-key="toTargetKey"
          :allow-photo-for-to="allowPhotoForTo"
          @open-dicta="openDictaFor('to')"
          @choose-manual="openTargets('to')"
          @manual-set="onSetToPage"
        />
      </v-col>
    </v-row>

    <v-row class="mt-6" justify="center">
      <v-col cols="12" md="8">
        <RollResult
          :pages="roll?.pages ?? null"
          :direction="roll?.rollDirection ?? null"
          :from-page="options.fromPage"
          :to-page="options.toPage"
        />
      </v-col>
    </v-row>

    <TargetOptionsGrid
      v-model="targetsOpen"
      :side="activeSide"
      :selected-target-key="(activeSide === 'from' ? fromTargetKey : toTargetKey) ?? undefined"
      :allow-gola="allowGolaInTargets"
      @select="onTargetSelected"
    />

    <transition name="dialog-bottom-transition">
      <div
        v-if="!isPhoneCameraMode && dictaOpen"
        class="dicta-overlay bg-background"
        :dir="photoUiDirection"
      >
        <v-card class="dicta-card dicta-card--camera" rounded="0" elevation="0">
          <v-card-title class="dicta-card-title">
            <span>{{ $t('home.dicta.title') }}</span>
            <div class="dicta-card-toolbar">
              <v-btn
                v-if="hasCachedOptionsForActiveSide"
                size="small"
                variant="text"
                :prepend-icon="backToOptionsIcon"
                :disabled="isDictaBusy"
                @click="onDictaShowCachedOptions"
              >
                {{ $t('home.dicta.backToOptions') }}
              </v-btn>
              <v-btn
                size="small"
                variant="text"
                prepend-icon="mdi-camera-retake"
                :disabled="isDictaBusy"
                @click="onDictaRetake"
              >
                {{ $t('home.dicta.newPhoto') }}
              </v-btn>
              <v-btn icon="mdi-close" variant="text" size="small" @click="closeDictaDialog" />
            </div>
          </v-card-title>

          <v-divider />

          <v-card-text class="dicta-card-content">
            <div
              v-if="
                dictaFlowState === 'analyzing-ocr' ||
                dictaFlowState === 'analyzing-parallels' ||
                dictaFlowState === 'success'
              "
              class="dicta-state dicta-state--loading"
            >
              <div v-if="dictaFlowState === 'success'" class="dicta-state-headline">
                <v-icon size="64" class="mb-2 text-success">mdi-check-circle</v-icon>
              </div>
              <template v-else>
                <v-progress-circular indeterminate color="primary" size="54" width="5" />
                <div class="text-subtitle-1 font-weight-medium mt-4">
                  {{
                    dictaFlowState === 'analyzing-ocr'
                      ? $t('home.dicta.loadingOcr')
                      : $t('home.dicta.loadingSearch')
                  }}
                </div>
              </template>
            </div>

            <div v-else class="dicta-state">
              <div v-if="dictaFlowState === 'no-result'" class="dicta-state-headline">
                <v-icon size="46" class="mb-2 text-medium-emphasis">mdi-book-open-page-variant-outline</v-icon>
                <div class="dicta-no-result-title">{{ dictaNoResultTitle }}</div>
                <div class="dicta-no-result-subtitle">{{ dictaNoResultSubtitle }}</div>
              </div>

              <div v-else-if="dictaFlowState === 'error'" class="dicta-state-headline">
                <v-icon size="46" class="mb-2 text-error">mdi-alert-circle-outline</v-icon>
                <div class="dicta-error-title">{{ $t('home.dicta.errorTitle') }}</div>
                <div class="dicta-error-message">{{ dictaErrorMessage }}</div>
              </div>

              <div
                v-else
                class="dicta-state-headline"
                :class="{ 'dicta-state-headline--compact': smAndDown }"
              >
                <v-icon size="46" class="mb-2 text-primary">mdi-camera</v-icon>
                <div class="dicta-idle-title">{{ $t('home.dicta.idleTitle') }}</div>
                <div class="dicta-idle-subtitle">{{ $t('home.dicta.idleSubtitle') }}</div>
              </div>

              <DictaCameraCapture
                v-if="dictaOpen"
                :key="dictaCaptureKey"
                :busy="isDictaBusy"
                :auto-fallback="isPhoneCameraMode"
                :hide-file-button="isPhoneCameraMode"
                :suppress-errors="isPhoneCameraMode"
                :mobile-mode="isPhoneCameraMode"
                @captured="onDictaCaptured"
                @error="onDictaCameraError"
                @close="closeDictaDialog"
              />
            </div>
          </v-card-text>
        </v-card>
      </div>
    </transition>

    <transition name="dialog-bottom-transition">
      <div
        v-if="isPhoneCameraMode && dictaOpen && dictaFlowState !== 'idle'"
        class="dicta-overlay bg-background"
        :dir="photoUiDirection"
      >
        <v-card class="dicta-card dicta-card--camera" rounded="0" elevation="0">
          <v-card-title class="dicta-card-title">
            <span>{{ $t('home.dicta.title') }}</span>
            <div class="dicta-card-toolbar">
              <v-btn
                size="small"
                variant="text"
                prepend-icon="mdi-camera-retake"
                :disabled="isDictaBusy"
                @click="onDictaRetake"
              >
                {{ $t('home.dicta.newPhoto') }}
              </v-btn>
              <v-btn icon="mdi-close" variant="text" size="small" @click="closeDictaDialog" />
            </div>
          </v-card-title>

          <v-divider />

          <v-card-text class="dicta-card-content">
            <div
              v-if="
                dictaFlowState === 'analyzing-ocr' ||
                dictaFlowState === 'analyzing-parallels' ||
                dictaFlowState === 'success'
              "
              class="dicta-state dicta-state--loading"
            >
              <div v-if="dictaFlowState === 'success'" class="dicta-state-headline">
                <v-icon size="64" class="mb-2 text-success">mdi-check-circle</v-icon>
              </div>
              <template v-else>
                <v-progress-circular indeterminate color="primary" size="54" width="5" />
                <div class="text-subtitle-1 font-weight-medium mt-4">
                  {{
                    dictaFlowState === 'analyzing-ocr'
                      ? $t('home.dicta.loadingOcr')
                      : $t('home.dicta.loadingSearch')
                  }}
                </div>
              </template>
            </div>

            <div v-else class="dicta-state">
              <div v-if="dictaFlowState === 'no-result'" class="dicta-state-headline">
                <v-icon size="46" class="mb-2 text-medium-emphasis">mdi-book-open-page-variant-outline</v-icon>
                <div class="dicta-no-result-title">{{ dictaNoResultTitle }}</div>
                <div class="dicta-no-result-subtitle">{{ dictaNoResultSubtitle }}</div>
              </div>

              <div v-else-if="dictaFlowState === 'error'" class="dicta-state-headline">
                <v-icon size="46" class="mb-2 text-error">mdi-alert-circle-outline</v-icon>
                <div class="dicta-error-title">{{ $t('home.dicta.errorTitle') }}</div>
                <div class="dicta-error-message">{{ dictaErrorMessage }}</div>
              </div>
            </div>
          </v-card-text>
        </v-card>
      </div>
    </transition>

    <section
      v-if="isPhoneCameraMode && dictaOpen && dictaFlowState === 'idle'"
      class="dicta-mobile-screen"
      :dir="photoUiDirection"
    >
      <div class="dicta-mobile-screen__header">
        <span class="dicta-mobile-screen__title">{{ $t('home.dicta.title') }}</span>
        <div class="dicta-mobile-screen__toolbar">
          <v-btn
            v-if="hasCachedOptionsForActiveSide"
            size="small"
            variant="text"
            :prepend-icon="backToOptionsIcon"
            :disabled="isDictaBusy"
            @click="onDictaShowCachedOptions"
          >
            {{ $t('home.dicta.backToOptions') }}
          </v-btn>
          <v-btn
            size="small"
            variant="text"
            prepend-icon="mdi-camera-retake"
            :disabled="isDictaBusy"
            @click="onDictaRetake"
          >
            {{ $t('home.dicta.newPhoto') }}
          </v-btn>
          <v-btn icon="mdi-close" variant="text" size="small" @click="closeDictaDialog" />
        </div>
      </div>

      <v-divider />

      <div class="dicta-mobile-screen__content">
        <div class="dicta-state">
          <DictaCameraCapture
            v-if="dictaOpen"
            :key="dictaCaptureKey"
            :busy="isDictaBusy"
            :auto-fallback="isPhoneCameraMode"
            :hide-file-button="isPhoneCameraMode"
            :suppress-errors="isPhoneCameraMode"
            :mobile-mode="isPhoneCameraMode"
            @captured="onDictaCaptured"
            @error="onDictaCameraError"
            @close="closeDictaDialog"
          />
        </div>
      </div>
    </section>

    <transition name="dialog-bottom-transition">
      <div
        v-if="dictaChoiceOpen"
        class="dicta-choice-overlay bg-background"
        :dir="photoUiDirection"
      >
        <v-card class="dicta-choice-shell" rounded="0" elevation="0">
          <v-card-title class="dicta-card-title">
            <span>{{ $t('home.dicta.chooseTitle') }}</span>
            <div class="dicta-card-toolbar">
              <v-btn
                size="small"
                variant="text"
                prepend-icon="mdi-camera-retake"
                @click="onDictaChoiceRetake"
              >
                {{ $t('home.dicta.newPhoto') }}
              </v-btn>
              <v-btn icon="mdi-close" variant="text" size="small" @click="onDictaChoiceCancel" />
            </div>
          </v-card-title>
          <v-card-text class="dicta-choice-content">
            <p class="text-body-2 mb-4">{{ $t('home.dicta.chooseSubtitle') }}</p>
            <v-table
              v-if="!smAndDown"
              density="compact"
              class="dicta-choice-table"
            >
              <thead>
                <tr>
                  <th>{{ $t('home.dicta.result.index') }}</th>
                  <th>{{ $t('home.dicta.result.matches') }}</th>
                  <th>{{ $t('home.dicta.result.rank') }}</th>
                  <th>{{ $t('home.dicta.result.reference') }}</th>
                  <th>{{ $t('manual.book') }}</th>
                  <th>{{ $t('manual.chapter') }}</th>
                  <th>{{ $t('manual.verse') }}</th>
                  <th>{{ $t('manual.page') }}</th>
                  <th>{{ $t('home.dicta.result.pageTitle') }}</th>
                  <th></th>
                </tr>
              </thead>
              <tbody>
                <tr
                  v-for="(option, index) in dictaChoiceOptions"
                  :key="option.key"
                >
                  <td>{{ index + 1 }}</td>
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
                  <td class="dicta-choice-source">{{ getOptionExtraMatchesLabel(option) }}</td>
                  <td>{{ getBookLabel(option.candidate.reference.book) }}</td>
                  <td>{{ option.candidate.reference.chapter }}</td>
                  <td>{{ option.candidate.reference.verse ?? '-' }}</td>
                  <td>{{ option.page }}</td>
                  <td class="dicta-choice-page-title">{{ getOptionPageTitle(option) }}</td>
                  <td>
                    <v-btn
                      size="small"
                      color="primary"
                      variant="tonal"
                      @click="onDictaChoiceSelect(option)"
                    >
                      {{ $t('home.dicta.result.choose') }}
                    </v-btn>
                  </td>
                </tr>
              </tbody>
            </v-table>

            <v-row v-else dense>
              <v-col
                v-for="(option, index) in dictaChoiceOptions"
                :key="option.key"
                cols="12"
              >
                <v-card variant="outlined" class="dicta-choice-card">
                  <v-card-text class="py-2 px-3">
                    <div class="d-flex align-center justify-space-between mb-1">
                      <strong>#{{ index + 1 }}</strong>
                      <v-chip
                        size="x-small"
                        :color="option.rank === 'high' ? 'success' : (option.rank === 'medium' ? 'warning' : 'default')"
                        variant="tonal"
                      >
                        {{ getRankLabel(option.rank) }}
                      </v-chip>
                    </div>
                    <div class="d-flex flex-wrap ga-2 text-body-2 mb-1">
                      <strong>{{ $t('manual.page') }} {{ option.page }}</strong>
                      <span>{{ getOptionPageTitle(option) }}</span>
                    </div>
                    <div class="text-caption text-medium-emphasis mb-1">
                      {{ $t('manual.book') }} {{ getBookLabel(option.candidate.reference.book) }} ·
                      {{ $t('manual.chapter') }} {{ option.candidate.reference.chapter }} ·
                      {{ $t('manual.verse') }} {{ option.candidate.reference.verse ?? '-' }}
                    </div>
                    <div class="text-caption text-medium-emphasis">
                      {{ option.matchCount }} {{ $t('home.dicta.result.matches') }}
                      <template v-if="option.sourceCount > 1">
                        · {{ getOptionExtraMatchesLabel(option) }}
                      </template>
                    </div>
                  </v-card-text>
                  <v-card-actions class="pt-0 px-3 pb-2">
                    <v-btn
                      size="small"
                      color="primary"
                      block
                      variant="tonal"
                      @click="onDictaChoiceSelect(option)"
                    >
                      {{ $t('home.dicta.result.choose') }}
                    </v-btn>
                  </v-card-actions>
                </v-card>
              </v-col>
            </v-row>
          </v-card-text>
        </v-card>
      </div>
    </transition>

  </v-container>
</template>

<script setup lang="ts">
import { ref, computed, watch, onUnmounted } from 'vue';
import { useI18n } from 'vue-i18n';
import { useDisplay } from 'vuetify';
import { useRtl } from 'vuetify';
import { useOptionsStore } from '@/stores/options';
import LocationSelector from '@/components/LocationSelector.vue';
import RollResult from '@/components/RollResult.vue';
import TargetOptionsGrid from '@/components/TargetOptionsGrid.vue';
import DictaCameraCapture from '@/components/DictaCameraCapture.vue';
import type { ManualData } from '@/components/ManualEntryDialog.vue';
import { computeRoll, getPageNumber, getApproximatePages, getPageTitleKeys } from '@/composables/utils';
import { trackRollResultDisplayed } from '@/composables/analytics';
import realDb from '@/data/real_db.json';
import { parseDictaPayload, type DictaReference } from '@/composables/dictaBridge';
import { analyzeDictaImage, type DictaParallelItem } from '@/composables/dictaApi';
import type { RealDb, RollInstructions, TorahRef } from '@/types';

interface HomeTargetItem {
  key: string;
  ref: TorahRef;
  refEndPartial?: TorahRef;
  refEnd: TorahRef;
}

const BOOK_LABEL_KEYS = ['genesis', 'exodus', 'leviticus', 'numbers', 'deuteronomy'] as const;
type DictaFlowState = 'idle' | 'analyzing-ocr' | 'analyzing-parallels' | 'success' | 'no-result' | 'error';

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

const options = useOptionsStore();
const { t } = useI18n();
const { smAndDown } = useDisplay();
const { isRtl } = useRtl();
const db = realDb as RealDb;
const fromRef = ref<ManualData | null>(null);
const toRef = ref<ManualData | null>(null);
const fromTargetKey = ref<string | null>(null);
const toTargetKey = ref<string | null>(null);

const targetsOpen = ref(false);
const activeSide = ref<'from' | 'to'>('to');

const allowPhotoForTo = ref(false);

const dictaOpen = ref(false);
const dictaFlowState = ref<DictaFlowState>('idle');
const dictaErrorMessage = ref('');
const dictaRawResults = ref<DictaParallelItem[]>([]);
const dictaCandidates = ref<DictaCandidate[]>([]);
const dictaChoiceOpen = ref(false);
const dictaChoiceOptions = ref<DictaPageOption[]>([]);
const dictaChoiceResolver = ref<((option: DictaPageOption | null) => void) | null>(null);
const dictaCaptureKey = ref(0);
const dictaAnalyzeJobId = ref(0);
const dictaOptionsBySide = ref<Record<'from' | 'to', DictaPageOption[]>>({
  from: [],
  to: [],
});

const allowGolaInTargets = computed(() => {
  return true;
});

const roll = ref<RollInstructions | null>(null);

watch(
  [() => options.fromPage, () => options.toPage], 
  ([newFrom, newTo]) => {
    if (newFrom != null && newTo != null) {
      const computedRoll = computeRoll(newFrom, newTo);
      roll.value = computedRoll;
      trackRollResultDisplayed({
        direction: computedRoll.rollDirection,
        pages: computedRoll.pages,
      });
    } else {
      roll.value = null;
    }
  },
  { immediate: true }
);

const toManualData = (torahRef: TorahRef): ManualData => ({
  book: torahRef.book,
  chapter: torahRef.chapter,
  verse: torahRef.verse,
});

const getDefaultRefForSide = (target: HomeTargetItem, side: 'from' | 'to'): TorahRef => {
  if (side === 'from') return target.refEndPartial ?? target.refEnd;
  return target.ref;
};

const closeDictaDialog = (preserveJob = false) => {
  dictaOpen.value = false;
  if (!preserveJob) {
    dictaAnalyzeJobId.value += 1;
  }
};

const resetDictaSession = () => {
  dictaFlowState.value = 'idle';
  dictaErrorMessage.value = '';
  dictaRawResults.value = [];
  dictaCandidates.value = [];
};

const applyDictaReference = (reference: DictaReference, page: number): void => {
  const resolvedPage = getPageNumber(db, reference.book, reference.chapter, reference.verse ?? 1);
  const finalPage = page > 0 ? page : resolvedPage;
  if (finalPage <= 0) return;

  const data: ManualData = {
    book: reference.book,
    chapter: reference.chapter,
    verse: reference.verse,
  };

  if (activeSide.value === 'from') {
    onSetFromPage(finalPage, data, null);
  } else {
    onSetToPage(finalPage, data, null);
  }
};

const getBookLabel = (book: number): string => {
  const key = BOOK_LABEL_KEYS[book - 1];
  return key ? t(`group.${key}`) : `${book}`;
};

const dictaNoResultTitle = computed(() => t('home.dicta.noResultTitle'));
const dictaNoResultSubtitle = computed(() => t('home.dicta.noResultSubtitle'));
const isDictaBusy = computed(
  () => dictaFlowState.value === 'analyzing-ocr' || dictaFlowState.value === 'analyzing-parallels'
);
const hasCachedOptionsForActiveSide = computed(
  () => dictaOptionsBySide.value[activeSide.value].length > 1
);
const photoUiDirection = computed<'rtl' | 'ltr'>(() => (isRtl.value ? 'rtl' : 'ltr'));
const backToOptionsIcon = computed(() => (isRtl.value ? 'mdi-arrow-right' : 'mdi-arrow-left'));
const isPhoneCameraMode = computed(() => {
  if (typeof navigator === 'undefined') return false;
  const userAgent = navigator.userAgent.toLowerCase();
  const mobileUserAgent = /android|iphone|ipod|windows phone|mobile/.test(userAgent);
  const iPadLike = /ipad/.test(userAgent) || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);
  return mobileUserAgent || iPadLike;
});

const getPageTitleLabel = (page: number, reference: DictaReference): string => {
  const keys = getPageTitleKeys(page, {
    book: reference.book,
    chapter: reference.chapter,
    verse: reference.verse,
  });
  if (!keys.length) return '-';
  return keys.map((key) => t(key)).join(t('separator'));
};

const getRankFromPosition = (position: number): 'high' | 'medium' | 'low' => {
  if (position === 0) return 'high';
  if (position <= 4) return 'medium';
  return 'low';
};

const getRankLabel = (rank: 'high' | 'medium' | 'low'): string => {
  if (rank === 'high') return t('home.dicta.result.rankHigh');
  if (rank === 'medium') return t('home.dicta.result.rankMedium');
  return t('home.dicta.result.rankLow');
};

const isTorahResult = (source: DictaParallelItem): boolean => {
  const xml = typeof source.compBookXmlId === 'string' ? source.compBookXmlId.toLowerCase() : '';
  if (xml.includes('tanakh.torah')) return true;

  const url = typeof source.url === 'string' ? source.url.toLowerCase() : '';
  return (
    url.includes('/genesis.') ||
    url.includes('/exodus.') ||
    url.includes('/leviticus.') ||
    url.includes('/numbers.') ||
    url.includes('/deuteronomy.')
  );
};

const getOptionExtraMatchesLabel = (option: DictaPageOption): string => {
  if (option.sourceCount <= 1) return '-';
  return `(+${option.sourceCount - 1})`;
};

const getOptionPageTitle = (option: DictaPageOption): string => {
  return getPageTitleLabel(option.page, option.candidate.reference);
};

const buildDictaCandidates = (results: DictaParallelItem[]): DictaCandidate[] => {
  const candidates = results
    .map((item, index) => {
      if (!isTorahResult(item)) return null;
      const reference = parseDictaPayload(item);
      if (!reference) return null;

      const page = getPageNumber(db, reference.book, reference.chapter, reference.verse ?? 1);
      return {
        index,
        page,
        reference,
      } as DictaCandidate;
    })
    .filter((candidate): candidate is DictaCandidate => candidate !== null);

  return candidates.sort((a, b) => a.index - b.index);
};

const expandCandidatePages = (candidate: DictaCandidate): number[] => {
  if (candidate.reference.verse != null) {
    return candidate.page > 0 ? [candidate.page] : [];
  }

  return getApproximatePages(db, candidate.reference.book, candidate.reference.chapter)
    .filter((page) => page > 0);
};

const compareByChapterAndVerse = (a: DictaCandidate, b: DictaCandidate): number => {
  const chapterDiff = a.reference.chapter - b.reference.chapter;
  if (chapterDiff !== 0) return chapterDiff;

  const aVerse = a.reference.verse ?? Number.MAX_SAFE_INTEGER;
  const bVerse = b.reference.verse ?? Number.MAX_SAFE_INTEGER;
  const verseDiff = aVerse - bVerse;
  if (verseDiff !== 0) return verseDiff;

  const bookDiff = a.reference.book - b.reference.book;
  if (bookDiff !== 0) return bookDiff;

  return a.index - b.index;
};

const getRepresentativeCandidate = (candidates: DictaCandidate[]): DictaCandidate => {
  const sorted = [...candidates].sort(compareByChapterAndVerse);
  const withVerse = sorted.find((candidate) => candidate.reference.verse != null);
  return withVerse ?? sorted[0];
};

const buildDictaPageOptions = (candidates: DictaCandidate[]): DictaPageOption[] => {
  const optionsByPage = new Map<
    number,
    {
      candidates: DictaCandidate[];
      referenceKeys: Set<string>;
      matchCount: number;
    }
  >();

  candidates.forEach((candidate) => {
    const pages = expandCandidatePages(candidate);
    const referenceKey = `${candidate.reference.book}:${candidate.reference.chapter}:${candidate.reference.verse ?? '-'}`;

    pages.forEach((page) => {
      const existing = optionsByPage.get(page);
      if (!existing) {
        optionsByPage.set(page, {
          candidates: [candidate],
          referenceKeys: new Set([referenceKey]),
          matchCount: 1,
        });
        return;
      }

      existing.candidates.push(candidate);
      existing.referenceKeys.add(referenceKey);
      existing.matchCount += 1;
    });
  });

  const sorted = Array.from(optionsByPage.entries())
    .map(([page, value]) => {
      const candidate = getRepresentativeCandidate(value.candidates);
      const sourceCount = value.referenceKeys.size;

      return {
        key: `page-${page}`,
        candidate,
        page,
        rank: 'low' as const,
        matchCount: value.matchCount,
        sourceCount,
      };
    })
    .sort((a, b) => {
      const matchDiff = b.matchCount - a.matchCount;
      if (matchDiff !== 0) return matchDiff;

      const candidateDiff = compareByChapterAndVerse(a.candidate, b.candidate);
      if (candidateDiff !== 0) return candidateDiff;

      return a.page - b.page;
    });

  return sorted.map((option, index) => {
    const rank = getRankFromPosition(index);
    return {
      ...option,
      rank,
    };
  });
};

const pickDictaPageOption = async (options: DictaPageOption[]): Promise<DictaPageOption | null> => {
  if (options.length === 0) return null;
  if (options.length === 1) return options[0];

  dictaChoiceOptions.value = options;
  dictaChoiceOpen.value = true;

  return await new Promise((resolve) => {
    dictaChoiceResolver.value = resolve;
  });
};

const isCurrentAnalyzeJob = (jobId: number): boolean => jobId === dictaAnalyzeJobId.value;
const wait = async (ms: number): Promise<void> => {
  await new Promise<void>((resolve) => {
    setTimeout(resolve, ms);
  });
};

const processDictaFile = async (file: File): Promise<void> => {
  const jobId = ++dictaAnalyzeJobId.value;

  try {
    if (!isCurrentAnalyzeJob(jobId)) return;
    dictaErrorMessage.value = '';
    dictaFlowState.value = 'analyzing-ocr';

    const analysis = await analyzeDictaImage(file);
    if (!isCurrentAnalyzeJob(jobId)) return;

    if (!analysis.ocrText) {
      dictaFlowState.value = 'no-result';
      return;
    }

    dictaFlowState.value = 'analyzing-parallels';
    dictaRawResults.value = analysis.parallels;

    if (analysis.parallels.length === 0) {
      dictaFlowState.value = 'no-result';
      return;
    }

    const candidates = buildDictaCandidates(analysis.parallels);
    dictaCandidates.value = candidates;
    const pageOptions = buildDictaPageOptions(candidates);

    if (pageOptions.length === 0) {
      dictaFlowState.value = 'no-result';
      return;
    }

    dictaOptionsBySide.value[activeSide.value] = pageOptions;

    if (pageOptions.length === 1) {
      dictaFlowState.value = 'success';
      await wait(500);
      if (!isCurrentAnalyzeJob(jobId)) return;
    }

    closeDictaDialog(true);
    if (!isCurrentAnalyzeJob(jobId)) return;

    const selectedOption = await pickDictaPageOption(pageOptions);
    if (!isCurrentAnalyzeJob(jobId)) return;

    if (!selectedOption) {
      return;
    }

    applyDictaReference(selectedOption.candidate.reference, selectedOption.page);
  } catch (error) {
    if (!isCurrentAnalyzeJob(jobId)) return;
    dictaFlowState.value = 'error';
    dictaErrorMessage.value = error instanceof Error ? error.message : t('home.dicta.unexpectedError');
  }
};

const onDictaCaptured = (file: File): void => {
  void processDictaFile(file);
};

const onDictaCameraError = (message: string): void => {
  dictaFlowState.value = 'error';
  dictaErrorMessage.value = message;
};

const resolveDictaChoice = (choice: DictaPageOption | null): void => {
  dictaChoiceOpen.value = false;
  dictaChoiceOptions.value = [];
  if (dictaChoiceResolver.value) {
    const resolver = dictaChoiceResolver.value;
    dictaChoiceResolver.value = null;
    resolver(choice);
  }
};

const onDictaChoiceSelect = (option: DictaPageOption): void => {
  resolveDictaChoice(option);
};

const onDictaChoiceCancel = (): void => {
  resolveDictaChoice(null);
};

const onDictaChoiceRetake = (): void => {
  resolveDictaChoice(null);
  openDictaCaptureForSide(activeSide.value);
};

const onDictaOverlayKeydown = (event: KeyboardEvent): void => {
  if (event.key !== 'Escape') return;
  if (dictaChoiceOpen.value) {
    onDictaChoiceCancel();
    return;
  }
  if (dictaOpen.value) {
    closeDictaDialog();
  }
};

const openCachedOptionsForSide = (side: 'from' | 'to'): void => {
  const cachedOptions = dictaOptionsBySide.value[side];
  if (cachedOptions.length <= 1) {
    openDictaCaptureForSide(side);
    return;
  }

  void pickDictaPageOption(cachedOptions).then((selectedOption) => {
    if (!selectedOption) return;
    applyDictaReference(selectedOption.candidate.reference, selectedOption.page);
  });
};

const openDictaCaptureForSide = (side: 'from' | 'to'): void => {
  activeSide.value = side;
  dictaAnalyzeJobId.value += 1;
  resetDictaSession();
  dictaCaptureKey.value += 1;
  dictaOpen.value = true;
};

const onDictaRetake = (): void => {
  openDictaCaptureForSide(activeSide.value);
};

const onDictaShowCachedOptions = (): void => {
  closeDictaDialog();
  openCachedOptionsForSide(activeSide.value);
};

const openDictaFor = (side: 'from' | 'to') => {
  activeSide.value = side;
  if (dictaOptionsBySide.value[side].length > 1) {
    openCachedOptionsForSide(side);
    return;
  }
  openDictaCaptureForSide(side);
};

const openTargets = (side: 'from' | 'to') => {
  activeSide.value = side;
  targetsOpen.value = true;
};

const onSetFromPage = (
  p: number | null,
  refData: ManualData | null = null,
  targetKey: string | null = null
) => {
  options.changeFromPage(p);
  fromRef.value = refData;
  fromTargetKey.value = p == null ? null : targetKey;
};

const onSetToPage = (
  p: number | null,
  refData: ManualData | null = null,
  targetKey: string | null = null
) => {
  options.changeToPage(p);
  toRef.value = refData;
  toTargetKey.value = p == null ? null : targetKey;
};

const onTargetSelected = (item: HomeTargetItem) => {
  const selectedRef = getDefaultRefForSide(item, activeSide.value);
  const newRef = toManualData(selectedRef);

  if (activeSide.value === 'from') {
    options.changeFromPage(selectedRef.page);
    fromRef.value = newRef;
    fromTargetKey.value = item.key;
  } else {
    options.changeToPage(selectedRef.page);
    toRef.value = newRef;
    toTargetKey.value = item.key;
  }
  targetsOpen.value = false;
};

watch(dictaOpen, (isOpen) => {
  if (!isOpen) {
    resetDictaSession();
  }
});

watch(dictaChoiceOpen, (isOpen) => {
  if (!isOpen && dictaChoiceResolver.value) {
    resolveDictaChoice(null);
  }
});

watch(
  [
    () => !isPhoneCameraMode.value && dictaOpen.value,
    () => isPhoneCameraMode.value && dictaOpen.value && dictaFlowState.value !== 'idle',
    () => dictaChoiceOpen.value,
  ],
  ([isDesktopCameraOverlayOpen, isPhoneLoadingOverlayOpen, isChoiceOverlayOpen]) => {
    const hasOverlay = isDesktopCameraOverlayOpen || isPhoneLoadingOverlayOpen || isChoiceOverlayOpen;
    if (hasOverlay) {
      document.body.style.overflow = 'hidden';
      window.addEventListener('keydown', onDictaOverlayKeydown);
      return;
    }
    document.body.style.overflow = '';
    window.removeEventListener('keydown', onDictaOverlayKeydown);
  }
);

onUnmounted(() => {
  document.body.style.overflow = '';
  window.removeEventListener('keydown', onDictaOverlayKeydown);
});
</script>

<style scoped>
.dicta-overlay,
.dicta-choice-overlay {
  position: fixed;
  inset: 0;
  z-index: 950;
  padding-top: 64px;
  display: flex;
  flex-direction: column;
}

.dialog-bottom-transition-enter-active,
.dialog-bottom-transition-leave-active {
  transition: transform 0.3s cubic-bezier(0.25, 0.8, 0.5, 1);
}

.dialog-bottom-transition-enter-from,
.dialog-bottom-transition-leave-to {
  transform: translateY(100%);
}

.dicta-card {
  overflow: clip;
  display: flex;
  flex-direction: column;
}

.dicta-card--camera,
.dicta-choice-shell {
  width: min(1200px, calc(100% - 24px));
  margin: 12px auto;
  height: calc(100% - 24px);
  display: flex;
  flex-direction: column;
}

.dicta-choice-content {
  flex: 1 1 auto;
  min-height: 0;
  overflow: auto;
}

.dicta-mobile-screen {
  position: fixed;
  inset: 0;
  z-index: 2400;
  background: rgb(var(--v-theme-surface));
  display: flex;
  flex-direction: column;
}

.dicta-mobile-screen__header {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 10px 8px 8px;
  background: rgb(var(--v-theme-surface));
}

.dicta-mobile-screen__title {
  font-size: 1rem;
  font-weight: 600;
}

.dicta-mobile-screen__toolbar {
  display: flex;
  align-items: center;
  gap: 4px;
  margin-inline-start: auto;
}

.dicta-mobile-screen__content {
  flex: 1 1 auto;
  min-height: 0;
  display: flex;
  flex-direction: column;
  overflow: hidden;
  padding: 0;
}

.dicta-card-title {
  display: flex;
  align-items: center;
  justify-content: flex-start;
  gap: 8px;
}

.dicta-card-toolbar {
  display: flex;
  align-items: center;
  gap: 4px;
  margin-inline-start: auto;
}

.dicta-card-content {
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 16px 20px 20px;
  flex: 1 1 auto;
  overflow: auto;
}

.dicta-state {
  width: 100%;
  text-align: start;
  display: flex;
  align-items: center;
  justify-content: center;
  flex-direction: column;
  gap: 12px;
  overflow: auto;
}

.dicta-state-headline {
  width: 100%;
  text-align: center;
}

.dicta-state-headline--compact {
  display: none;
}

.dicta-state--loading {
  min-height: 230px;
}

.dicta-no-result-title,
.dicta-error-title,
.dicta-idle-title {
  font-size: 1.1rem;
  font-weight: 700;
  margin-bottom: 8px;
}

.dicta-no-result-subtitle,
.dicta-error-message,
.dicta-idle-subtitle {
  color: rgba(var(--v-theme-on-surface), 0.72);
  margin-bottom: 16px;
  max-width: 36ch;
}

.dicta-choice-table {
  width: 100%;
}

.dicta-choice-source {
  max-width: 380px;
  overflow-wrap: anywhere;
}

.dicta-choice-page-title {
  max-width: 270px;
  overflow-wrap: anywhere;
}

.dicta-choice-card {
  height: 100%;
}

@media (max-width: 600px) {
  .dicta-overlay,
  .dicta-choice-overlay {
    padding-top: 56px;
  }

  .dicta-choice-shell {
    width: 100%;
    margin: 0;
    height: 100%;
  }

  .dicta-card--camera {
    width: 100%;
    margin: 0;
    height: 100%;
  }

  .dicta-card {
    height: 100dvh;
  }

  .dicta-card-content {
    min-height: 0;
    padding: 0;
  }

  .dicta-card-title {
    padding-inline: 8px;
  }

  .dicta-card-toolbar :deep(.v-btn) {
    min-width: 0;
    padding-inline: 8px;
    font-size: 0.75rem;
  }

  .dicta-mobile-screen__toolbar :deep(.v-btn) {
    min-width: 0;
    padding-inline: 8px;
    font-size: 0.75rem;
  }
}
</style>
