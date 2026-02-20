<template>
  <!-- TODO 15: make the components of a reading the same for calendar and TargetOptionsGrid -->
  <!-- DONE 11: The book (i18n) + perek (+ verse if there is one) should be displayed in the component -->
  <!-- DONE: it is not working when the page was chosen manually -->
  <v-card class="h-100 d-flex flex-column" variant="outlined" style="border-radius: 16px;">
    <v-card-item class="location-card-item">
      <!-- DONE 7.9: fix subtitle hidden by actions. -->
      <div class="location-header">
        <div class="location-text">
          <div class="text-h6 font-weight-bold">{{ $t(`home.${side}.title`) }}</div>
          <div class="text-caption location-subtitle">{{ $t(`home.${side}.subtitle`) }}</div>
        </div>
        <div class="location-actions">
          <v-btn size="small" variant="text" prepend-icon="mdi-format-list-bulleted" @click="$emit('choose-manual')">
            {{ $t('home.actions.choose') }}
          </v-btn>          
          <v-btn size="small" variant="tonal" color="primary" prepend-icon="mdi-camera" @click="$emit('open-dicta')">
            {{ $t('home.actions.photo') }}
          </v-btn>
          <v-btn 
            size="small" 
            variant="tonal" 
            color="secondary" 
            prepend-icon="mdi-pencil" 
            @click="isManualOpen = true"
          >
            {{ $t('home.actions.input') }}
          </v-btn>
        </div>
      </div>
    </v-card-item>

    <v-divider />

    <v-card-text v-if="calendarEntries.length > 0" class="pt-3 pb-2">
      <div class="mt-4" style="display: grid; min-width: 0;">
        <div class="d-flex align-center text-caption text-medium-emphasis mb-2">
          <v-icon size="14" class="me-1">mdi-calendar-month-outline</v-icon>
          <span>{{ $t(`home.calendar.${side}`) }}</span>
        </div>

        <v-slide-group show-arrows class="calendar-slide-group">
          <v-slide-group-item
            v-for="entry in calendarEntries"
            :key="`${side}-${entry.key}-${entry.dateIso}`"
          >
            <v-card
              class="calendar-reading-card"
              :class="{ 'calendar-reading-card--active': isSelectedCalendarEntry(entry) }"
              variant="outlined"
              @click="selectCalendarEntry(entry)"
              v-ripple
            >
              <div class="d-flex align-center text-caption text-medium-emphasis">
                <v-icon size="14" class="me-1">mdi-calendar-month-outline</v-icon>
                <span>{{ entry.dateLabel }}</span>
              </div>

              <div class="text-body-2 font-weight-bold text-truncate mt-1 mb-1">
                {{ $t(`readingTargets.${entry.key}`) }}
              </div>

              <div class="d-flex align-center justify-space-between gap-1">
                <div class="text-caption text-medium-emphasis font-weight-medium">
                  {{ entry.target.ref.page }} -> {{ entry.target.refEnd.page }}
                </div>

                <div
                  v-if="getCalendarRollPreview(entry)"
                  :class="`text-${getCalendarRollPreview(entry)?.color} d-flex align-center gap-1 text-caption`"
                >
                  <v-icon size="14">{{ getCalendarRollPreview(entry)?.icon }}</v-icon>
                  <span class="font-weight-bold">{{ getCalendarRollPreview(entry)?.text }}</span>
                </div>
              </div>
            </v-card>
          </v-slide-group-item>
        </v-slide-group>
      </div>
    </v-card-text>

    <v-card-text class="flex-grow-1 d-flex align-center justify-center">
      <!-- TODO 9.5: fix the texts that are one on the other in french (should go over another line?) -->
      <div v-if="page !== null" class="text-center w-100">
        <!-- DONE 4: display the name of the page. Base on the selection if manually selected, or if fits exactly a reading. Else take from json. -->
        <!-- So, there should be a utils method that returns the title id based on the page number, for the case that it doesn't have a selection from the options (TargetOptionsGrid) -->
        <!-- The method checks the readings for a corresponding, and if there isn't, get the page id/ids from page_titles_keys.json. -->
        <!-- When there are multiple ids, join them using / (take from i18n, because hebrew "/" is "\", and english/french "/" is "/"...) -->
        <div class="text-h2 font-weight-black text-primary mb-2">{{ page }}</div>
        <div class="text-caption text-medium-emphasis text-uppercase">{{ $t('page') }}</div>
        
        <div v-if="resolvedPageTitle" class="text-subtitle-1 font-weight-medium mt-2 text-primary">
          {{ resolvedPageTitle }}
        </div>

        <div v-if="targetRefOptions.length > 1" class="mt-2">
          <div class="text-caption text-medium-emphasis mb-2">
            {{ $t('home.targetRef.title') }}
          </div>

          <v-btn-toggle
            :model-value="selectedTargetRefMode"
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

        <v-btn class="mt-4" size="small" color="error" variant="text" @click="clear">
          {{ $t('home.actions.clear') }}
        </v-btn>
      </div>

      <div v-else class="text-center text-medium-emphasis py-6">
        <v-icon size="48" class="mb-2 opacity-50">mdi-book-open-page-variant-outline</v-icon>
        <div>{{ $t('home.noSelection') }}</div>
      </div>
    </v-card-text>

    <v-card-actions v-if="side === 'to' && allowPhotoForTo" class="bg-grey-lighten-5">
      <small class="text-caption text-medium-emphasis mx-auto">
        {{ $t('home.to.canUsePhoto') }}
      </small>
    </v-card-actions>
    
    <ManualEntryDialog 
      v-model="isManualOpen"
      :initial-data="currentRef"
      :initial-page="page"
      @save="onManualSave"
      @draft="onManualDraft"
    />
  </v-card>
</template>

<script setup lang="ts">
import { ref, computed, watch } from 'vue';
import { useI18n } from 'vue-i18n';
import { storeToRefs } from 'pinia';
import ManualEntryDialog, { type ManualData } from './ManualEntryDialog.vue';
import { computeRoll, getPageTitleKeys } from '@/composables/utils';
import { useOptionsStore } from '@/stores/options';
import { useMonthlyReadingsStore } from '@/stores/monthlyReadings';
import targetsData from '@/data/target_pages.json';
import type { MonthlyReadingEntry } from '@/composables/calendar/calendar';
import { useRtl } from 'vuetify';
import type { TorahRef } from '@/types';

interface TargetItem {
  key: string;
  gola: boolean;
  ref: TorahRef;
  refEndPartial?: TorahRef;
  refEnd: TorahRef;
}

interface CalendarEntry {
  key: string;
  dateIso: string;
  dateLabel: string;
  target: TargetItem;
}

type TargetRefMode = 'ref' | 'refEndPartial' | 'refEnd';

interface TargetRefOption {
  mode: TargetRefMode;
  labelKey: string;
  ref: TorahRef;
}

const props = defineProps({
  side: { type: String as () => 'from' | 'to', required: true },
  page: { type: Number as () => number | null, default: null },
  selectedRef: { type: Object as () => ManualData | null, default: null }, // Received from HomeView
  allowPhotoForTo: { type: Boolean, default: false },
  targetKey: { type: String as () => string | null, default: null },
});

const emit = defineEmits<{
  (e: 'open-dicta'): void;
  (e: 'choose-manual'): void;
  (e: 'manual-set', page: number | null, data?: ManualData, targetKey?: string | null): void; // Updated signature
}>();

const { t, locale } = useI18n();
const { isRtl } = useRtl();
const options = useOptionsStore();
const monthlyReadingsStore = useMonthlyReadingsStore();
const { monthlyReadings } = storeToRefs(monthlyReadingsStore);
const isManualOpen = ref(false);

// Stores the draft/selected book, chapter, verse
const currentRef = ref<ManualData>({
  book: 1,
  chapter: null,
  verse: null
});

const targetsByKey = new Map((targetsData as TargetItem[]).map((target) => [target.key, target]));

const toManualData = (torahRef: TorahRef): ManualData => ({
  book: torahRef.book,
  chapter: torahRef.chapter,
  verse: torahRef.verse,
});

const isSameTorahRef = (
  torahRef: TorahRef,
  page: number | null,
  refData: ManualData | null
) =>
  page === torahRef.page &&
  refData?.chapter != null &&
  refData?.verse != null &&
  refData.book === torahRef.book &&
  refData.chapter === torahRef.chapter &&
  refData.verse === torahRef.verse;

const getTargetRefOptions = (target: TargetItem): TargetRefOption[] => {
  const options: TargetRefOption[] = [
    {
      mode: 'ref',
      labelKey: 'home.targetRef.ref',
      ref: target.ref,
    },
  ];

  if (target.refEndPartial) {
    options.push({
      mode: 'refEndPartial',
      labelKey: 'home.targetRef.refEndPartial',
      ref: target.refEndPartial,
    });
  }

  options.push({
    mode: 'refEnd',
    labelKey: 'home.targetRef.refEnd',
    ref: target.refEnd,
  });

  return options;
};

const getDefaultTargetRefMode = (target: TargetItem, side: 'from' | 'to'): TargetRefMode => {
  if (side === 'from') return target.refEndPartial ? 'refEndPartial' : 'refEnd';
  return 'ref';
};

const getRefForMode = (target: TargetItem, mode: TargetRefMode): TorahRef => {
  if (mode === 'ref') return target.ref;
  if (mode === 'refEndPartial' && target.refEndPartial) return target.refEndPartial;
  return target.refEnd;
};

const formatCalendarDate = (dateIso: string) => {
  const parsedDate = new Date(`${dateIso}T12:00:00`);
  if (Number.isNaN(parsedDate.getTime())) return dateIso;

  return new Intl.DateTimeFormat(locale.value, {
    month: 'short',
    day: 'numeric',
  }).format(parsedDate);
};

const toCalendarEntry = (reading: MonthlyReadingEntry): CalendarEntry | null => {
  const target = targetsByKey.get(reading.readingId);
  if (!target) return null;
  if (target.gola && !options.isInGola) return null;

  const dateIso = props.side === 'from'
    ? reading.dates[reading.dates.length - 1]
    : reading.dates[0];
  if (!dateIso) return null;

  return {
    key: reading.readingId,
    dateIso,
    dateLabel: formatCalendarDate(dateIso),
    target,
  };
};

const isCalendarEntry = (entry: CalendarEntry | null): entry is CalendarEntry => entry !== null;

const calendarEntries = computed(() => {
  const sourceReadings = props.side === 'from'
    ? monthlyReadings.value.lastMonth
    : monthlyReadings.value.nextMonth;

  const mappedEntries = sourceReadings
    .map((reading) => toCalendarEntry(reading))
    .filter(isCalendarEntry);

  return mappedEntries.sort((a, b) =>
    props.side === 'from'
      ? b.dateIso.localeCompare(a.dateIso)
      : a.dateIso.localeCompare(b.dateIso)
  );
});

const isSelectedCalendarEntry = (entry: CalendarEntry) => {
  if (props.targetKey) return props.targetKey === entry.key;
  return props.page === entry.target.ref.page;
};

const matchedTarget = computed(() => {
  if (props.targetKey) {
    const explicitTarget = targetsByKey.get(props.targetKey);
    if (explicitTarget) return explicitTarget;
  }

  if (props.page == null || currentRef.value.chapter == null || currentRef.value.verse == null) {
    return null;
  }

  return (targetsData as TargetItem[]).find((target) =>
    getTargetRefOptions(target).some((option) =>
      isSameTorahRef(option.ref, props.page, currentRef.value)
    )
  ) ?? null;
});

const targetRefOptions = computed(() =>
  matchedTarget.value ? getTargetRefOptions(matchedTarget.value) : []
);

const selectedTargetRefMode = computed<TargetRefMode | null>(() => {
  const selectedOption = targetRefOptions.value.find((option) =>
    isSameTorahRef(option.ref, props.page, currentRef.value)
  );

  return selectedOption?.mode ?? null;
});

const getCalendarRollPreview = (entry: CalendarEntry) => {
  if (props.side !== 'to') return null;
  if (options.fromPage === null || options.fromPage === entry.target.ref.page) return null;

  const roll = computeRoll(options.fromPage, entry.target.ref.page);
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

const selectCalendarEntry = (entry: CalendarEntry) => {
  const defaultMode = getDefaultTargetRefMode(entry.target, props.side);
  const targetRef = getRefForMode(entry.target, defaultMode);
  const refData = toManualData(targetRef);

  currentRef.value = refData;
  emit('manual-set', targetRef.page, refData, entry.target.key);
};

const onTargetRefModeChanged = (mode: TargetRefMode | null) => {
  if (!mode || !matchedTarget.value) return;

  const targetRef = getRefForMode(matchedTarget.value, mode);
  const refData = toManualData(targetRef);

  currentRef.value = refData;
  emit('manual-set', targetRef.page, refData, matchedTarget.value.key);
};

// Sync local state when the prop changes (e.g., selection from TargetOptionsGrid)
watch(() => props.selectedRef, (newRef) => {
  if (newRef) {
    currentRef.value = { ...newRef };
  } else if (props.page === null) {
    // Only reset if page is also cleared, otherwise keep last draft
    currentRef.value = { book: 1, chapter: null, verse: null };
  }
}, { immediate: true });

// Logic for DONE 4 & 11
const computedPageTitle = computed(() => {
  if (props.page === null) return '';

  // Use the updated utility that accepts (page, refData)
  // We pass currentRef.value which contains {book, chapter, verse}
  const keys = getPageTitleKeys(props.page, currentRef.value);
  
  if (keys && keys.length > 0) {
    return keys.map(key => t(key)).join(t('separator'));
  }

  // Last resort: empty (just shows page number)
  return '';
});

const resolvedPageTitle = computed(() => {
  if (computedPageTitle.value) return computedPageTitle.value;
  if (matchedTarget.value) return t(`readingTargets.${matchedTarget.value.key}`);
  return '';
});

const onManualSave = (data: ManualData, page: number) => {
  const matchedManualTarget = (targetsData as TargetItem[]).find((target) =>
    getTargetRefOptions(target).some((option) => isSameTorahRef(option.ref, page, data))
  );

  if (matchedManualTarget) {
    const defaultMode = getDefaultTargetRefMode(matchedManualTarget, props.side);
    const targetRef = getRefForMode(matchedManualTarget, defaultMode);
    const refData = toManualData(targetRef);

    currentRef.value = refData;
    emit('manual-set', targetRef.page, refData, matchedManualTarget.key); // Emit both page and ref data
    return;
  }

  currentRef.value = data;
  emit('manual-set', page, data, null); // Emit both page and ref data
};

// When Typing in Manual Dialog (Draft)
const onManualDraft = (data: ManualData) => {
  if (props.page === null) {
    currentRef.value = data;
  }
};

const clear = () => {
  emit('manual-set', null, undefined);
  // We do NOT clear currentRef here. 
  // This means if the user clears the page, the "Draft" remains in memory 
  // and will appear if they open the input dialog again.
};
</script>

<style scoped>
.gap-2 {
  gap: 8px;
}

.gap-1 {
  gap: 4px;
}

.location-subtitle {
  white-space: normal;
}

.location-header {
  display: flex;
  align-items: flex-start;
  gap: 12px;
  flex-wrap: wrap;
}

.location-text {
  min-width: 0;
  flex: 1 1 320px;
}

.location-actions {
  display: flex;
  gap: 8px;
  flex: 0 1 420px;
  flex-wrap: wrap;
  justify-content: flex-end;
}

.location-actions :deep(.v-btn) {
  white-space: nowrap;
}

.calendar-slide-group {
  margin-inline: -4px;
}

.calendar-reading-card {
  min-width: 166px;
  max-width: 184px;
  padding: 8px 10px;
  margin-inline: 4px;
  cursor: pointer;
  transition: border-color 0.2s ease, transform 0.2s ease;
}

.calendar-reading-card:hover {
  border-color: rgb(var(--v-theme-primary));
  transform: translateY(-2px);
}

.calendar-reading-card--active {
  border-color: rgb(var(--v-theme-primary));
  background-color: rgba(var(--v-theme-primary), 0.08);
}

.target-ref-toggle {
  width: 100%;
}

.target-ref-toggle :deep(.v-btn) {
  flex: 1 1 0;
  min-width: 0;
  text-transform: none;
}

@media (max-width: 900px) {
  .location-text {
    flex-basis: 100%;
  }

  .location-actions {
    width: 100%;
    justify-content: flex-start;
  }
}

@media (max-width: 600px) {
  .location-header {
    flex-direction: column;
  }

  .location-text {
    flex: 0 0 auto;
  }

  .location-actions {
    flex: 0 0 auto;
    width: 100%;
    overflow-x: auto;
    flex-wrap: nowrap;
    -webkit-overflow-scrolling: touch;
    padding-bottom: 2px;
  }

  .calendar-reading-card {
    min-width: 154px;
  }
}
</style>
