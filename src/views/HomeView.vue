<template>
  <v-container fluid class="pa-4">
    <v-row class="position-relative">
      <v-col cols="12" md="6" class="px-md-5">
        <LocationSelector
          ref="fromLocationSelectorRef"
          key="from"
          side="from"
          :page="options.fromPage" 
          :selected-ref="fromRef"
          :target-key="fromTargetKey"
          :balance-calendar-card-height="balanceCalendarCardHeight"
          @open-dicta="openDictaFor('from')"
          @choose-manual="openTargets('from')"
          @calendar-requires-expanded-height-change="(requiresExpandedHeight) => onCalendarExpandedHeightChange('from', requiresExpandedHeight)"
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
          ref="toLocationSelectorRef"
          key="to"
          side="to"
          :page="options.toPage" 
          :selected-ref="toRef"
          :target-key="toTargetKey"
          :balance-calendar-card-height="balanceCalendarCardHeight"
          @open-dicta="openDictaFor('to')"
          @choose-manual="openTargets('to')"
          @calendar-requires-expanded-height-change="(requiresExpandedHeight) => onCalendarExpandedHeightChange('to', requiresExpandedHeight)"
          @manual-set="onSetToPage"
        />
      </v-col>
    </v-row>

    <v-row class="mt-6" justify="center">
      <v-col cols="12" md="8">
        <div data-tutorial="roll-result">
          <RollResult
            :pages="roll?.pages ?? null"
            :direction="roll?.rollDirection ?? null"
            :from-page="options.fromPage"
            :to-page="options.toPage"
          />
        </div>
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
        <v-card class="dicta-card dicta-card--camera" rounded="0" elevation="0" data-tutorial="dicta-dialog">
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
                :auto-fallback="isPhoneCameraMode && !isTutorialActive"
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
        <v-card class="dicta-card dicta-card--camera" rounded="0" elevation="0" data-tutorial="dicta-dialog">
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
      data-tutorial="dicta-dialog"
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
            :auto-fallback="isPhoneCameraMode && !isTutorialActive"
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

    <VOnboardingWrapper
      ref="onboardingWrapper"
      class="home-onboarding"
      :class="{ 'home-onboarding--interactive': isTutorialInteractiveStep }"
      :steps="currentTutorialSteps"
      :options="onboardingOptions"
      @finish="onOnboardingFinish"
      @exit="onOnboardingExit"
    >
      <template #default="{ step, previous, next, isFirst, isLast, index }">
        <VOnboardingStep>
          <section class="onboarding-card">
            <div class="onboarding-card__topline">
              <span class="onboarding-card__eyebrow">
                {{
                  activeTutorial === 'quick'
                    ? $t('onboarding.labels.quick')
                    : $t('onboarding.labels.full')
                }}
              </span>
              <span class="onboarding-card__progress">
                {{ $t('onboarding.progress', { current: index + 1, total: currentTutorialSteps.length }) }}
              </span>
            </div>

            <h3 class="onboarding-card__title">
              {{ step.content.title }}
            </h3>
            <p class="onboarding-card__description">
              {{ step.content.description }}
            </p>

            <div class="onboarding-card__actions">
              <v-btn variant="text" size="small" @click="requestTutorialExit()">
                {{ $t('onboarding.actions.exit') }}
              </v-btn>

              <div class="onboarding-card__buttons">
                <v-btn
                  v-if="!isFirst"
                  variant="text"
                  size="small"
                  @click="previous()"
                >
                  {{ $t('onboarding.actions.back') }}
                </v-btn>

                <v-btn
                  color="primary"
                  variant="flat"
                  size="small"
                  :disabled="!isLast && isTutorialPrimaryActionDisabled"
                  @click="onTutorialPrimaryAction(isLast, next)"
                >
                  {{
                    isLast
                      ? (
                        activeTutorialStepId === 'full-about'
                          ? $t('onboarding.actions.openAbout')
                          : $t('onboarding.actions.finish')
                      )
                      : $t('onboarding.actions.next')
                  }}
                </v-btn>
              </div>
            </div>
          </section>
        </VOnboardingStep>
      </template>
    </VOnboardingWrapper>

  </v-container>
</template>

<script setup lang="ts">
import 'v-onboarding/dist/style.css';

import { ref, computed, watch, onMounted, onUnmounted, nextTick } from 'vue';
import { storeToRefs } from 'pinia';
import { useI18n } from 'vue-i18n';
import { useRoute, useRouter } from 'vue-router';
import { useDisplay } from 'vuetify';
import { useRtl } from 'vuetify';
import {
  VOnboardingStep,
  VOnboardingWrapper,
  useVOnboarding,
  type StepEntity,
  type VOnboardingWrapperOptions,
} from 'v-onboarding';
import { useOptionsStore } from '@/stores/options';
import { useMonthlyReadingsStore } from '@/stores/monthlyReadings';
import LocationSelector from '@/components/LocationSelector.vue';
import RollResult from '@/components/RollResult.vue';
import TargetOptionsGrid from '@/components/TargetOptionsGrid.vue';
import DictaCameraCapture from '@/components/DictaCameraCapture.vue';
import type { ManualData } from '@/components/ManualEntryDialog.vue';
import { computeRoll, getPageNumber, getApproximatePages, getPageTitleKeys } from '@/composables/utils';
import { splitPairedParashaReadingId } from '@/composables/calendar/calendar';
import { findReadingTargetByKey } from '@/composables/readingTargets';
import {
  trackRollResultDisplayed,
  trackTutorialEvent,
} from '@/composables/analytics';
import { markTutorialStarted } from '@/composables/tutorials';
import {
  closeTutorialLanguageMenu,
  isLanguageMenuOpen,
  openTutorialLanguageMenu,
} from '@/composables/tutorialUi';
import realDb from '@/data/real_db.json';
import { parseDictaPayload, type DictaReference } from '@/composables/dictaBridge';
import { analyzeDictaImage, type DictaParallelItem } from '@/composables/dictaApi';
import type { RealDb, RollInstructions, TorahRef } from '@/types';

interface HomeTargetItem {
  key: string;
  group?: string;
  specific?: 'both' | 'gola' | 'israel';
  type?: 'parasha' | 'holyday';
  ref: TorahRef;
  refEndPartial?: TorahRef;
  refEnd: TorahRef;
}

interface TutorialStepEntity extends StepEntity {
  id: string;
}

type TutorialKind = 'quick' | 'full';

interface TutorialSnapshot {
  fromPage: number | null;
  toPage: number | null;
  fromRef: ManualData | null;
  toRef: ManualData | null;
  fromTargetKey: string | null;
  toTargetKey: string | null;
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
const monthlyReadingsStore = useMonthlyReadingsStore();
const { monthlyReadings } = storeToRefs(monthlyReadingsStore);
const { t, locale } = useI18n();
const router = useRouter();
const route = useRoute();
const { smAndDown } = useDisplay();
const { isRtl } = useRtl();
const db = realDb as RealDb;
const onboardingWrapper = ref();
const {
  start: startOnboarding,
  finish: finishOnboarding,
  goToStep: goToOnboardingStep,
} = useVOnboarding(onboardingWrapper);
const fromRef = ref<ManualData | null>(null);
const toRef = ref<ManualData | null>(null);
const fromTargetKey = ref<string | null>(null);
const toTargetKey = ref<string | null>(null);
const calendarNeedsExpandedHeight = ref<Record<'from' | 'to', boolean>>({
  from: false,
  to: false,
});

const targetsOpen = ref(false);
const activeSide = ref<'from' | 'to'>('to');
const activeTutorial = ref<TutorialKind | null>(null);
const activeTutorialStepId = ref<string | null>(null);
const activeTutorialSource = ref('home-page');
const tutorialStartedAt = ref<number | null>(null);
const tutorialHighestStep = ref(1);
const isTutorialActive = ref(false);
const tutorialSnapshot = ref<TutorialSnapshot | null>(null);
const pendingTutorialNavigation = ref<'about' | null>(null);

interface LocationSelectorExposed {
  openManualDialog: () => void;
  closeManualDialog: () => void;
  openPagePreview: () => void;
  closePagePreview: () => void;
}

const fromLocationSelectorRef = ref<LocationSelectorExposed | null>(null);
const toLocationSelectorRef = ref<LocationSelectorExposed | null>(null);

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

const balanceCalendarCardHeight = computed(() => {
  if (smAndDown.value) return false;
  return calendarNeedsExpandedHeight.value.from || calendarNeedsExpandedHeight.value.to;
});

const roll = ref<RollInstructions | null>(null);

const onCalendarExpandedHeightChange = (side: 'from' | 'to', requiresExpandedHeight: boolean) => {
  calendarNeedsExpandedHeight.value = {
    ...calendarNeedsExpandedHeight.value,
    [side]: requiresExpandedHeight,
  };
};

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
  }, options.isInGola);
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

const cloneManualData = (value: ManualData | null): ManualData | null => {
  return value ? { ...value } : null;
};

const captureTutorialSnapshot = (): void => {
  if (tutorialSnapshot.value) return;

  tutorialSnapshot.value = {
    fromPage: options.fromPage,
    toPage: options.toPage,
    fromRef: cloneManualData(fromRef.value),
    toRef: cloneManualData(toRef.value),
    fromTargetKey: fromTargetKey.value,
    toTargetKey: toTargetKey.value,
  };
};

const restoreTutorialSnapshot = (): void => {
  const snapshot = tutorialSnapshot.value;
  if (!snapshot) return;

  onSetFromPage(snapshot.fromPage, cloneManualData(snapshot.fromRef), snapshot.fromTargetKey);
  onSetToPage(snapshot.toPage, cloneManualData(snapshot.toRef), snapshot.toTargetKey);
  tutorialSnapshot.value = null;
};

const getSingleQueryValue = (value: unknown): string | null => {
  if (Array.isArray(value)) {
    return typeof value[0] === 'string' ? value[0] : null;
  }

  return typeof value === 'string' ? value : null;
};

const clearTutorialQuery = (): void => {
  const tutorialQuery = getSingleQueryValue(route.query.tutorial);
  const sourceQuery = getSingleQueryValue(route.query.source);

  if (!tutorialQuery && !sourceQuery) {
    return;
  }

  const nextQuery = {
    ...route.query,
  };

  delete nextQuery.tutorial;
  delete nextQuery.source;

  void router.replace({ query: nextQuery });
};

const getTutorialProgressPercent = (highestStep: number, totalSteps: number): number => {
  return Math.round((highestStep / totalSteps) * 100);
};

const getTutorialDurationSeconds = (): number => {
  if (tutorialStartedAt.value == null) {
    return 0;
  }

  return Math.max(0, Math.round((Date.now() - tutorialStartedAt.value) / 1000));
};

const isTutorialElementVisible = (element: HTMLElement): boolean => {
  const style = window.getComputedStyle(element);
  if (style.display === 'none' || style.visibility === 'hidden') {
    return false;
  }

  const rect = element.getBoundingClientRect();
  if (rect.width <= 0 || rect.height <= 0) {
    return false;
  }

  return (
    rect.bottom > 0 &&
    rect.right > 0 &&
    rect.top < window.innerHeight &&
    rect.left < window.innerWidth
  );
};

const getVisibleTutorialElement = (selector: string): HTMLElement | null => {
  for (const candidate of Array.from(document.querySelectorAll(selector))) {
    if (!(candidate instanceof HTMLElement)) continue;
    if (isTutorialElementVisible(candidate)) return candidate;
  }

  const fallback = document.querySelector(selector);
  return fallback instanceof HTMLElement ? fallback : null;
};

const waitForTutorialElement = async (selector: string, attempts = 12): Promise<HTMLElement | null> => {
  for (let attempt = 0; attempt < attempts; attempt += 1) {
    const element = getVisibleTutorialElement(selector);
    if (element) return element;

    await nextTick();
    await wait(80);
  }

  return null;
};

const waitForTutorialElementToDisappear = async (selector: string, attempts = 12): Promise<void> => {
  for (let attempt = 0; attempt < attempts; attempt += 1) {
    if (!getVisibleTutorialElement(selector)) {
      return;
    }

    await nextTick();
    await wait(80);
  }
};

const clickTutorialElement = async (selector: string): Promise<boolean> => {
  const element = await waitForTutorialElement(selector, 8);
  if (!element) return false;

  element.click();
  await nextTick();
  await wait(120);
  return true;
};

const pressEscape = (): void => {
  const keyboardEventOptions = {
    key: 'Escape',
    bubbles: true,
    cancelable: true,
  };

  window.dispatchEvent(new KeyboardEvent('keydown', keyboardEventOptions));
  document.dispatchEvent(new KeyboardEvent('keydown', keyboardEventOptions));
};

const resolveTutorialTarget = (selector: string, fallbackSelector?: string) => {
  return () => {
    const primaryElement = getVisibleTutorialElement(selector);
    if (primaryElement) {
      return primaryElement;
    }

    return fallbackSelector ? getVisibleTutorialElement(fallbackSelector) : null;
  };
};

const rememberTutorialStep = (stepNumber: number): void => {
  tutorialHighestStep.value = Math.max(tutorialHighestStep.value, stepNumber);
};

const closeLanguageMenu = async (): Promise<void> => {
  closeTutorialLanguageMenu();
  await nextTick();
  if (getVisibleTutorialElement('.tutorial-language-menu')) {
    pressEscape();
    await nextTick();
  }
  await waitForTutorialElementToDisappear('.tutorial-language-menu');
};

const openLanguageMenuForTutorial = async (): Promise<void> => {
  openTutorialLanguageMenu();
  await nextTick();
  await waitForTutorialElement('.tutorial-language-menu');
};

const getLocationSelectorRef = (side: 'from' | 'to'): LocationSelectorExposed | null => {
  return side === 'from' ? fromLocationSelectorRef.value : toLocationSelectorRef.value;
};

const openManualDialogFor = async (side: 'from' | 'to'): Promise<void> => {
  const selectorRef = getLocationSelectorRef(side);

  if (selectorRef) {
    selectorRef.openManualDialog();
    await nextTick();
  } else {
    await clickTutorialElement(`[data-tutorial="${side}-input"]`);
  }

  await waitForTutorialElement('[data-tutorial="manual-dialog"]');
  await wait(120);
};

const closeManualDialog = async (): Promise<void> => {
  fromLocationSelectorRef.value?.closeManualDialog();
  toLocationSelectorRef.value?.closeManualDialog();
  await nextTick();

  const closeButton = getVisibleTutorialElement('[data-tutorial="manual-close"]');
  if (closeButton) {
    closeButton.click();
    await nextTick();
  } else {
    pressEscape();
  }
  await nextTick();
  await waitForTutorialElementToDisappear('[data-tutorial="manual-dialog"]');
};

const openPreviewFor = async (side: 'from' | 'to'): Promise<void> => {
  const selectorRef = getLocationSelectorRef(side);

  if (selectorRef) {
    selectorRef.openPagePreview();
    await nextTick();
  } else {
    const opened =
      await clickTutorialElement(`[data-tutorial="${side}-page-preview-trigger"] .location-page-number-btn`) ||
      await clickTutorialElement(`[data-tutorial="${side}-page-preview-trigger"] button`);

    if (!opened) return;
  }

  await waitForTutorialElement('[data-tutorial="page-preview-dialog"]');
  await wait(120);
};

const closePreviewDialog = async (): Promise<void> => {
  fromLocationSelectorRef.value?.closePagePreview();
  toLocationSelectorRef.value?.closePagePreview();
  await nextTick();

  const closeButton = getVisibleTutorialElement('[data-tutorial="page-preview-close"]');
  if (closeButton) {
    closeButton.click();
    await nextTick();
  } else {
    pressEscape();
  }
  await nextTick();
  await waitForTutorialElementToDisappear('[data-tutorial="page-preview-dialog"]');
};

const openSettingsDialog = async (): Promise<void> => {
  await clickTutorialElement('[data-tutorial="settings-button"]');
  await waitForTutorialElement('[data-tutorial="settings-dialog"]');
  await wait(120);
};

const closeSettingsDialog = async (): Promise<void> => {
  const closeButton = getVisibleTutorialElement('[data-tutorial="settings-close"]');
  if (closeButton) {
    closeButton.click();
  } else {
    pressEscape();
  }
  await nextTick();
  await waitForTutorialElementToDisappear('[data-tutorial="settings-dialog"]');
};

const openNavDrawerIfNeeded = async (): Promise<void> => {
  if (!smAndDown.value) return;
  if (getVisibleTutorialElement('[data-tutorial="about-nav"]')) return;

  await clickTutorialElement('[data-tutorial="menu-button"]');
  await waitForTutorialElement('[data-tutorial="about-nav"]');
  await wait(120);
};

const closeNavDrawer = async (): Promise<void> => {
  if (!smAndDown.value) return;
  if (!getVisibleTutorialElement('[data-tutorial="about-nav"]')) return;

  pressEscape();
  await nextTick();
  await waitForTutorialElementToDisappear('[data-tutorial="about-nav"]');
};

const openTargetsForTutorial = async (side: 'from' | 'to'): Promise<void> => {
  openTargets(side);
  await nextTick();
  await waitForTutorialElement('[data-tutorial="target-overlay"]');
  await wait(120);
};

const closeTargetsForTutorial = async (): Promise<void> => {
  if (!targetsOpen.value) return;

  targetsOpen.value = false;
  await nextTick();
  await waitForTutorialElementToDisappear('[data-tutorial="target-overlay"]');
};

const openDictaForTutorial = async (side: 'from' | 'to'): Promise<void> => {
  openDictaCaptureForSide(side);
  await nextTick();
  await waitForTutorialElement('[data-tutorial="dicta-dialog"]');
  await wait(120);
};

const closeDictaForTutorial = async (): Promise<void> => {
  let didClose = false;

  if (dictaChoiceOpen.value) {
    onDictaChoiceCancel();
    didClose = true;
  }

  if (dictaOpen.value) {
    closeDictaDialog();
    didClose = true;
  }

  if (!didClose) return;

  await nextTick();
  await waitForTutorialElementToDisappear('[data-tutorial="dicta-dialog"]');
};

const closeTutorialOverlays = async (
  closeOptions: { keepLanguageMenu?: boolean; keepNavDrawer?: boolean } = {}
): Promise<void> => {
  await closeTargetsForTutorial();
  await closeDictaForTutorial();
  await closeManualDialog();
  await closePreviewDialog();
  await closeSettingsDialog();

  if (!closeOptions.keepLanguageMenu) {
    await closeLanguageMenu();
  }

  if (!closeOptions.keepNavDrawer) {
    await closeNavDrawer();
  }

  await nextTick();
  await wait(80);
};

const resolveTutorialReadingTarget = (readingId: string): HomeTargetItem | null => {
  const pairedReadingIds = splitPairedParashaReadingId(readingId);
  if (!pairedReadingIds) {
    return findReadingTargetByKey(readingId, options.isInGola) as HomeTargetItem | null;
  }

  const [startReadingId, endReadingId] = pairedReadingIds;
  const startTarget = findReadingTargetByKey(startReadingId, options.isInGola) as HomeTargetItem | null;
  const endTarget = findReadingTargetByKey(endReadingId, options.isInGola) as HomeTargetItem | null;

  if (!startTarget || !endTarget) return null;

  return {
    ...startTarget,
    key: readingId,
    type: 'parasha',
    ref: startTarget.ref,
    refEndPartial: startTarget.refEndPartial,
    refEnd: endTarget.refEnd,
  };
};

const getTutorialOrderedTargets = (side: 'from' | 'to', preferParasha = false): HomeTargetItem[] => {
  const sourceReadings = [
    ...(side === 'from' ? monthlyReadings.value.lastMonth : monthlyReadings.value.nextMonth),
  ];

  sourceReadings.sort((left, right) => {
    const leftDate = side === 'from'
      ? left.dates[left.dates.length - 1] ?? ''
      : left.dates[0] ?? '';
    const rightDate = side === 'from'
      ? right.dates[right.dates.length - 1] ?? ''
      : right.dates[0] ?? '';

    return side === 'from'
      ? rightDate.localeCompare(leftDate)
      : leftDate.localeCompare(rightDate);
  });

  return sourceReadings
    .map((reading) => resolveTutorialReadingTarget(reading.readingId))
    .filter((target): target is HomeTargetItem => Boolean(target))
    .filter((target) => !preferParasha || target.type === 'parasha');
};

const selectTutorialTarget = (side: 'from' | 'to', target: HomeTargetItem): boolean => {
  const targetRef = getDefaultRefForSide(target, side);
  const refData = toManualData(targetRef);

  if (side === 'from') {
    onSetFromPage(targetRef.page, refData, target.key);
  } else {
    onSetToPage(targetRef.page, refData, target.key);
  }

  return true;
};

const selectTutorialTargetKey = (side: 'from' | 'to', key: string): boolean => {
  const target = findReadingTargetByKey(key, options.isInGola) as HomeTargetItem | null;
  if (!target) return false;

  return selectTutorialTarget(side, target);
};

const applyTutorialCalendarDemoState = async (): Promise<void> => {
  monthlyReadingsStore.refresh();

  const fromTarget = getTutorialOrderedTargets('from')[0];
  const toTarget = getTutorialOrderedTargets('to', true)[0] ?? getTutorialOrderedTargets('to')[0];

  const hasFromSelection = fromTarget
    ? selectTutorialTarget('from', fromTarget)
    : selectTutorialTargetKey('from', 'pekudei');
  const hasToSelection = toTarget
    ? selectTutorialTarget('to', toTarget)
    : selectTutorialTargetKey('to', 'tazria');

  if (!hasFromSelection && options.fromPage == null) {
    selectTutorialTargetKey('from', 'shemot');
  }

  if (!hasToSelection && options.toPage == null) {
    selectTutorialTargetKey('to', 'vayikra');
  }

  await nextTick();
  await wait(120);
};

const applyLongTutorialResultDemoState = async (): Promise<void> => {
  const hasFromSelection =
    selectTutorialTargetKey('from', 'pekudei') ||
    selectTutorialTargetKey('from', 'vayakhel') ||
    selectTutorialTargetKey('from', 'shemot');
  const hasToSelection =
    selectTutorialTargetKey('to', 'bamidbar') ||
    selectTutorialTargetKey('to', 'tazria') ||
    selectTutorialTargetKey('to', 'vayikra');

  if (!hasFromSelection || !hasToSelection) {
    await applyTutorialCalendarDemoState();
    return;
  }

  await nextTick();
  await wait(120);
};

const prepareTutorialDemoState = async (): Promise<void> => {
  captureTutorialSnapshot();
  await closeTutorialOverlays();
  await applyTutorialCalendarDemoState();
};

interface TutorialStepConfig {
  id: string;
  stepNumber: number;
  selector: string;
  fallbackSelector?: string;
  titleKey: string;
  descriptionKey: string;
  options?: VOnboardingWrapperOptions;
  beforeStep?: () => void | Promise<void>;
  afterStep?: (options?: { isForward: boolean; isBackward: boolean }) => void | Promise<void>;
}

const createTutorialStep = ({
  id,
  stepNumber,
  selector,
  fallbackSelector,
  titleKey,
  descriptionKey,
  options,
  beforeStep,
  afterStep,
}: TutorialStepConfig): TutorialStepEntity => ({
  id,
  attachTo: {
    element: resolveTutorialTarget(selector, fallbackSelector),
  },
  content: {
    title: t(titleKey),
    description: t(descriptionKey),
  },
  options,
  on: {
    beforeStep: async () => {
      activeTutorialStepId.value = id;
      rememberTutorialStep(stepNumber);
      await beforeStep?.();
    },
    afterStep,
  },
});

const interactiveTutorialStepOptions: VOnboardingWrapperOptions = {
  overlay: {
    preventOverlayInteraction: false,
  },
};

const quickTutorialSteps = computed<TutorialStepEntity[]>(() => ([
  createTutorialStep({
    id: 'quick-language-selector',
    stepNumber: 1,
    selector: '[data-tutorial="language-select"] .v-field',
    fallbackSelector: '[data-tutorial="language-selector"]',
    titleKey: 'onboarding.quick.step1.title',
    descriptionKey: 'onboarding.quick.step1.description',
    options: interactiveTutorialStepOptions,
    beforeStep: async () => {
      await closeLanguageMenu();
    },
  }),
  createTutorialStep({
    id: 'quick-language-menu',
    stepNumber: 2,
    selector: '.tutorial-language-menu',
    fallbackSelector: '[data-tutorial="language-selector"]',
    titleKey: 'onboarding.quick.step2.title',
    descriptionKey: 'onboarding.quick.step2.description',
    options: interactiveTutorialStepOptions,
    beforeStep: async () => {
      if (!getVisibleTutorialElement('.tutorial-language-menu')) {
        await openLanguageMenuForTutorial();
      }
    },
    afterStep: async (stepOptions) => {
      if (stepOptions?.isForward || stepOptions?.isBackward) {
        await closeLanguageMenu();
      }
    },
  }),
  createTutorialStep({
    id: 'quick-from',
    stepNumber: 3,
    selector: '[data-tutorial="from-selector"]',
    titleKey: 'onboarding.quick.step3.title',
    descriptionKey: 'onboarding.quick.step3.description',
    beforeStep: async () => {
      await closeLanguageMenu();
    },
    afterStep: async (stepOptions) => {
      if (stepOptions?.isBackward) {
        await openLanguageMenuForTutorial();
      }
    },
  }),
  createTutorialStep({
    id: 'quick-to',
    stepNumber: 4,
    selector: '[data-tutorial="to-selector"]',
    titleKey: 'onboarding.quick.step4.title',
    descriptionKey: 'onboarding.quick.step4.description',
  }),
  createTutorialStep({
    id: 'quick-result',
    stepNumber: 5,
    selector: '[data-tutorial="roll-result"]',
    titleKey: 'onboarding.quick.step5.title',
    descriptionKey: 'onboarding.quick.step5.description',
  }),
]));

const fullTutorialSteps = computed<TutorialStepEntity[]>(() => ([
  createTutorialStep({
    id: 'full-language-selector',
    stepNumber: 1,
    selector: '[data-tutorial="language-select"] .v-field',
    fallbackSelector: '[data-tutorial="language-selector"]',
    titleKey: 'onboarding.full.step1.title',
    descriptionKey: 'onboarding.full.step1.description',
    options: interactiveTutorialStepOptions,
    beforeStep: async () => {
      await closeLanguageMenu();
    },
  }),
  createTutorialStep({
    id: 'full-language-menu',
    stepNumber: 2,
    selector: '.tutorial-language-menu',
    fallbackSelector: '[data-tutorial="language-selector"]',
    titleKey: 'onboarding.full.step2.title',
    descriptionKey: 'onboarding.full.step2.description',
    options: interactiveTutorialStepOptions,
    beforeStep: async () => {
      if (!getVisibleTutorialElement('.tutorial-language-menu')) {
        await openLanguageMenuForTutorial();
      }
    },
    afterStep: async (stepOptions) => {
      if (stepOptions?.isForward || stepOptions?.isBackward) {
        await closeLanguageMenu();
      }
    },
  }),
  createTutorialStep({
    id: 'full-from',
    stepNumber: 3,
    selector: '[data-tutorial="from-selector"]',
    titleKey: 'onboarding.full.step3.title',
    descriptionKey: 'onboarding.full.step3.description',
    beforeStep: async () => {
      await closeLanguageMenu();
      await closeTutorialOverlays();
    },
    afterStep: async (stepOptions) => {
      if (stepOptions?.isBackward) {
        await openLanguageMenuForTutorial();
      }
    },
  }),
  createTutorialStep({
    id: 'full-choose-manually-button',
    stepNumber: 4,
    selector: '[data-tutorial="from-choose-manual"]',
    titleKey: 'onboarding.full.step4.title',
    descriptionKey: 'onboarding.full.step4.description',
    beforeStep: async () => {
      await closeTargetsForTutorial();
    },
    afterStep: async (stepOptions) => {
      if (stepOptions?.isForward) {
        await openTargetsForTutorial('from');
      }

      if (stepOptions?.isBackward) {
        await closeTutorialOverlays();
      }
    },
  }),
  createTutorialStep({
    id: 'full-full-list',
    stepNumber: 5,
    selector: '[data-tutorial="target-search"]',
    fallbackSelector: '[data-tutorial="target-overlay"]',
    titleKey: 'onboarding.full.step5.title',
    descriptionKey: 'onboarding.full.step5.description',
    beforeStep: async () => {
      await openTargetsForTutorial('from');
    },
    afterStep: async (stepOptions) => {
      if (stepOptions?.isForward) {
        await closeTargetsForTutorial();
      }

      if (stepOptions?.isBackward) {
        await closeTargetsForTutorial();
      }
    },
  }),
  createTutorialStep({
    id: 'full-camera-button',
    stepNumber: 6,
    selector: '[data-tutorial="from-photo"]',
    titleKey: 'onboarding.full.step6.title',
    descriptionKey: 'onboarding.full.step6.description',
    beforeStep: async () => {
      await closeTutorialOverlays();
    },
    afterStep: async (stepOptions) => {
      if (stepOptions?.isForward) {
        await openDictaForTutorial('from');
      }

      if (stepOptions?.isBackward) {
        await openTargetsForTutorial('from');
      }
    },
  }),
  createTutorialStep({
    id: 'full-camera',
    stepNumber: 7,
    selector: '[data-tutorial="dicta-dialog"]',
    titleKey: 'onboarding.full.step7.title',
    descriptionKey: 'onboarding.full.step7.description',
    beforeStep: async () => {
      await openDictaForTutorial('from');
    },
    afterStep: async (stepOptions) => {
      if (stepOptions?.isForward) {
        await closeDictaForTutorial();
      }

      if (stepOptions?.isBackward) {
        await closeDictaForTutorial();
      }
    },
  }),
  createTutorialStep({
    id: 'full-input-button',
    stepNumber: 8,
    selector: '[data-tutorial="from-input"]',
    titleKey: 'onboarding.full.step8.title',
    descriptionKey: 'onboarding.full.step8.description',
    beforeStep: async () => {
      await closeTutorialOverlays();
    },
    afterStep: async (stepOptions) => {
      if (stepOptions?.isForward) {
        await openManualDialogFor('from');
      }

      if (stepOptions?.isBackward) {
        await openDictaForTutorial('from');
      }
    },
  }),
  createTutorialStep({
    id: 'full-manual',
    stepNumber: 9,
    selector: '[data-tutorial="manual-dialog"]',
    titleKey: 'onboarding.full.step9.title',
    descriptionKey: 'onboarding.full.step9.description',
    beforeStep: async () => {
      await openManualDialogFor('from');
    },
    afterStep: async (stepOptions) => {
      if (stepOptions?.isForward) {
        await closeManualDialog();
        await applyTutorialCalendarDemoState();
      }

      if (stepOptions?.isBackward) {
        await closeManualDialog();
      }
    },
  }),
  createTutorialStep({
    id: 'full-to',
    stepNumber: 10,
    selector: '[data-tutorial="to-selector"]',
    titleKey: 'onboarding.full.step10.title',
    descriptionKey: 'onboarding.full.step10.description',
    beforeStep: async () => {
      await closeManualDialog();
    },
    afterStep: async (stepOptions) => {
      if (stepOptions?.isForward) {
        await applyLongTutorialResultDemoState();
      }

      if (stepOptions?.isBackward) {
        await openManualDialogFor('from');
      }
    },
  }),
  createTutorialStep({
    id: 'full-reference-point',
    stepNumber: 11,
    selector: '[data-tutorial="to-target-ref"]',
    fallbackSelector: '[data-tutorial="to-page-preview-trigger"]',
    titleKey: 'onboarding.full.step11.title',
    descriptionKey: 'onboarding.full.step11.description',
    beforeStep: async () => {
      await applyLongTutorialResultDemoState();
    },
    afterStep: async (stepOptions) => {
      if (stepOptions?.isBackward) {
        await applyTutorialCalendarDemoState();
      }
    },
  }),
  createTutorialStep({
    id: 'full-result',
    stepNumber: 12,
    selector: '[data-tutorial="roll-result"]',
    titleKey: 'onboarding.full.step12.title',
    descriptionKey: 'onboarding.full.step12.description',
    beforeStep: async () => {
      await applyLongTutorialResultDemoState();
    },
  }),
  createTutorialStep({
    id: 'full-remaining-after-book',
    stepNumber: 13,
    selector: '[data-tutorial="result-book-remaining"]',
    fallbackSelector: '[data-tutorial="roll-result"]',
    titleKey: 'onboarding.full.step13.title',
    descriptionKey: 'onboarding.full.step13.description',
    beforeStep: async () => {
      await applyLongTutorialResultDemoState();
    },
  }),
  createTutorialStep({
    id: 'full-preview-trigger',
    stepNumber: 14,
    selector: '[data-tutorial="to-page-preview-trigger"]',
    titleKey: 'onboarding.full.step14.title',
    descriptionKey: 'onboarding.full.step14.description',
    beforeStep: async () => {
      await closePreviewDialog();
    },
    afterStep: async (stepOptions) => {
      if (stepOptions?.isForward) {
        await openPreviewFor('to');
      }

      if (stepOptions?.isBackward) {
        await closePreviewDialog();
      }
    },
  }),
  createTutorialStep({
    id: 'full-preview',
    stepNumber: 15,
    selector: '[data-tutorial="page-preview-dialog"]',
    titleKey: 'onboarding.full.step15.title',
    descriptionKey: 'onboarding.full.step15.description',
    beforeStep: async () => {
      await openPreviewFor('to');
    },
    afterStep: async (stepOptions) => {
      if (stepOptions?.isForward) {
        await closePreviewDialog();
      }

      if (stepOptions?.isBackward) {
        await closePreviewDialog();
      }
    },
  }),
  createTutorialStep({
    id: 'full-settings-button',
    stepNumber: 16,
    selector: '[data-tutorial="settings-button"]',
    titleKey: 'onboarding.full.step16.title',
    descriptionKey: 'onboarding.full.step16.description',
    beforeStep: async () => {
      await closeSettingsDialog();
    },
    afterStep: async (stepOptions) => {
      if (stepOptions?.isForward) {
        await openSettingsDialog();
      }

      if (stepOptions?.isBackward) {
        await openPreviewFor('to');
      }
    },
  }),
  createTutorialStep({
    id: 'full-settings',
    stepNumber: 17,
    selector: '[data-tutorial="settings-dialog"]',
    titleKey: 'onboarding.full.step17.title',
    descriptionKey: 'onboarding.full.step17.description',
    beforeStep: async () => {
      await openSettingsDialog();
    },
    afterStep: async (stepOptions) => {
      if (stepOptions?.isForward) {
        await closeSettingsDialog();
      }

      if (stepOptions?.isBackward) {
        await closeSettingsDialog();
      }
    },
  }),
  createTutorialStep({
    id: 'full-navigation',
    stepNumber: 18,
    selector: smAndDown.value ? '[data-tutorial="menu-button"]' : '[data-tutorial="top-nav-links"]',
    fallbackSelector: '[data-tutorial="menu-button"]',
    titleKey: 'onboarding.full.step18.title',
    descriptionKey: 'onboarding.full.step18.description',
    beforeStep: async () => {
      await closeSettingsDialog();
      await closeNavDrawer();
    },
    afterStep: async (stepOptions) => {
      if (stepOptions?.isForward) {
        await openNavDrawerIfNeeded();
      }

      if (stepOptions?.isBackward) {
        await closeNavDrawer();
        await openSettingsDialog();
      }
    },
  }),
  createTutorialStep({
    id: 'full-about',
    stepNumber: 19,
    selector: '[data-tutorial="about-nav"]',
    titleKey: 'onboarding.full.step19.title',
    descriptionKey: 'onboarding.full.step19.description',
    beforeStep: async () => {
      await openNavDrawerIfNeeded();
      await waitForTutorialElement('[data-tutorial="about-nav"]');
    },
    afterStep: async (stepOptions) => {
      if (stepOptions?.isBackward) {
        await closeNavDrawer();
        return;
      }

      await closeNavDrawer();
    },
  }),
]));

const isTutorialPrimaryActionDisabled = computed(() => {
  return (
    activeTutorialStepId.value === 'quick-language-selector' ||
    activeTutorialStepId.value === 'full-language-selector'
  );
});

const isTutorialInteractiveStep = computed(() => {
  return (
    activeTutorialStepId.value === 'quick-language-selector' ||
    activeTutorialStepId.value === 'quick-language-menu' ||
    activeTutorialStepId.value === 'full-language-selector' ||
    activeTutorialStepId.value === 'full-language-menu'
  );
});

watch(isLanguageMenuOpen, (isOpen) => {
  if (!isTutorialActive.value) return;

  if (
    isOpen &&
    (activeTutorialStepId.value === 'quick-language-selector' || activeTutorialStepId.value === 'full-language-selector')
  ) {
    goToOnboardingStep((currentStepIndex) => currentStepIndex + 1);
  }
});

watch(() => locale.value, (nextLocale, previousLocale) => {
  if (!isTutorialActive.value) return;
  if (!previousLocale || nextLocale === previousLocale) return;

  if (
    activeTutorialStepId.value === 'quick-language-menu' ||
    activeTutorialStepId.value === 'full-language-menu'
  ) {
    goToOnboardingStep((currentStepIndex) => currentStepIndex + 1);
  }
});

const currentTutorialSteps = computed<TutorialStepEntity[]>(() => {
  if (activeTutorial.value === 'quick') {
    return quickTutorialSteps.value;
  }

  if (activeTutorial.value === 'full') {
    return fullTutorialSteps.value;
  }

  return [];
});

const onboardingOptions = computed<VOnboardingWrapperOptions>(() => ({
  overlay: {
    enabled: true,
    padding: 10,
    borderRadius: 18,
    preventOverlayInteraction: true,
  },
  hideNextStepDuringHook: true,
  scrollToStep: {
    enabled: true,
    options: {
      behavior: 'smooth',
      block: 'center',
      inline: 'center',
    },
  },
}));

const getTutorialStepCount = (tutorial: TutorialKind): number => {
  return tutorial === 'quick' ? quickTutorialSteps.value.length : fullTutorialSteps.value.length;
};

const startTutorial = async (tutorial: TutorialKind, source = 'home-page'): Promise<void> => {
  if (isTutorialActive.value) {
    return;
  }

  activeTutorial.value = tutorial;
  activeTutorialStepId.value = null;
  activeTutorialSource.value = source;
  tutorialStartedAt.value = Date.now();
  tutorialHighestStep.value = 1;
  isTutorialActive.value = true;
  pendingTutorialNavigation.value = null;

  markTutorialStarted(tutorial);
  await nextTick();
  await prepareTutorialDemoState();
  await nextTick();

  const totalSteps = getTutorialStepCount(tutorial);
  trackTutorialEvent({
    tutorial,
    action: 'open',
    step: 1,
    totalSteps,
    progressPercent: getTutorialProgressPercent(1, totalSteps),
    source,
  });

  startOnboarding();
};

const finalizeTutorial = async (): Promise<void> => {
  const tutorial = activeTutorial.value;
  const pendingNavigation = pendingTutorialNavigation.value;
  pendingTutorialNavigation.value = null;

  if (!tutorial) {
    await closeTutorialOverlays();
    restoreTutorialSnapshot();
    activeTutorialStepId.value = null;
    clearTutorialQuery();
    if (pendingNavigation === 'about') {
      await router.push({ name: 'about' });
    }
    return;
  }

  const totalSteps = getTutorialStepCount(tutorial);
  trackTutorialEvent({
    tutorial,
    action: 'close',
    step: tutorialHighestStep.value,
    totalSteps,
    progressPercent: getTutorialProgressPercent(tutorialHighestStep.value, totalSteps),
    durationSeconds: getTutorialDurationSeconds(),
    source: activeTutorialSource.value,
  });

  activeTutorial.value = null;
  activeTutorialSource.value = 'home-page';
  tutorialStartedAt.value = null;
  tutorialHighestStep.value = 1;
  isTutorialActive.value = false;
  activeTutorialStepId.value = null;

  await closeTutorialOverlays();
  restoreTutorialSnapshot();
  clearTutorialQuery();

  if (pendingNavigation === 'about') {
    await router.push({ name: 'about' });
  }
};

const requestTutorialExit = (): void => {
  finishOnboarding();
};

const onTutorialPrimaryAction = (isLast: boolean, next: () => void): void => {
  if (!isLast) {
    next();
    return;
  }

  if (activeTutorialStepId.value === 'full-about') {
    pendingTutorialNavigation.value = 'about';
  }

  finishOnboarding();
};

const onOnboardingFinish = (): void => {
  void finalizeTutorial();
};

const onOnboardingExit = (): void => {
  void finalizeTutorial();
};

const maybeStartTutorialFromRoute = async (): Promise<void> => {
  const tutorialQuery = getSingleQueryValue(route.query.tutorial);
  const source = getSingleQueryValue(route.query.source) ?? 'route-query';

  if (route.name !== 'home' || isTutorialActive.value) {
    return;
  }

  if (tutorialQuery !== 'quick' && tutorialQuery !== 'full') {
    return;
  }

  await startTutorial(tutorialQuery, source);
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

watch(
  () => route.query.tutorial,
  () => {
    void maybeStartTutorialFromRoute();
  },
  { immediate: true },
);

onMounted(() => {
  void maybeStartTutorialFromRoute();
});

onUnmounted(() => {
  if (activeTutorial.value) {
    const totalSteps = getTutorialStepCount(activeTutorial.value);

    trackTutorialEvent({
      tutorial: activeTutorial.value,
      action: 'close',
      step: tutorialHighestStep.value,
      totalSteps,
      progressPercent: getTutorialProgressPercent(tutorialHighestStep.value, totalSteps),
      durationSeconds: getTutorialDurationSeconds(),
      source: activeTutorialSource.value,
    });
  }

  restoreTutorialSnapshot();
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

.home-onboarding {
  --v-onboarding-step-z: 2605;
  --v-onboarding-overlay-z: 2600;
  --v-onboarding-overlay-fill: rgba(8, 19, 40, 0.6);
  --v-onboarding-overlay-opacity: 1;
  --v-onboarding-step-arrow-background: white;
}

.home-onboarding--interactive[data-v-onboarding-wrapper] {
  pointer-events: none !important;
}

.home-onboarding--interactive[data-v-onboarding-wrapper] .onboarding-card {
  pointer-events: auto;
}

.onboarding-card {
  width: min(360px, calc(100vw - 24px));
  padding: 18px;
  border-radius: 20px;
  background: rgba(255, 255, 255, 0.98);
  box-shadow: 0 22px 56px rgba(15, 23, 42, 0.26);
  border: 1px solid rgba(15, 23, 42, 0.08);
  display: grid;
  gap: 14px;
}

.onboarding-card__topline {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 10px;
}

.onboarding-card__eyebrow {
  font-size: 0.78rem;
  font-weight: 700;
  letter-spacing: 0.05em;
  text-transform: uppercase;
  color: rgba(18, 48, 99, 0.76);
}

.onboarding-card__progress {
  font-size: 0.82rem;
  color: rgba(15, 23, 42, 0.65);
}

.onboarding-card__title {
  margin: 0;
  font-size: 1.08rem;
  line-height: 1.35;
}

.onboarding-card__description {
  margin: 0;
  color: rgba(15, 23, 42, 0.82);
  line-height: 1.55;
}

.onboarding-card__actions {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 10px;
}

.onboarding-card__buttons {
  display: flex;
  align-items: center;
  gap: 8px;
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

  .onboarding-card {
    width: min(340px, calc(100vw - 20px));
    padding: 16px;
  }

  .onboarding-card__actions {
    margin-top: 8px;
    align-items: center;
    justify-content: space-between;
  }

  .onboarding-card__buttons {
    justify-content: flex-end;
  }
}
</style>
