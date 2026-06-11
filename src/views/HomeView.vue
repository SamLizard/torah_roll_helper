<template>
  <v-container fluid class="pa-4">
    <GolaBanner />
    <SavedSettingsBanner />

    <!-- Guided Wizard Layout -->
    <v-row justify="center" class="mb-4">
      <v-col cols="12" md="8">
        <WizardProgress 
          :current-step="wizardStore.currentStep" 
          :max-page-set="wizardStore.fromPage !== null"
          @navigate="wizardStore.setStep"
        />
      </v-col>
    </v-row>

    <v-row justify="center">
      <v-col cols="12" md="8">
        <!-- Transition container for smooth step switching -->
        <v-window v-model="wizardStore.currentStep" disabled>
          <v-window-item :value="1">
            <div data-tutorial="from-selector">
              <WizardStepFrom 
                ref="fromLocationSelectorRef" 
                @choose-manual="openTargets('from')"
              />
            </div>
          </v-window-item>

          <v-window-item :value="2">
            <div data-tutorial="to-selector">
              <WizardStepTo 
                ref="toLocationSelectorRef" 
                @choose-manual="openTargets('to')"
              />
            </div>
          </v-window-item>

          <v-window-item :value="3">
            <div data-tutorial="roll-result">
              <WizardStepResult 
                ref="rollResultRef"
              />
            </div>
          </v-window-item>
        </v-window>
      </v-col>
    </v-row>

    <!-- Global shared modals and overlays -->
    <TargetOptionsGrid
      v-model="targetsOpen"
      :side="activeSide"
      :selected-target-key="(activeSide === 'from' ? wizardStore.fromTargetKey : wizardStore.toTargetKey) ?? undefined"
      :allow-gola="true"
      @select="onTargetSelected"
    />

    <!-- Onboarding wrapper -->
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
          <section class="onboarding-card" :dir="$vuetify.locale.isRtl ? 'rtl' : 'ltr'">
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
import { useDisplay, useRtl } from 'vuetify';
import {
  VOnboardingStep,
  VOnboardingWrapper,
  useVOnboarding,
  type StepEntity,
  type VOnboardingWrapperOptions,
} from 'v-onboarding';

import { useWizardStore } from '@/stores/wizard';
import { useOptionsStore } from '@/stores/options';
import { useMonthlyReadingsStore } from '@/stores/monthlyReadings';
import { useTorahData, resolvePageForLayout } from '@/composables/torahData';
import { findReadingTargetByKey } from '@/composables/readingTargets';
import { markTutorialStarted } from '@/composables/tutorials';
import {
  closeTutorialLanguageMenu,
  openTutorialLanguageMenu,
  closeTutorialNavDrawer,
  openTutorialNavDrawer,
  isLanguageMenuOpen,
} from '@/composables/tutorialUi';
import {
  trackTutorialEvent,
} from '@/composables/analytics';

import WizardProgress from '@/components/wizard/WizardProgress.vue';
import WizardStepFrom from '@/components/wizard/WizardStepFrom.vue';
import WizardStepTo from '@/components/wizard/WizardStepTo.vue';
import WizardStepResult from '@/components/wizard/WizardStepResult.vue';
import GolaBanner from '@/components/GolaBanner.vue';
import SavedSettingsBanner from '@/components/SavedSettingsBanner.vue';
import TargetOptionsGrid from '@/components/TargetOptionsGrid.vue';

import type { ManualData, TorahRef } from '@/types';

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

interface HomeTargetItem {
  key: string;
  ref: TorahRef;
  refEndPartial?: TorahRef;
  refEnd: TorahRef;
  type?: string;
}

// Stores
const wizardStore = useWizardStore();
const optionsStore = useOptionsStore();
const monthlyReadingsStore = useMonthlyReadingsStore();
const { monthlyReadings } = storeToRefs(monthlyReadingsStore);
const { isRtl } = useRtl();
const { t, locale } = useI18n();
const { smAndDown } = useDisplay();
const { layoutKey } = useTorahData();
const router = useRouter();
const route = useRoute();

// Component Refs
const fromLocationSelectorRef = ref<any>(null);
const toLocationSelectorRef = ref<any>(null);
const rollResultRef = ref<any>(null);

// Modal state
const targetsOpen = ref(false);
const activeSide = ref<'from' | 'to'>('from');

// Onboarding & Tutorial State
const onboardingWrapper = ref();
const {
  start: startOnboarding,
  finish: finishOnboarding,
  goToStep: goToOnboardingStep,
} = useVOnboarding(onboardingWrapper);

const activeTutorial = ref<TutorialKind | null>(null);
const activeTutorialStepId = ref<string | null>(null);
const activeTutorialSource = ref('home-page');
const tutorialStartedAt = ref<number | null>(null);
const tutorialHighestStep = ref(1);
const isTutorialActive = ref(false);
const tutorialSnapshot = ref<TutorialSnapshot | null>(null);
const pendingTutorialNavigation = ref<'about' | null>(null);

const openTargets = (side: 'from' | 'to') => {
  activeSide.value = side;
  targetsOpen.value = true;
};

const onTargetSelected = (item: HomeTargetItem) => {
  const selectedRef = activeSide.value === 'from' ? item.refEndPartial ?? item.refEnd : item.ref;
  const newRef: ManualData = {
    book: selectedRef.book,
    chapter: selectedRef.chapter,
    verse: selectedRef.verse,
  };
  const page = resolvePageForLayout(selectedRef.page, layoutKey.value);

  if (activeSide.value === 'from') {
    wizardStore.setFromLocation(page, newRef, item.key);
    wizardStore.setStep(2); // Auto progress to step 2 once FROM selection is made
  } else {
    wizardStore.setToLocation(page, newRef, item.key);
    wizardStore.setStep(3); // Auto progress to step 3 once TO selection is made
  }
  targetsOpen.value = false;
};

// Tutorial State Synchronization
watch(activeTutorialStepId, (stepId) => {
  if (!stepId) return;

  const isFromStep = stepId.includes('from') || 
                     stepId.includes('choose-manually') || 
                     stepId.includes('first-line') || 
                     stepId.includes('camera') || 
                     stepId.includes('input') || 
                     stepId.includes('manual');
  
  const isToStep = stepId.includes('to') || 
                   stepId.includes('reference-point');
  
  const isResultStep = stepId.includes('result') || 
                       stepId.includes('preview') || 
                       stepId.includes('remaining-after-book') ||
                       stepId.includes('settings');

  if (isFromStep) {
    wizardStore.setStep(1);
  } else if (isToStep) {
    wizardStore.setStep(2);
  } else if (isResultStep) {
    wizardStore.setStep(3);
  }
});

// Demo state functions called programmatically by onboarding steps
const onSetFromPage = (page: number | null, data?: ManualData, targetKey?: string | null) => {
  wizardStore.setFromLocation(page, data || undefined, targetKey);
};

const onSetToPage = (page: number | null, data?: ManualData, targetKey?: string | null) => {
  wizardStore.setToLocation(page, data || undefined, targetKey);
};

// Onboarding helpers & target selections
const wait = async (ms: number): Promise<void> => {
  await new Promise<void>((resolve) => setTimeout(resolve, ms));
};

const pressEscape = (): void => {
  const keyboardEventOptions = { key: 'Escape', bubbles: true, cancelable: true };
  window.dispatchEvent(new KeyboardEvent('keydown', keyboardEventOptions));
  document.dispatchEvent(new KeyboardEvent('keydown', keyboardEventOptions));
};

const getVisibleTutorialElement = (selector: string): HTMLElement | null => {
  for (const candidate of Array.from(document.querySelectorAll(selector))) {
    if (!(candidate instanceof HTMLElement)) continue;
    
    // Check visibility
    const style = window.getComputedStyle(candidate);
    if (style.display === 'none' || style.visibility === 'hidden') continue;
    const rect = candidate.getBoundingClientRect();
    if (rect.width > 0 && rect.height > 0) return candidate;
  }
  return null;
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
    if (!getVisibleTutorialElement(selector)) return;
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

const getLocationSelectorRef = (side: 'from' | 'to') => {
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
  } else {
    pressEscape();
  }
  await nextTick();
  await waitForTutorialElementToDisappear('[data-tutorial="manual-dialog"]');
};

const openFirstLineSearchForTutorial = async (side: 'from' | 'to'): Promise<void> => {
  const selectorRef = getLocationSelectorRef(side);
  if (selectorRef) {
    selectorRef.openFirstLineSearchDialog();
  } else {
    await clickTutorialElement(`[data-tutorial="${side}-first-line"]`);
  }
  await waitForTutorialElement('[data-tutorial="first-line-search-dialog"]');
  await wait(120);
};

const closeFirstLineSearchDialogForTutorial = async (): Promise<void> => {
  fromLocationSelectorRef.value?.closeFirstLineSearchDialog();
  toLocationSelectorRef.value?.closeFirstLineSearchDialog();
  await nextTick();
  await waitForTutorialElementToDisappear('[data-tutorial="first-line-search-dialog"]');
};

const openPreviewFor = async (side: 'from' | 'to'): Promise<void> => {
  const selectorRef = getLocationSelectorRef(side);
  if (selectorRef) {
    selectorRef.openPagePreview();
  } else if (rollResultRef.value) {
    rollResultRef.value.openPreview(side);
  }
  await waitForTutorialElement('[data-tutorial="page-preview-dialog"]');
  await wait(120);
};

const closePreviewDialog = async (): Promise<void> => {
  if (rollResultRef.value) {
    rollResultRef.value.isPreviewOpen = false;
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

  openTutorialNavDrawer();
  await nextTick();
  await waitForNavDrawerToOpen();
  await waitForTutorialElement('[data-tutorial="about-nav"]');
  await wait(120);
};

const waitForNavDrawerToOpen = async (attempts = 16): Promise<void> => {
  if (!smAndDown.value) return;

  for (let attempt = 0; attempt < attempts; attempt += 1) {
    const drawer = document.querySelector('.v-navigation-drawer.v-navigation-drawer--temporary.v-navigation-drawer--active');
    if (drawer instanceof HTMLElement) {
      const rect = drawer.getBoundingClientRect();
      const visibleWidth = Math.min(rect.right, window.innerWidth) - Math.max(rect.left, 0);
      const visibleHeight = Math.min(rect.bottom, window.innerHeight) - Math.max(rect.top, 0);

      if (visibleWidth > rect.width * 0.8 && visibleHeight > rect.height * 0.5) {
        return;
      }
    }
    await nextTick();
    await wait(80);
  }
};

const closeNavDrawer = async (): Promise<void> => {
  if (!smAndDown.value) return;
  closeTutorialNavDrawer();
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
  targetsOpen.value = false;
  await nextTick();
  await waitForTutorialElementToDisappear('[data-tutorial="target-overlay"]');
};

const openDictaForTutorial = async (side: 'from' | 'to'): Promise<void> => {
  // Simulator camera click on Step 1 FROM
  await clickTutorialElement('[data-tutorial="from-photo"]');
  await wait(120);
};

const closeDictaForTutorial = async (): Promise<void> => {
  // Standard escape
  pressEscape();
  await wait(80);
};

const closeTutorialOverlays = async (
  closeOptions: { keepLanguageMenu?: boolean; keepNavDrawer?: boolean } = {}
): Promise<void> => {
  await closeTargetsForTutorial();
  await closeDictaForTutorial();
  await closeManualDialog();
  await closeFirstLineSearchDialogForTutorial();
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
  const target = findReadingTargetByKey(readingId, optionsStore.isInGola);
  return (target as HomeTargetItem) || null;
};

const getTutorialOrderedTargets = (side: 'from' | 'to', preferParasha = false): HomeTargetItem[] => {
  const sourceReadings = [
    ...(side === 'from' ? monthlyReadings.value.lastMonth : monthlyReadings.value.nextMonth),
  ];

  sourceReadings.sort((left, right) => {
    const leftDate = side === 'from' ? left.dates[left.dates.length - 1] ?? '' : left.dates[0] ?? '';
    const rightDate = side === 'from' ? right.dates[right.dates.length - 1] ?? '' : right.dates[0] ?? '';
    return side === 'from' ? rightDate.localeCompare(leftDate) : leftDate.localeCompare(rightDate);
  });

  return sourceReadings
    .map((reading) => resolveTutorialReadingTarget(reading.readingId))
    .filter((target): target is HomeTargetItem => Boolean(target))
    .filter((target) => !preferParasha || target.type === 'parasha');
};

const selectTutorialTarget = (side: 'from' | 'to', target: HomeTargetItem): boolean => {
  const targetRef = side === 'from' ? target.refEndPartial ?? target.refEnd : target.ref;
  const refData = { book: targetRef.book, chapter: targetRef.chapter, verse: targetRef.verse };

  if (side === 'from') {
    onSetFromPage(resolvePageForLayout(targetRef.page, layoutKey.value), refData, target.key);
  } else {
    onSetToPage(resolvePageForLayout(targetRef.page, layoutKey.value), refData, target.key);
  }

  return true;
};

const selectTutorialTargetKey = (side: 'from' | 'to', key: string): boolean => {
  const target = findReadingTargetByKey(key, optionsStore.isInGola) as HomeTargetItem | null;
  if (!target) return false;
  return selectTutorialTarget(side, target);
};

const applyTutorialCalendarDemoState = async (): Promise<void> => {
  monthlyReadingsStore.refresh();

  const fromTarget = getTutorialOrderedTargets('from')[0];
  const toTarget = getTutorialOrderedTargets('to', true)[0] ?? getTutorialOrderedTargets('to')[0];

  const hasFromSelection = fromTarget ? selectTutorialTarget('from', fromTarget) : selectTutorialTargetKey('from', 'pekudei');
  const hasToSelection = toTarget ? selectTutorialTarget('to', toTarget) : selectTutorialTargetKey('to', 'tazria');

  if (!hasFromSelection && optionsStore.fromPage == null) {
    selectTutorialTargetKey('from', 'shemot');
  }

  if (!hasToSelection && optionsStore.toPage == null) {
    selectTutorialTargetKey('to', 'vayikra');
  }

  await nextTick();
  await wait(120);
};

const applyLongTutorialResultDemoState = async (): Promise<void> => {
  const hasFromSelection = selectTutorialTargetKey('from', 'pekudei') || 
                           selectTutorialTargetKey('from', 'vayakhel') || 
                           selectTutorialTargetKey('from', 'shemot');
  const hasToSelection = selectTutorialTargetKey('to', 'nasso') || 
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

const captureTutorialSnapshot = (): void => {
  if (tutorialSnapshot.value) return;

  tutorialSnapshot.value = {
    fromPage: optionsStore.fromPage,
    toPage: optionsStore.toPage,
    fromRef: wizardStore.fromRef ? { ...wizardStore.fromRef } : null,
    toRef: wizardStore.toRef ? { ...wizardStore.toRef } : null,
    fromTargetKey: wizardStore.fromTargetKey,
    toTargetKey: wizardStore.toTargetKey,
  };
};

const restoreTutorialSnapshot = (): void => {
  const snapshot = tutorialSnapshot.value;
  if (!snapshot) return;

  onSetFromPage(snapshot.fromPage, snapshot.fromRef || undefined, snapshot.fromTargetKey);
  onSetToPage(snapshot.toPage, snapshot.toRef || undefined, snapshot.toTargetKey);
  tutorialSnapshot.value = null;
};

// Tutorial step definitions (reused)
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
}: any): TutorialStepEntity => ({
  id,
  attachTo: {
    element: () => {
      const primaryElement = getVisibleTutorialElement(selector);
      if (primaryElement) return primaryElement;
      return fallbackSelector ? getVisibleTutorialElement(fallbackSelector) : null;
    },
  },
  content: {
    title: t(titleKey),
    description: t(descriptionKey),
  },
  options,
  on: {
    beforeStep: async () => {
      activeTutorialStepId.value = id;
      tutorialHighestStep.value = Math.max(tutorialHighestStep.value, stepNumber);
      await beforeStep?.();
    },
    afterStep,
  },
});

const interactiveTutorialStepOptions: VOnboardingWrapperOptions = {
  overlay: { preventOverlayInteraction: false },
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
    beforeStep: async () => { await closeLanguageMenu(); },
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
    afterStep: async (stepOptions: any) => {
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
    beforeStep: async () => { await closeLanguageMenu(); },
    afterStep: async (stepOptions: any) => {
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
    beforeStep: async () => { await closeLanguageMenu(); },
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
    afterStep: async (stepOptions: any) => {
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
    afterStep: async (stepOptions: any) => {
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
    beforeStep: async () => { await closeTargetsForTutorial(); },
    afterStep: async (stepOptions: any) => {
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
    beforeStep: async () => { await openTargetsForTutorial('from'); },
    afterStep: async (stepOptions: any) => {
      await closeTargetsForTutorial();
    },
  }),
  createTutorialStep({
    id: 'full-first-line-button',
    stepNumber: 6,
    selector: '[data-tutorial="from-first-line"]',
    titleKey: 'onboarding.full.step6.title',
    descriptionKey: 'onboarding.full.step6.description',
    beforeStep: async () => { await closeTutorialOverlays(); },
    afterStep: async (stepOptions: any) => {
      if (stepOptions?.isForward) {
        await openFirstLineSearchForTutorial('from');
      }
      if (stepOptions?.isBackward) {
        await openTargetsForTutorial('from');
      }
    },
  }),
  createTutorialStep({
    id: 'full-first-line-search',
    stepNumber: 7,
    selector: '[data-tutorial="first-line-search-dialog"]',
    titleKey: 'onboarding.full.step7.title',
    descriptionKey: 'onboarding.full.step7.description',
    beforeStep: async () => { await openFirstLineSearchForTutorial('from'); },
    afterStep: async (stepOptions: any) => {
      await closeFirstLineSearchDialogForTutorial();
    },
  }),
  createTutorialStep({
    id: 'full-camera-button',
    stepNumber: 8,
    selector: '[data-tutorial="from-photo"]',
    titleKey: 'onboarding.full.step8.title',
    descriptionKey: 'onboarding.full.step8.description',
    beforeStep: async () => { await closeTutorialOverlays(); },
    afterStep: async (stepOptions: any) => {
      if (stepOptions?.isForward) {
        await openDictaForTutorial('from');
      }
      if (stepOptions?.isBackward) {
        await openFirstLineSearchForTutorial('from');
      }
    },
  }),
  createTutorialStep({
    id: 'full-camera',
    stepNumber: 9,
    selector: '[data-tutorial="dicta-dialog"]',
    titleKey: 'onboarding.full.step9.title',
    descriptionKey: 'onboarding.full.step9.description',
    beforeStep: async () => { await openDictaForTutorial('from'); },
    afterStep: async (stepOptions: any) => {
      await closeDictaForTutorial();
    },
  }),
  createTutorialStep({
    id: 'full-input-button',
    stepNumber: 10,
    selector: '[data-tutorial="from-input"]',
    titleKey: 'onboarding.full.step10.title',
    descriptionKey: 'onboarding.full.step10.description',
    beforeStep: async () => { await closeTutorialOverlays(); },
    afterStep: async (stepOptions: any) => {
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
    stepNumber: 11,
    selector: '[data-tutorial="manual-dialog"]',
    titleKey: 'onboarding.full.step11.title',
    descriptionKey: 'onboarding.full.step11.description',
    beforeStep: async () => { await openManualDialogFor('from'); },
    afterStep: async (stepOptions: any) => {
      await closeManualDialog();
      if (stepOptions?.isForward) {
        await applyTutorialCalendarDemoState();
      }
    },
  }),
  createTutorialStep({
    id: 'full-to',
    stepNumber: 12,
    selector: '[data-tutorial="to-selector"]',
    titleKey: 'onboarding.full.step12.title',
    descriptionKey: 'onboarding.full.step12.description',
    beforeStep: async () => { await closeManualDialog(); },
    afterStep: async (stepOptions: any) => {
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
    stepNumber: 13,
    selector: '[data-tutorial="to-target-ref"]',
    fallbackSelector: '[data-tutorial="to-page-preview-trigger"]',
    titleKey: 'onboarding.full.step13.title',
    descriptionKey: 'onboarding.full.step13.description',
    beforeStep: async () => { await applyLongTutorialResultDemoState(); },
    afterStep: async (stepOptions: any) => {
      if (stepOptions?.isBackward) {
        await applyTutorialCalendarDemoState();
      }
    },
  }),
  createTutorialStep({
    id: 'full-result',
    stepNumber: 14,
    selector: '[data-tutorial="roll-result"]',
    titleKey: 'onboarding.full.step14.title',
    descriptionKey: 'onboarding.full.step14.description',
    beforeStep: async () => { await applyLongTutorialResultDemoState(); },
  }),
  createTutorialStep({
    id: 'full-remaining-after-book',
    stepNumber: 15,
    selector: '[data-tutorial="result-book-remaining"]',
    fallbackSelector: '[data-tutorial="roll-result"]',
    titleKey: 'onboarding.full.step15.title',
    descriptionKey: 'onboarding.full.step15.description',
    beforeStep: async () => { await applyLongTutorialResultDemoState(); },
  }),
  createTutorialStep({
    id: 'full-preview-trigger',
    stepNumber: 16,
    selector: '[data-tutorial="to-page-preview-trigger"]',
    titleKey: 'onboarding.full.step16.title',
    descriptionKey: 'onboarding.full.step16.description',
    beforeStep: async () => { await closePreviewDialog(); },
    afterStep: async (stepOptions: any) => {
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
    stepNumber: 17,
    selector: '[data-tutorial="page-preview-dialog"]',
    titleKey: 'onboarding.full.step17.title',
    descriptionKey: 'onboarding.full.step17.description',
    beforeStep: async () => { await openPreviewFor('to'); },
    afterStep: async (stepOptions: any) => {
      await closePreviewDialog();
    },
  }),
  createTutorialStep({
    id: 'full-settings-button',
    stepNumber: 18,
    selector: '[data-tutorial="settings-button"]',
    titleKey: 'onboarding.full.step18.title',
    descriptionKey: 'onboarding.full.step18.description',
    beforeStep: async () => { await closeSettingsDialog(); },
    afterStep: async (stepOptions: any) => {
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
    stepNumber: 19,
    selector: '[data-tutorial="settings-dialog"]',
    titleKey: 'onboarding.full.step19.title',
    descriptionKey: 'onboarding.full.step19.description',
    beforeStep: async () => { await openSettingsDialog(); },
    afterStep: async (stepOptions: any) => {
      await closeSettingsDialog();
    },
  }),
  createTutorialStep({
    id: 'full-navigation',
    stepNumber: 20,
    selector: smAndDown.value ? '[data-tutorial="menu-button"]' : '[data-tutorial="top-nav-links"]',
    fallbackSelector: '[data-tutorial="menu-button"]',
    titleKey: 'onboarding.full.step20.title',
    descriptionKey: 'onboarding.full.step20.description',
    beforeStep: async () => {
      await closeSettingsDialog();
      await closeNavDrawer();
    },
    afterStep: async (stepOptions: any) => {
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
    stepNumber: 21,
    selector: '[data-tutorial="about-nav"]',
    titleKey: 'onboarding.full.step21.title',
    descriptionKey: 'onboarding.full.step21.description',
    beforeStep: async () => {
      await openNavDrawerIfNeeded();
      await waitForTutorialElement('[data-tutorial="about-nav"]');
    },
    afterStep: async (stepOptions: any) => {
      await closeNavDrawer();
    },
  }),
]));

const isTutorialPrimaryActionDisabled = computed(() => {
  return activeTutorialStepId.value === 'quick-language-selector' || 
         activeTutorialStepId.value === 'full-language-selector';
});

const isTutorialInteractiveStep = computed(() => {
  return activeTutorialStepId.value === 'quick-language-selector' || 
         activeTutorialStepId.value === 'quick-language-menu' || 
         activeTutorialStepId.value === 'full-language-selector' || 
         activeTutorialStepId.value === 'full-language-menu';
});

watch(isLanguageMenuOpen, (isOpen) => {
  if (!isTutorialActive.value) return;
  if (isOpen && (activeTutorialStepId.value === 'quick-language-selector' || activeTutorialStepId.value === 'full-language-selector')) {
    goToOnboardingStep((index) => index + 1);
  }
});

watch(() => locale.value, (nextLocale, previousLocale) => {
  if (!isTutorialActive.value) return;
  if (!previousLocale || nextLocale === previousLocale) return;
  if (activeTutorialStepId.value === 'quick-language-menu' || activeTutorialStepId.value === 'full-language-menu') {
    goToOnboardingStep((index) => index + 1);
  }
});

const currentTutorialSteps = computed<TutorialStepEntity[]>(() => {
  return activeTutorial.value === 'quick' ? quickTutorialSteps.value : (activeTutorial.value === 'full' ? fullTutorialSteps.value : []);
});

const onboardingOptions = computed<VOnboardingWrapperOptions>(() => ({
  overlay: { enabled: true, padding: 10, borderRadius: 18, preventOverlayInteraction: true },
  hideNextStepDuringHook: true,
  scrollToStep: { enabled: true, options: { behavior: 'smooth', block: 'center', inline: 'center' } },
}));

const getTutorialStepCount = (tutorial: TutorialKind): number => {
  return tutorial === 'quick' ? quickTutorialSteps.value.length : fullTutorialSteps.value.length;
};

const startTutorial = async (tutorial: TutorialKind, source = 'home-page'): Promise<void> => {
  if (isTutorialActive.value) return;

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
    progressPercent: Math.round((1 / totalSteps) * 100),
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
    if (route.query.tutorial) {
      const nextQuery = { ...route.query };
      delete nextQuery.tutorial;
      delete nextQuery.source;
      void router.replace({ query: nextQuery });
    }
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
    progressPercent: Math.round((tutorialHighestStep.value / totalSteps) * 100),
    durationSeconds: Math.max(0, Math.round((Date.now() - (tutorialStartedAt.value || 0)) / 1000)),
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
  
  if (route.query.tutorial) {
    const nextQuery = { ...route.query };
    delete nextQuery.tutorial;
    delete nextQuery.source;
    void router.replace({ query: nextQuery });
  }

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
  const tutorialQuery = route.query.tutorial;
  const source = (route.query.source as string) || 'route-query';

  if (route.name !== 'home' || isTutorialActive.value) return;
  if (tutorialQuery !== 'quick' && tutorialQuery !== 'full') return;

  await startTutorial(tutorialQuery, source);
};

watch(
  () => route.query.tutorial,
  () => { void maybeStartTutorialFromRoute(); },
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
      progressPercent: Math.round((tutorialHighestStep.value / totalSteps) * 100),
      durationSeconds: Math.max(0, Math.round((Date.now() - (tutorialStartedAt.value || 0)) / 1000)),
      source: activeTutorialSource.value,
    });
  }
  restoreTutorialSnapshot();
});
</script>

<style scoped>
.home-onboarding {
  --v-onboarding-step-z: 2605;
  --v-onboarding-overlay-z: 2600;
  --v-onboarding-overlay-fill: rgba(8, 19, 40, 0.6);
  --v-onboarding-overlay-opacity: 1;
  --v-onboarding-step-arrow-background: #172554;
}

.home-onboarding--interactive[data-v-onboarding-wrapper] {
  pointer-events: none !important;
}

.home-onboarding--interactive[data-v-onboarding-wrapper] .onboarding-card {
  pointer-events: auto;
}

.onboarding-card {
  width: min(360px, calc(100vw - 24px));
  max-width: calc(100vw - 24px);
  padding: 18px;
  border-radius: 20px;
  background: rgba(23, 37, 84, 0.98);
  box-shadow: 0 22px 56px rgba(15, 23, 42, 0.26);
  border: 1px solid rgba(248, 250, 252, 0.12);
  display: grid;
  gap: 14px;
  overflow-wrap: anywhere;
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
  color: #14B8A6;
}

.onboarding-card__progress {
  font-size: 0.82rem;
  color: rgba(248, 250, 252, 0.65);
}

.onboarding-card__title {
  margin: 0;
  font-size: 1.08rem;
  line-height: 1.35;
}

.onboarding-card__description {
  margin: 0;
  color: rgba(248, 250, 252, 0.82);
  line-height: 1.55;
}

.onboarding-card__actions {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 10px;
  flex-wrap: wrap;
}

.onboarding-card__buttons {
  display: flex;
  align-items: center;
  gap: 8px;
  flex-wrap: wrap;
}

@media (max-width: 600px) {
  .onboarding-card {
    width: min(340px, calc(100vw - 20px));
    padding: 16px;
  }
}
</style>
