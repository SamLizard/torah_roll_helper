<template>
  <v-card
    class="h-100 d-flex flex-column"
    variant="outlined"
    style="border-radius: 16px;"
    :data-tutorial="`${side}-selector`"
  >
    <v-card-item class="location-card-item">
      <div class="location-header">
        <div class="location-text">
          <div class="text-h6 font-weight-bold">{{ $t(`home.${side}.title`) }}</div>
          <div class="text-caption location-subtitle">{{ $t(`home.${side}.subtitle`) }}</div>
        </div>
        <div class="location-actions-shell" :data-tutorial="`${side}-actions`">
          <div class="location-actions">
            <v-btn
              size="small"
              variant="text"
              prepend-icon="mdi-format-list-bulleted"
              :data-tutorial="`${side}-choose-manual`"
              @click="onChooseManual"
            >
              {{ $t('home.actions.choose') }}
            </v-btn>
            <v-btn
              v-if="allowPhoto"
              size="small"
              variant="tonal"
              color="primary"
              prepend-icon="mdi-camera"
              :data-tutorial="`${side}-photo`"
              @click="onOpenDicta"
            >
              {{ $t('home.actions.photo') }}
            </v-btn>
            <v-btn 
              size="small" 
              variant="tonal" 
              color="secondary" 
              prepend-icon="mdi-pencil" 
              :data-tutorial="`${side}-input`"
              @click="onOpenManualInput"
            >
              {{ $t('home.actions.input') }}
            </v-btn>
          </div>
        </div>
      </div>
    </v-card-item>

    <v-divider />

    <v-card-text v-if="calendarEntries.length > 0" class="pa-0">
      <div class="location-calendar-frame" :data-tutorial="`${side}-calendar`">
        <div class="location-calendar-section">
          <div ref="calendarSlideShellRef" class="location-calendar-slide-shell">
            <div class="d-flex align-center text-caption text-medium-emphasis mb-2">
              <v-icon size="14" class="me-1">mdi-calendar-month-outline</v-icon>
              <span>{{ $t(`home.calendar.${side}`) }}</span>
            </div>

            <v-slide-group show-arrows class="calendar-slide-group">
              <v-slide-group-item
                v-for="entry in calendarEntries"
                :key="`${side}-${entry.key}-${entry.dateIso}`"
              >
                <ReadingOptionCard
                  :reading-key="entry.target.key"
                  :reading-label="entry.readingLabel"
                  :page="entry.target.ref.page"
                  :active="isSelectedCalendarEntry(entry)"
                  :specific-badge="getTargetBadgeKind(entry.target)"
                  :highlight-next-parasha="isNextParasha(entry)"
                  :show-next-parasha-badge="false"
                  :date-label="entry.dateLabel"
                  :show-date-icon="true"
                  :roll-preview="getCalendarRollPreview(entry)"
                  :compact-calendar="true"
                  :balance-calendar-card-height="balanceCalendarCardHeight"
                  @calendar-compact-change="(compact) => onCalendarCardCompactChange(toCalendarEntryStateKey(entry), compact)"
                  @click="selectCalendarEntry(entry)"
                />
              </v-slide-group-item>
            </v-slide-group>
          </div>
        </div>
      </div>
    </v-card-text>

    <v-card-text class="flex-grow-1 d-flex align-center justify-center">
      <div v-if="page !== null" class="text-center w-100">
        <div
          class="location-page-number-shell mb-2"
          :class="{ 'mod-rtl': isRtl }"
          :data-tutorial="`${side}-page-preview-trigger`"
        >
          <button
            type="button"
            class="location-page-number location-page-number-btn font-weight-black text-primary"
            @click="openPagePreview"
          >
            {{ page }}
          </button>
          <v-btn
            icon="mdi-book-open-page-variant-outline"
            size="small"
            variant="text"
            color="primary"
            class="location-page-preview-btn"
            :aria-label="$t('preview.openPage')"
            @click="openPagePreview"
          />
        </div>
        <div class="text-caption text-medium-emphasis text-uppercase">{{ $t('page') }}</div>
        
        <div v-if="resolvedPageTitle" class="text-subtitle-1 font-weight-medium mt-2 text-primary">
          {{ resolvedPageTitle }}
        </div>

        <div v-if="targetRefOptions.length > 1" class="mt-2" :data-tutorial="`${side}-target-ref`">
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

        <v-btn class="mt-4" size="small" color="error" variant="text" @click="onClear">
          {{ $t('home.actions.clear') }}
        </v-btn>

        <PagePreviewDialog
          v-model="isPagePreviewOpen"
          :page="page"
          :preview-columns="pagePreviewRawColumns"
          :tikkun-url="tikkunUrl"
          @open-tikkun="onOpenTikkun"
        />
      </div>

      <div v-else class="text-center text-medium-emphasis py-6">
        <v-icon size="48" class="mb-2 opacity-50">mdi-book-open-page-variant-outline</v-icon>
        <div>{{ $t('home.noSelection') }}</div>
      </div>
    </v-card-text>
    
    <ManualEntryDialog 
      v-model="isManualOpen"
      :initial-data="currentRef"
      :initial-page="page"
      @save="onManualSave"
      @draft="onManualDraft"
      @open-first-line-search="onOpenFirstLineSearchFromManual"
    />

    <FirstLineSearchDialog
      v-model="isFirstLineSearchOpen"
      :side="side"
      :source="firstLineSearchSource"
      @save="onFirstLineSearchSave"
    />
  </v-card>
</template>

<script setup lang="ts">
import { ref, computed, watch, onUnmounted, nextTick } from 'vue';
import { useI18n } from 'vue-i18n';
import { storeToRefs } from 'pinia';
import ManualEntryDialog from './ManualEntryDialog.vue';
import FirstLineSearchDialog from './FirstLineSearchDialog.vue';
import PagePreviewDialog from './PagePreviewDialog.vue';
import ReadingOptionCard from './ReadingOptionCard.vue';
import { toPreviewColumns } from '@/composables/firstLineSearch';
import { computeRoll, getPageStartRef, getPageTitleKeys } from '@/composables/utils';
import { useOptionsStore } from '@/stores/options';
import { useMonthlyReadingsStore } from '@/stores/monthlyReadings';
import pageFirstLinesData from '@/data/page_first_lines.json';
import realDb from '@/data/real_db.json';
import { trackFromToAction } from '@/composables/analytics';
import {
  splitPairedParashaReadingId,
  type MonthlyReadingEntry,
} from '@/composables/calendar/calendar';
import {
  findReadingTargetByKey,
  getTargetBadgeKind,
  getVisibleReadingTargets,
  matchesTargetSpecific,
  readingTargets,
  type ReadingTarget,
} from '@/composables/readingTargets';
import { useRtl } from 'vuetify';
import type { ManualData, RealDb, TorahRef, Verse } from '@/types';
import { toRefUrl, toTikkunUrl } from '@/composables/tikkunLinks';

type TargetItem = ReadingTarget;

interface CalendarEntry {
  key: string;
  readingLabel: string | null;
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

type FirstLineSearchOpenSource = 'manual' | 'camera-fallback' | 'tutorial';

const props = defineProps({
  side: { type: String as () => 'from' | 'to', required: true },
  page: { type: Number as () => number | null, default: null },
  selectedRef: { type: Object as () => ManualData | null, default: null },
  targetKey: { type: String as () => string | null, default: null },
  balanceCalendarCardHeight: { type: Boolean, default: false },
  allowPhoto: { type: Boolean, default: true },
});

const emit = defineEmits<{
  (e: 'open-dicta'): void;
  (e: 'choose-manual'): void;
  (e: 'manual-set', page: number | null, data?: ManualData, targetKey?: string | null): void;
  (e: 'calendar-requires-expanded-height-change', requiresExpandedHeight: boolean): void;
}>();

const { t, locale } = useI18n();
const { isRtl } = useRtl();
const options = useOptionsStore();
const monthlyReadingsStore = useMonthlyReadingsStore();
const { monthlyReadings } = storeToRefs(monthlyReadingsStore);
const isManualOpen = ref(false);
const isFirstLineSearchOpen = ref(false);
const isPagePreviewOpen = ref(false);
const firstLineSearchSource = ref<FirstLineSearchOpenSource>('manual');
const calendarSlideShellRef = ref<HTMLElement | null>(null);
const compactCalendarCardStates = ref<Record<string, boolean>>({});
const pageFirstLines = pageFirstLinesData as unknown[];
const db = realDb as RealDb;

const MS_PER_DAY = 1000 * 60 * 60 * 24;
const PERSISTED_TARGET_SEPARATOR = ' | ';

const currentRef = ref<ManualData>({
  book: 1,
  chapter: null,
  verse: null
});

const allTargets = readingTargets as TargetItem[];

const visibleTargets = computed(() => getVisibleReadingTargets(options.isInGola) as TargetItem[]);

const resolveCalendarReading = (
  readingId: string
): { target: TargetItem; readingLabel: string | null } | null => {
  const pairedParashaIds = splitPairedParashaReadingId(readingId);
  if (!pairedParashaIds) {
    const target = findReadingTargetByKey(readingId, options.isInGola) as TargetItem | null;
    if (!target) return null;
    return { target, readingLabel: null };
  }

  const [startParashaId, endParashaId] = pairedParashaIds;
  const startParashaTarget = findReadingTargetByKey(startParashaId, options.isInGola) as TargetItem | null;
  const endParashaTarget = findReadingTargetByKey(endParashaId, options.isInGola) as TargetItem | null;
  if (!startParashaTarget || !endParashaTarget) return null;

  return {
    target: {
      ...startParashaTarget,
      key: readingId,
      specific:
        startParashaTarget.specific === endParashaTarget.specific
          ? startParashaTarget.specific
          : 'both',
      ref: startParashaTarget.ref,
      refEndPartial: startParashaTarget.refEndPartial,
      refEnd: endParashaTarget.refEnd,
    },
    readingLabel: `${t(`readingTargets.${startParashaId}`)}-${t(`readingTargets.${endParashaId}`)}`,
  };
};

const toManualData = (torahRef: TorahRef): ManualData => ({
  book: torahRef.book,
  chapter: torahRef.chapter,
  verse: torahRef.verse,
});

const trackAction = (action: string, value?: string | number | null) => {
  trackFromToAction({ side: props.side, action, value });
};

const onChooseManual = () => {
  trackAction('choose-target');
  emit('choose-manual');
};

const onOpenDicta = () => {
  trackAction('photo');
  emit('open-dicta');
};

const onOpenManualInput = () => {
  trackAction('manual-input');
  isManualOpen.value = true;
};

const closeManualInput = () => {
  isManualOpen.value = false;
};

const openFirstLineSearchDialog = (source: FirstLineSearchOpenSource = 'manual') => {
  firstLineSearchSource.value = source;
  trackAction('first-line-search-open', source);
  isFirstLineSearchOpen.value = true;
};

const closeFirstLineSearchDialog = () => {
  isFirstLineSearchOpen.value = false;
};

const onOpenFirstLineSearchFromManual = async () => {
  closeManualInput();
  await nextTick();
  openFirstLineSearchDialog('manual');
};

const getCalendarDayOffset = (dateIso: string): number | null => {
  const pickedDate = new Date(`${dateIso}T12:00:00`);
  if (Number.isNaN(pickedDate.getTime())) return null;

  const today = new Date();
  const currentDate = new Date(today.getFullYear(), today.getMonth(), today.getDate());
  const selectedDate = new Date(pickedDate.getFullYear(), pickedDate.getMonth(), pickedDate.getDate());

  return Math.round((selectedDate.getTime() - currentDate.getTime()) / MS_PER_DAY);
};

const toDayOffsetLabel = (offset: number) => {
  if (offset === 0) return 'today';
  if (offset > 0) return `next-${offset}`;
  return `ago-${Math.abs(offset)}`;
};

const pagePreviewRawColumns = computed<string[][]>(() => {
  if (props.page == null) return [];
  return toPreviewColumns(pageFirstLines[props.page - 1]);
});

const hasCurrentRef = computed(() =>
  currentRef.value.chapter != null && currentRef.value.verse != null
);

const currentRefAsVerse = computed<Verse | null>(() => {
  if (!hasCurrentRef.value) return null;

  return {
    book: currentRef.value.book,
    chapter: currentRef.value.chapter as number,
    verse: currentRef.value.verse as number,
  };
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

const resolveExplicitTarget = (): TargetItem | null => {
  if (!props.targetKey) return null;

  const exactTarget = allTargets.find((target) =>
    target.key === props.targetKey &&
    getTargetRefOptions(target).some((option) =>
      isSameTorahRef(option.ref, props.page, currentRef.value)
    )
  );
  if (exactTarget) return exactTarget;

  const explicitCalendarTarget = resolveCalendarReading(props.targetKey);
  if (explicitCalendarTarget) return explicitCalendarTarget.target;

  return null;
};

const formatTargetTitle = (target: TargetItem): string => {
  const targetTitle = t(`readingTargets.${target.key}`);
  if (target.specific === 'both' || matchesTargetSpecific(target.specific, options.isInGola)) {
    return targetTitle;
  }

  return `${targetTitle}${PERSISTED_TARGET_SEPARATOR}${t(`targets.${target.specific}Badge`)}`;
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
  const resolvedCalendarReading = resolveCalendarReading(reading.readingId);
  if (!resolvedCalendarReading) return null;
  const { target, readingLabel } = resolvedCalendarReading;

  const dateIso = props.side === 'from'
    ? reading.dates[reading.dates.length - 1]
    : reading.dates[0];
  if (!dateIso) return null;

  return {
    key: reading.readingId,
    readingLabel,
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

const nextParashaKey = computed(() => {
  const nextReadings = monthlyReadings.value.nextMonth;

  for (const reading of nextReadings) {
    const resolvedCalendarReading = resolveCalendarReading(reading.readingId);
    if (!resolvedCalendarReading) continue;
    const { target } = resolvedCalendarReading;
    if (target.type === 'parasha') return target.key;
  }

  return null;
});

const isNextParasha = (entry: CalendarEntry) => entry.key === nextParashaKey.value;

const isSelectedCalendarEntry = (entry: CalendarEntry) => {
  if (props.targetKey) {
    const explicitTarget = resolveExplicitTarget();
    if (!explicitTarget) return props.targetKey === entry.key;

    return (
      props.targetKey === entry.key &&
      isSameTorahRef(entry.target.ref, explicitTarget.ref.page, toManualData(explicitTarget.ref))
    );
  }

  return props.page === entry.target.ref.page;
};

const matchedTarget = computed(() => {
  const explicitTarget = resolveExplicitTarget();
  if (explicitTarget) return explicitTarget;

  if (props.page == null || currentRef.value.chapter == null || currentRef.value.verse == null) {
    return null;
  }

  return visibleTargets.value.find((target) =>
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

const tikkunUrl = computed(() => {
  const targetUrl = toTikkunUrl(matchedTarget.value);
  if (targetUrl) return targetUrl;

  if (currentRefAsVerse.value) {
    return toRefUrl(currentRefAsVerse.value);
  }

  if (matchedTarget.value) {
    return toRefUrl(matchedTarget.value.ref);
  }

  const pageStartRef = getPageStartRef(db, props.page);
  if (!pageStartRef) return null;

  return toRefUrl(pageStartRef);
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

const toCalendarEntryStateKey = (entry: CalendarEntry) => `${entry.key}-${entry.dateIso}`;

const emitCalendarRequiresExpandedHeight = () => {
  const requiresExpandedHeight = Object.values(compactCalendarCardStates.value).some(Boolean);
  emit('calendar-requires-expanded-height-change', requiresExpandedHeight);
};

const syncCompactCalendarCardStates = () => {
  const nextState: Record<string, boolean> = {};

  for (const entry of calendarEntries.value) {
    const entryKey = toCalendarEntryStateKey(entry);
    nextState[entryKey] = compactCalendarCardStates.value[entryKey] ?? false;
  }

  compactCalendarCardStates.value = nextState;
  emitCalendarRequiresExpandedHeight();
};

const onCalendarCardCompactChange = (entryKey: string, compact: boolean) => {
  if (compactCalendarCardStates.value[entryKey] === compact) return;

  compactCalendarCardStates.value = {
    ...compactCalendarCardStates.value,
    [entryKey]: compact,
  };
  emitCalendarRequiresExpandedHeight();
};

const selectCalendarEntry = (entry: CalendarEntry) => {
  trackAction('calendar-select', entry.key);
  const dayOffset = getCalendarDayOffset(entry.dateIso);
  if (dayOffset !== null) {
    trackAction('calendar-day-offset', toDayOffsetLabel(dayOffset));
  }

  const defaultMode = getDefaultTargetRefMode(entry.target, props.side);
  const targetRef = getRefForMode(entry.target, defaultMode);
  const refData = toManualData(targetRef);

  currentRef.value = refData;
  emit('manual-set', targetRef.page, refData, entry.target.key);
};

let teardownCalendarMouseDrag: (() => void) | null = null;

const setupCalendarMouseDrag = () => {
  teardownCalendarMouseDrag?.();

  const slideContainer = calendarSlideShellRef.value?.querySelector('.v-slide-group__container') as HTMLElement | null;
  if (!slideContainer) return;

  let isDragging = false;
  let dragMoved = false;
  let ignoreNextClick = false;
  let startX = 0;
  let startScrollLeft = 0;

  const onPointerDown = (event: PointerEvent) => {
    if (event.pointerType !== 'mouse' || event.button !== 0) return;

    isDragging = true;
    dragMoved = false;
    startX = event.clientX;
    startScrollLeft = slideContainer.scrollLeft;
    slideContainer.classList.add('calendar-slide-group__container--dragging');
  };

  const onPointerMove = (event: PointerEvent) => {
    if (!isDragging) return;

    const deltaX = event.clientX - startX;
    if (Math.abs(deltaX) > 3) {
      dragMoved = true;
    }

    if (!dragMoved) return;

    slideContainer.scrollLeft = startScrollLeft - deltaX;
    event.preventDefault();
  };

  const stopDragging = () => {
    if (!isDragging) return;

    isDragging = false;
    slideContainer.classList.remove('calendar-slide-group__container--dragging');

    if (dragMoved) {
      ignoreNextClick = true;
      window.setTimeout(() => {
        ignoreNextClick = false;
      }, 0);
    }
  };

  const onClickCapture = (event: MouseEvent) => {
    if (!ignoreNextClick) return;

    event.preventDefault();
    event.stopPropagation();
    ignoreNextClick = false;
  };

  slideContainer.addEventListener('pointerdown', onPointerDown);
  window.addEventListener('pointermove', onPointerMove, { passive: false });
  window.addEventListener('pointerup', stopDragging);
  window.addEventListener('pointercancel', stopDragging);
  slideContainer.addEventListener('click', onClickCapture, true);

  teardownCalendarMouseDrag = () => {
    slideContainer.removeEventListener('pointerdown', onPointerDown);
    window.removeEventListener('pointermove', onPointerMove);
    window.removeEventListener('pointerup', stopDragging);
    window.removeEventListener('pointercancel', stopDragging);
    slideContainer.removeEventListener('click', onClickCapture, true);
    slideContainer.classList.remove('calendar-slide-group__container--dragging');
  };
};

watch(
  () => calendarEntries.value.map((entry) => toCalendarEntryStateKey(entry)).join('|'),
  () => {
    void nextTick(() => {
      syncCompactCalendarCardStates();
      setupCalendarMouseDrag();
    });
  },
  { immediate: true }
);

const onTargetRefModeChanged = (mode: TargetRefMode | null) => {
  if (!mode || !matchedTarget.value) return;
  trackAction('target-ref-mode', mode);

  const targetRef = getRefForMode(matchedTarget.value, mode);
  const refData = toManualData(targetRef);

  currentRef.value = refData;
  emit('manual-set', targetRef.page, refData, matchedTarget.value.key);
};

watch(() => props.selectedRef, (newRef) => {
  if (newRef) {
    currentRef.value = { ...newRef };
  } else if (props.page === null) {
    currentRef.value = { book: 1, chapter: null, verse: null };
  }
}, { immediate: true });

watch(() => props.page, (newPage) => {
  if (newPage == null) {
    isPagePreviewOpen.value = false;
  }
});

const computedPageTitle = computed(() => {
  if (props.page === null) return [] as string[];
  return getPageTitleKeys(props.page, currentRef.value, options.isInGola);
});

const getVisibleReadingTitleKeysForCurrentRef = (): string[] => {
  return allTargets
    .filter((target) =>
      matchesTargetSpecific(target.specific, options.isInGola) &&
      isSameTorahRef(target.ref, props.page, currentRef.value)
    )
    .map((target) => `readingTargets.${target.key}`);
};

const resolvedPageTitle = computed(() => {
  const titleKeys = [...computedPageTitle.value];
  const defaultSeparator = t('separator');

  if (props.targetKey && matchedTarget.value) {
    const explicitTitleKey = `readingTargets.${matchedTarget.value.key}`;
    const explicitTitleIndex = titleKeys.indexOf(explicitTitleKey);

    if (explicitTitleIndex >= 0) {
      titleKeys.splice(explicitTitleIndex, 1);
      titleKeys.unshift(explicitTitleKey);
      return titleKeys.map((key) => t(key)).join(defaultSeparator);
    }

    if (!matchesTargetSpecific(matchedTarget.value.specific, options.isInGola)) {
      const visibleTitles = getVisibleReadingTitleKeysForCurrentRef().map((key) => t(key));
      if (visibleTitles.length > 0) {
        return [formatTargetTitle(matchedTarget.value), ...visibleTitles].join(defaultSeparator);
      }

      return formatTargetTitle(matchedTarget.value);
    }
  }

  if (titleKeys.length > 0) return titleKeys.map((key) => t(key)).join(defaultSeparator);
  if (matchedTarget.value) return formatTargetTitle(matchedTarget.value);
  return '';
});

const applyResolvedSelection = (
  data: ManualData,
  page: number,
  source: 'manual' | 'first-line-search'
) => {
  const matchedManualTarget = visibleTargets.value.find((target) =>
    getTargetRefOptions(target).some((option) => isSameTorahRef(option.ref, page, data))
  );

  trackAction(source === 'manual' ? 'manual-save' : 'first-line-search-save', matchedManualTarget ? 'target' : 'custom');

  if (matchedManualTarget) {
    const defaultMode = getDefaultTargetRefMode(matchedManualTarget, props.side);
    const targetRef = getRefForMode(matchedManualTarget, defaultMode);
    const refData = toManualData(targetRef);

    currentRef.value = refData;
    emit('manual-set', targetRef.page, refData, matchedManualTarget.key);
    return;
  }

  currentRef.value = data;
  emit('manual-set', page, data, null);
};

const onManualSave = (data: ManualData, page: number) => {
  applyResolvedSelection(data, page, 'manual');
};

const onFirstLineSearchSave = (data: ManualData, page: number) => {
  applyResolvedSelection(data, page, 'first-line-search');
};

const onManualDraft = (data: ManualData) => {
  if (props.page === null) {
    currentRef.value = data;
  }
};

const clear = () => {
  emit('manual-set', null, undefined);
};

const onClear = () => {
  trackAction('clear');
  clear();
};

const openPagePreview = () => {
  if (props.page == null) return;
  trackAction('preview-open', 'location-card');
  isPagePreviewOpen.value = true;
};

const closePagePreview = () => {
  isPagePreviewOpen.value = false;
};

const onOpenTikkun = () => {
  if (!tikkunUrl.value) return;
  trackAction('preview-open-tikkun');
};

defineExpose({
  openManualDialog: onOpenManualInput,
  closeManualDialog: closeManualInput,
  openFirstLineSearchDialog,
  closeFirstLineSearchDialog,
  openPagePreview,
  closePagePreview,
});

onUnmounted(() => {
  emit('calendar-requires-expanded-height-change', false);
  teardownCalendarMouseDrag?.();
});
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
  flex-wrap: wrap;
  justify-content: flex-end;
}

.location-actions-shell {
  min-width: 0;
  flex: 0 1 420px;
}

.location-actions :deep(.v-btn) {
  white-space: nowrap;
}

.location-page-number {
  font-size: clamp(1.86rem, 7.35vw, 2.75rem);
  line-height: 1;
  letter-spacing: normal;
}

.location-page-number-btn {
  background: none;
  border: none;
  margin: 0;
  padding: 0;
  display: inline-block;
  min-width: max-content;
  white-space: nowrap;
  direction: ltr;
  unicode-bidi: isolate;
  cursor: pointer;
}

.location-page-number-btn:focus-visible {
  outline: 2px solid rgba(var(--v-theme-primary), 0.45);
  outline-offset: 4px;
  border-radius: 8px;
}

.location-page-number-shell {
  position: relative;
  display: flex;
  align-items: center;
  justify-content: center;
  width: fit-content;
  margin-inline: auto;
  padding-inline: 40px;
}

.location-page-preview-btn {
  position: absolute;
  top: 50%;
  inset-inline-end: 4px;
  transform: translateY(-50%);
  width: 34px;
  height: 34px;
  min-width: 34px;
  aspect-ratio: 1 / 1;
  border-radius: 9999px;
  padding: 0;
}

.location-page-number-shell.mod-rtl .location-page-preview-btn {
  inset-inline-end: auto;
  inset-inline-start: 4px;
}

.location-page-preview-btn :deep(.v-btn__overlay),
.location-page-preview-btn :deep(.v-btn__underlay) {
  border-radius: 9999px;
}

.calendar-slide-group {
  margin-inline: -4px;
}

.location-calendar-slide-shell {
  display: grid;
  min-width: 0;
  padding-top: 16px;
}

.location-calendar-section {
  padding: 12px 16px 8px;
}

.calendar-slide-group :deep(.v-slide-group__content) {
  padding-top: 4px;
}

@media (hover: hover) and (pointer: fine) {
  .calendar-slide-group :deep(.v-slide-group__container) {
    cursor: grab;
  }

  .calendar-slide-group :deep(.v-slide-group__container.calendar-slide-group__container--dragging) {
    cursor: grabbing;
    user-select: none;
  }
}

.target-ref-toggle {
  width: 100%;
}

.target-ref-toggle :deep(.v-btn) {
  flex: 1 1 0;
  min-width: 0;
  text-transform: none;
  height: auto;
  min-height: 32px;
  padding-top: 6px;
  padding-bottom: 6px;
}

.target-ref-toggle :deep(.v-btn__content) {
  white-space: normal;
  line-height: 1.2;
  text-align: center;
}

@media (max-width: 900px) {
  .location-text {
    flex-basis: 100%;
  }

  .location-actions {
    width: 100%;
    justify-content: flex-start;
  }

  .location-actions-shell {
    width: 100%;
  }
}

@media (max-width: 600px) {
  .location-header {
    flex-direction: column;
  }

  .location-text {
    flex: 0 0 auto;
  }

  .location-actions-shell {
    flex: 0 0 auto;
    width: 100%;
    position: relative;
  }

  .location-actions-shell::before,
  .location-actions-shell::after {
    content: '';
    position: absolute;
    top: 0;
    bottom: 2px;
    width: 14px;
    pointer-events: none;
    z-index: 1;
  }

  .location-actions-shell::before {
    left: 0;
    background: linear-gradient(
      to right,
      rgba(var(--v-theme-surface), 1),
      rgba(var(--v-theme-surface), 0)
    );
  }

  .location-actions-shell::after {
    right: 0;
    background: linear-gradient(
      to left,
      rgba(var(--v-theme-surface), 1),
      rgba(var(--v-theme-surface), 0)
    );
  }

  .location-actions {
    width: 100%;
    overflow-x: auto;
    flex-wrap: nowrap;
    -webkit-overflow-scrolling: touch;
    padding-bottom: 2px;
    padding-inline: 6px;
    scroll-padding-inline: 6px;
    scrollbar-width: thin;
  }

  .calendar-slide-group :deep(.reading-option-card--calendar) {
    min-width: 162px;
    max-width: 186px;
  }
}
</style>
