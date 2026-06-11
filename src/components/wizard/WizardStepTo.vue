<template>
  <div class="wizard-step-to" :dir="isRtl ? 'rtl' : 'ltr'">
    <!-- Large Target Selection Display -->
    <v-card class="location-display-card mb-6 pa-6 text-center" variant="flat" border>
      <div v-if="wizardStore.toPage !== null">
        <span class="text-overline text-uppercase text-primary">{{ $t('home.to.subtitle') }}</span>
        <h2 class="display-page-number font-weight-black text-primary my-2">
          {{ $t('page') }} {{ wizardStore.toPage }}
        </h2>
        <div v-if="resolvedPageTitle" class="text-subtitle-1 font-weight-medium text-medium-emphasis">
          {{ resolvedPageTitle }}
        </div>
        
        <!-- Target reference options (Start vs End of reading) -->
        <div v-if="targetRefOptions.length > 1" class="mt-4">
          <div class="text-caption text-medium-emphasis mb-2">
            {{ $t('home.targetRef.title') }}
          </div>
          <v-btn-toggle
            v-model="selectedTargetRefMode"
            mandatory
            divided
            density="compact"
            class="target-ref-toggle"
            @update:model-value="onTargetRefModeChanged"
          >
            <v-btn
              v-for="option in targetRefOptions"
              :key="option.mode"
              :value="option.mode"
              size="small"
              variant="text"
              class="text-caption"
            >
              {{ $t(option.labelKey) }}
            </v-btn>
          </v-btn-toggle>
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
        <v-icon size="48" class="mb-2 text-medium-emphasis">mdi-flag-checkered</v-icon>
        <h3 class="text-h6 font-weight-bold">{{ $t('home.to.emptyHint') }}</h3>
      </div>
    </v-card>

    <!-- Choice of Input Methods -->
    <v-row class="mb-6" dense>
      <v-col cols="12" sm="6">
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
      <v-col cols="12" sm="6">
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

    <!-- First Words Search Dialog Trigger -->
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

    <!-- Manual Entry Dialog Trigger -->
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

    <!-- Smart Recommendations Section -->
    <div class="recent-readings-section mb-6">
      <h3 class="text-subtitle-1 font-weight-bold mb-3 d-flex align-center">
        <v-icon size="20" class="me-2 text-medium-emphasis">mdi-arrow-right-circle</v-icon>
        {{ $t('home.calendar.to') }}
      </h3>
      <v-slide-group show-arrows class="py-2">
        <v-slide-group-item
          v-for="entry in calendarEntries"
          :key="`to-${entry.key}-${entry.dateIso}`"
        >
          <ReadingOptionCard
            :reading-key="entry.target.key"
            :reading-label="entry.readingLabel"
            :page="resolvePageForLayout(entry.target.ref.page, layoutKey)"
            :active="isSelectedCalendarEntry(entry)"
            :show-date-icon="true"
            :date-label="entry.dateLabel"
            :roll-preview="getCalendarRollPreview(entry)"
            class="ma-2"
            @click="selectCalendarEntry(entry)"
          />
        </v-slide-group-item>
      </v-slide-group>
    </div>

    <!-- Navigation Buttons -->
    <div class="d-flex justify-space-between pt-4">
      <v-btn 
        variant="text" 
        size="large" 
        prepend-icon="mdi-arrow-left"
        @click="wizardStore.setStep(1)"
      >
        {{ $t('onboarding.actions.back') }}
      </v-btn>
      <v-btn 
        color="primary" 
        size="large" 
        :disabled="wizardStore.toPage === null" 
        append-icon="mdi-calculator"
        @click="wizardStore.setStep(3)"
      >
        {{ $t('onboarding.actions.next') }}
      </v-btn>
    </div>

    <!-- Floating Dialogs -->
    <ManualEntryDialog 
      v-model="isManualOpen"
      :initial-data="wizardStore.toRef || { book: 1, chapter: null, verse: null }"
      :initial-page="wizardStore.toPage"
      @save="onManualSave"
      @open-first-line-search="onOpenFirstLineSearchFromManual"
    />

    <FirstLineSearchDialog
      v-model="isFirstLineSearchOpen"
      side="to"
      source="manual"
      @save="onFirstLineSearchSave"
    />
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
import { getPageTitleKeys, getPageStartRef, computeRoll } from '@/composables/utils';
import { splitPairedParashaReadingId } from '@/composables/calendar/calendar';
import { findReadingTargetByKey, readingTargets, type ReadingTarget } from '@/composables/readingTargets';

import ManualEntryDialog from '@/components/ManualEntryDialog.vue';
import FirstLineSearchDialog from '@/components/FirstLineSearchDialog.vue';
import ReadingOptionCard from '@/components/ReadingOptionCard.vue';

import type { ManualData, TorahRef } from '@/types';

type TargetRefMode = 'ref' | 'refEndPartial' | 'refEnd';

interface CalendarEntry {
  key: string;
  readingLabel: string | null;
  dateIso: string;
  dateLabel: string;
  target: ReadingTarget;
}

interface TargetRefOption {
  mode: TargetRefMode;
  labelKey: string;
  ref: TorahRef;
}

const wizardStore = useWizardStore();
const optionsStore = useOptionsStore();
const monthlyReadingsStore = useMonthlyReadingsStore();
const { monthlyReadings } = storeToRefs(monthlyReadingsStore);
const { isRtl } = useRtl();
const { t, locale } = useI18n();

const { 
  realDb: torahRealDb, 
  pageTitlesKeys: torahPageTitles, 
  layoutKey 
} = useTorahData();

// Input states
const activeInputMethod = ref<'search' | 'manual'>('search');
const isManualOpen = ref(false);
const isFirstLineSearchOpen = ref(false);
const selectedTargetRefMode = ref<TargetRefMode>('ref');

// Title Computation
const resolvedPageTitle = computed(() => {
  if (wizardStore.toPage === null) return '';
  const ref = wizardStore.toRef;
  const keys = getPageTitleKeys(
    wizardStore.toPage,
    ref ? { book: ref.book, chapter: ref.chapter || 1, verse: ref.verse || 1 } : null,
    optionsStore.isInGola,
    torahPageTitles.value
  );
  return keys.map((key) => t(key)).join(t('separator'));
});

const clearSelection = () => {
  wizardStore.setToLocation(null);
};

// Target Reference Point Calculation
const allTargets = readingTargets as ReadingTarget[];

const resolveExplicitTarget = (): ReadingTarget | null => {
  if (!wizardStore.toTargetKey) return null;
  const exactTarget = allTargets.find((t) => t.key === wizardStore.toTargetKey);
  return (exactTarget as ReadingTarget) || null;
};

const targetRefOptions = computed<TargetRefOption[]>(() => {
  const target = resolveExplicitTarget();
  if (!target) return [];

  const list: TargetRefOption[] = [
    { mode: 'ref', labelKey: 'home.targetRef.ref', ref: target.ref },
  ];

  if (target.refEndPartial) {
    list.push({ mode: 'refEndPartial', labelKey: 'home.targetRef.refEndPartial', ref: target.refEndPartial });
  }

  list.push({ mode: 'refEnd', labelKey: 'home.targetRef.refEnd', ref: target.refEnd });
  return list;
});

const onTargetRefModeChanged = (mode: TargetRefMode) => {
  const target = resolveExplicitTarget();
  if (!target) return;

  selectedTargetRefMode.value = mode;
  let selectedRef = target.ref;
  if (mode === 'refEndPartial' && target.refEndPartial) {
    selectedRef = target.refEndPartial;
  } else if (mode === 'refEnd') {
    selectedRef = target.refEnd;
  }

  const page = resolvePageForLayout(selectedRef.page, layoutKey.value);
  wizardStore.setToLocation(page, {
    book: selectedRef.book,
    chapter: selectedRef.chapter,
    verse: selectedRef.verse,
  }, target.key);
};

// Calendar Recommendations
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
  const sourceReadings = monthlyReadings.value.nextMonth;
  const entries: CalendarEntry[] = [];

  for (const reading of sourceReadings) {
    const resolved = resolveCalendarReading(reading.readingId);
    if (resolved && reading.dates[0]) {
      entries.push({
        key: reading.readingId,
        readingLabel: resolved.readingLabel,
        dateIso: reading.dates[0],
        dateLabel: formatCalendarDate(reading.dates[0]),
        target: resolved.target,
      });
    }
  }

  return entries.sort((a, b) => a.dateIso.localeCompare(b.dateIso));
});

const isSelectedCalendarEntry = (entry: CalendarEntry) => {
  return wizardStore.toTargetKey === entry.key;
};

const selectCalendarEntry = (entry: CalendarEntry) => {
  selectedTargetRefMode.value = 'ref';
  const selectedRef = entry.target.ref;
  const page = resolvePageForLayout(selectedRef.page, layoutKey.value);
  wizardStore.setToLocation(page, {
    book: selectedRef.book,
    chapter: selectedRef.chapter,
    verse: selectedRef.verse,
  }, entry.key);
};

const getCalendarRollPreview = (entry: CalendarEntry) => {
  const entryPage = resolvePageForLayout(entry.target.ref.page, layoutKey.value);
  if (optionsStore.fromPage === null || optionsStore.fromPage === entryPage) return null;

  const roll = computeRoll(optionsStore.fromPage, entryPage);
  if (!roll) return null;

  const isForward = roll.rollDirection === 'forward';
  const icon = isRtl.value
    ? (isForward ? 'mdi-arrow-left' : 'mdi-arrow-right')
    : (isForward ? 'mdi-arrow-right' : 'mdi-arrow-left');

  return {
    icon,
    color: isForward ? 'primary' : 'secondary',
    text: t('preview.cols', { count: roll.pages }),
  };
};

// Handlers for manual and search dialogs
const onManualSave = (data: ManualData, page: number) => {
  wizardStore.setToLocation(page, data, null);
};

const onFirstLineSearchSave = (data: ManualData, page: number) => {
  wizardStore.setToLocation(page, data, null);
};

const onOpenFirstLineSearchFromManual = () => {
  isManualOpen.value = false;
  isFirstLineSearchOpen.value = true;
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
