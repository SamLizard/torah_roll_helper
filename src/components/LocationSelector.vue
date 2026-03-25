<template>
  <!-- TODO 24.5: fix the calendar component of a reading that when hover (computer), the card is going a little up and the top is hidden. -->
  <v-card class="h-100 d-flex flex-column" variant="outlined" style="border-radius: 16px;">
    <v-card-item class="location-card-item">
      <div class="location-header">
        <div class="location-text">
          <div class="text-h6 font-weight-bold">{{ $t(`home.${side}.title`) }}</div>
          <div class="text-caption location-subtitle">{{ $t(`home.${side}.subtitle`) }}</div>
        </div>
        <div class="location-actions-shell">
          <div class="location-actions">
            <v-btn size="small" variant="text" prepend-icon="mdi-format-list-bulleted" @click="onChooseManual">
              {{ $t('home.actions.choose') }}
            </v-btn>          
            <v-btn size="small" variant="tonal" color="primary" prepend-icon="mdi-camera" @click="onOpenDicta">
              {{ $t('home.actions.photo') }}
            </v-btn>
            <v-btn 
              size="small" 
              variant="tonal" 
              color="secondary" 
              prepend-icon="mdi-pencil" 
              @click="onOpenManualInput"
            >
              {{ $t('home.actions.input') }}
            </v-btn>
          </div>
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
              @click="selectCalendarEntry(entry)"
            />
          </v-slide-group-item>
        </v-slide-group>
      </div>
    </v-card-text>

    <v-card-text class="flex-grow-1 d-flex align-center justify-center">
      <div v-if="page !== null" class="text-center w-100">
        <div class="location-page-number-shell mb-2" :class="{ 'mod-rtl': isRtl }">
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

        <v-btn class="mt-4" size="small" color="error" variant="text" @click="onClear">
          {{ $t('home.actions.clear') }}
        </v-btn>

        <v-dialog
          v-model="isPagePreviewOpen"
          max-width="920"
        >
          <v-card class="rounded-xl preview-dialog-card">
            <v-card-title class="preview-dialog-title">
              <span class="text-subtitle-1 font-weight-bold">
                {{ $t('preview.pageTitle', { page }) }}
              </span>
              <v-btn
                icon="mdi-close"
                variant="text"
                size="small"
                @click="isPagePreviewOpen = false"
              />
            </v-card-title>

            <v-card-text>
              <div class="preview-top-row mb-2">
                <div class="text-caption text-medium-emphasis">
                  {{ $t('preview.firstLine') }}
                </div>

                <v-tooltip v-if="!smAndDown" :text="$t('preview.shiftTip')">
                  <template #activator="{ props: tooltipProps }">
                    <button
                      v-bind="tooltipProps"
                      type="button"
                      class="preview-annotations-toggle"
                      :title="effectivePreviewWithNikud ? $t('preview.withNikud') : $t('preview.withoutNikud')"
                      :aria-label="effectivePreviewWithNikud ? $t('preview.withNikud') : $t('preview.withoutNikud')"
                      @click="togglePreviewNikud"
                    >
                      <div class="preview-toggle">
                        <div class="preview-shadowed-circle">
                          <input
                            type="checkbox"
                            :checked="effectivePreviewWithNikud"
                            tabindex="-1"
                            aria-hidden="true"
                          >
                          <span class="preview-toggle-state mod-off">א</span>
                          <span class="preview-toggle-state mod-on">אֶ֨</span>
                        </div>
                      </div>
                    </button>
                  </template>
                </v-tooltip>
                <button
                  v-else
                  type="button"
                  class="preview-annotations-toggle"
                  :title="effectivePreviewWithNikud ? $t('preview.withNikud') : $t('preview.withoutNikud')"
                  :aria-label="effectivePreviewWithNikud ? $t('preview.withNikud') : $t('preview.withoutNikud')"
                  @click="togglePreviewNikud"
                >
                  <div class="preview-toggle">
                    <div class="preview-shadowed-circle">
                      <input
                        type="checkbox"
                        :checked="effectivePreviewWithNikud"
                        tabindex="-1"
                        aria-hidden="true"
                      >
                      <span class="preview-toggle-state mod-off">א</span>
                      <span class="preview-toggle-state mod-on">אֶ֨</span>
                    </div>
                  </div>
                </button>
              </div>

              <div v-if="hasPagePreview" class="tikkun-preview-line-shell">
                <div
                  class="tikkun-preview-line"
                  dir="rtl"
                  lang="he"
                >
                  <div
                    v-for="(column, columnIndex) in pagePreviewColumns"
                    :key="`${page}-${columnIndex}`"
                    class="preview-column"
                  >
                    <span
                      v-for="(fragment, fragmentIndex) in column"
                      :key="`${page}-${columnIndex}-${fragmentIndex}`"
                      class="tikkun-preview-fragment"
                      :class="{ 'mod-setuma': column.length > 1 }"
                      v-html="fragment"
                    />
                  </div>
                </div>
              </div>
              <div v-else class="text-body-2 text-medium-emphasis">
                {{ $t('preview.lineUnavailable') }}
              </div>
            </v-card-text>

            <v-card-actions class="justify-space-between">
              <v-btn variant="text" @click="isPagePreviewOpen = false">
                {{ $t('actions.close') }}
              </v-btn>
              <v-btn
                color="primary"
                variant="tonal"
                prepend-icon="mdi-open-in-new"
                :href="tikkunUrl ?? undefined"
                target="_blank"
                rel="noopener noreferrer"
                :disabled="!tikkunUrl"
                class="preview-open-btn"
                @click="onOpenTikkun"
              >
                {{ openTikkunLabel }}
              </v-btn>
            </v-card-actions>
          </v-card>
        </v-dialog>
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
    />
  </v-card>
</template>

<script setup lang="ts">
import { ref, computed, watch, onUnmounted } from 'vue';
import { useI18n } from 'vue-i18n';
import { storeToRefs } from 'pinia';
import ManualEntryDialog, { type ManualData } from './ManualEntryDialog.vue';
import ReadingOptionCard from './ReadingOptionCard.vue';
import { computeRoll, getPageTitleKeys } from '@/composables/utils';
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
  type ReadingTarget,
} from '@/composables/readingTargets';
import { useDisplay, useRtl } from 'vuetify';
import type { RealDb, TorahRef, Verse } from '@/types';
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

const props = defineProps({
  side: { type: String as () => 'from' | 'to', required: true },
  page: { type: Number as () => number | null, default: null },
  selectedRef: { type: Object as () => ManualData | null, default: null },
  targetKey: { type: String as () => string | null, default: null },
});

const emit = defineEmits<{
  (e: 'open-dicta'): void;
  (e: 'choose-manual'): void;
  (e: 'manual-set', page: number | null, data?: ManualData, targetKey?: string | null): void;
}>();

const { t, locale } = useI18n();
const { isRtl } = useRtl();
const { smAndDown } = useDisplay();
const options = useOptionsStore();
const monthlyReadingsStore = useMonthlyReadingsStore();
const { monthlyReadings } = storeToRefs(monthlyReadingsStore);
const isManualOpen = ref(false);
const isPagePreviewOpen = ref(false);
const previewWithNikud = ref(true);
const isShiftPressed = ref(false);
const pageFirstLines = pageFirstLinesData as unknown[];
const db = realDb as RealDb;

const NUN_HAFUCHA = '׆';
const MS_PER_DAY = 1000 * 60 * 60 * 24;

const currentRef = ref<ManualData>({
  book: 1,
  chapter: null,
  verse: null
});

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

const ketiv = (text: string) =>
  text
    .replace('#(פ)', '')
    .replace(`(${NUN_HAFUCHA})#`, `${NUN_HAFUCHA} `)
    .replace(`#(${NUN_HAFUCHA})`, ` ${NUN_HAFUCHA}`)
    .split(' ')
    .map((maqafSeparatedWord) =>
      maqafSeparatedWord
        .split('־')
        .map((word) => {
          const parts = word.split('#');

          if (parts.length <= 1) {
            return parts[0];
          }

          return parts.slice(1);
        })
        .join('־')
    )
    .join(' ')
    .replace(/\[/g, '{')
    .replace(/\]/g, '}');

const kri = (text: string) =>
  text
    .replace('#(פ)', '')
    .replace(`(${NUN_HAFUCHA})#`, `${NUN_HAFUCHA} `)
    .replace(`#(${NUN_HAFUCHA})`, ` ${NUN_HAFUCHA}`)
    .replace(/־/g, ' ')
    .replace(/#\[.+?\]/g, ' ')
    .replace(new RegExp(`[^א-ת\\s${NUN_HAFUCHA}]`, 'g'), '')
    .replace(/\s{2,}/g, ' ');

const textFilter = ({ text, annotated }: { text: string; annotated: boolean }) =>
  annotated ? ketiv(text) : kri(text);

const escapeHtml = (value: string) =>
  value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');

const ktivKriAnnotation = (text: string) =>
  escapeHtml(text)
    .replace(/[{]/g, '<span class="ktiv-kri">')
    .replace(/[}]/g, '</span>')
    .trim();

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

const getPageStartRef = (page: number | null): Verse | null => {
  if (page == null) return null;

  for (let bookIndex = 0; bookIndex < db.length; bookIndex += 1) {
    const bookEntries = db[bookIndex];
    const match = bookEntries.find((entry) => entry[2] === page);
    if (!match) continue;

    return {
      book: bookIndex + 1,
      chapter: match[0],
      verse: match[1],
    };
  }

  return null;
};

const toPreviewColumns = (entry: unknown): string[][] => {
  if (typeof entry === 'string') return [[entry]];
  if (!Array.isArray(entry)) return [];
  if (entry.length === 0) return [];

  if (entry.every((item) => typeof item === 'string')) {
    return [entry as string[]];
  }

  if (entry.every((item) => Array.isArray(item))) {
    return (entry as unknown[])
      .map((column) =>
        Array.isArray(column)
          ? column.filter((fragment): fragment is string => typeof fragment === 'string')
          : []
      )
      .filter((column) => column.length > 0);
  }

  return [];
};

const pagePreviewRawColumns = computed<string[][]>(() => {
  if (props.page == null) return [];
  return toPreviewColumns(pageFirstLines[props.page - 1]);
});

const pagePreviewColumns = computed(() =>
  pagePreviewRawColumns.value.map((column) =>
    column.map((fragment) =>
      ktivKriAnnotation(
        textFilter({ text: fragment, annotated: effectivePreviewWithNikud.value })
      )
    )
  )
);

const hasPagePreview = computed(() => pagePreviewColumns.value.length > 0);
const effectivePreviewWithNikud = computed(() =>
  isShiftPressed.value ? !previewWithNikud.value : previewWithNikud.value
);
const openTikkunLabel = computed(() =>
  smAndDown.value ? t('preview.openTikkunShort') : t('preview.openTikkun')
);

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
  if (props.targetKey) return props.targetKey === entry.key;
  return props.page === entry.target.ref.page;
};

const matchedTarget = computed(() => {
  if (props.targetKey) {
    const explicitCalendarTarget = resolveCalendarReading(props.targetKey);
    if (explicitCalendarTarget) return explicitCalendarTarget.target;
  }

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

// DONE 24.1: there are few bugs. 
// I added holidays that are not in tikkun.io, so h/my-created-id will not work. In this case we have to use the ref. So it is not only the four parashiot that doesn't have a corresponding id in the tikkunio.
// Pay attention that now I have ids that are the same but one for israel and one for gola, and the references are not the same. So don't just use the key, but also verify that the ref is the good one.
// Those are the keys (of holidays) that are tikkun.io (with the ref - start - and if it is for both or only gola):
/*
rosh-chodesh | 4:28:1 | both
rosh-1 | 1:21:1 | both
rosh-2 | 1:22:1 | both
yom-kippur | 3:16:1 | both
sukkot-1 | 3:22:26 | both
sukkot-2 | 3:22:26 | both
sukkot-3 | 4:29:17 | both
sukkot-4 | 4:29:20 | both
sukkot-5 | 4:29:23 | both
sukkot-6 | 4:29:26 | both
sukkot-7 | 4:29:26 | both
sukkot-shabbat-chol-hamoed | 2:33:12 | both
shmini-atzeret | 5:14:22 | both
simchat-torah | 5:33:1 | both
chanukah-1 | 4:7:1 | both
chanukah-2 | 4:7:18 | both
chanukah-3 | 4:7:24 | both
chanukah-4 | 4:7:30 | both
chanukah-5 | 4:7:36 | both
chanukah-7 | 4:7:48 | both
chanukah-8 | 4:7:54 | both
purim | 2:17:8 | both
taanit-tzibur | 2:32:11 | both
pesach-1 | 2:12:21 | both
pesach-2 | 3:22:26 | both
pesach-3 | 2:13:1 | both
pesach-4 | 2:22:24 | both
pesach-5 | 2:34:1 | both
pesach-6 | 4:9:1 | both
pesach-shabbat-chol-hamoed | 2:33:12 | both
pesach-7 | 2:13:17 | both
pesach-8 | 5:14:22 | gola
shavuot-1 | 2:19:1 | both
shavuot-2 | 5:14:22 | gola
tisha-bav | 5:4:25 | both
*/
// The parashiot that are jumelées also have a wrong id in tikkun.io. We should put the id of the first parasha, not of both.
const tikkunUrl = computed(() => {
  const targetUrl = toTikkunUrl(matchedTarget.value);
  if (targetUrl) return targetUrl;

  if (currentRefAsVerse.value) {
    return toRefUrl(currentRefAsVerse.value);
  }

  if (matchedTarget.value) {
    return toRefUrl(matchedTarget.value.ref);
  }

  const pageStartRef = getPageStartRef(props.page);
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

const onPreviewKeydown = (event: KeyboardEvent) => {
  if (!isPagePreviewOpen.value) return;
  if (event.key !== 'Shift') return;
  isShiftPressed.value = true;
};

const onPreviewKeyup = (event: KeyboardEvent) => {
  if (!isPagePreviewOpen.value) return;
  if (event.key !== 'Shift') return;
  isShiftPressed.value = false;
};

const computedPageTitle = computed(() => {
  if (props.page === null) return '';

  const keys = getPageTitleKeys(props.page, currentRef.value);
  
  if (keys && keys.length > 0) {
    return keys.map(key => t(key)).join(t('separator'));
  }

  return '';
});

const resolvedPageTitle = computed(() => {
  if (computedPageTitle.value) return computedPageTitle.value;
  if (matchedTarget.value) return t(`readingTargets.${matchedTarget.value.key}`);
  return '';
});

const onManualSave = (data: ManualData, page: number) => {
  const matchedManualTarget = visibleTargets.value.find((target) =>
    getTargetRefOptions(target).some((option) => isSameTorahRef(option.ref, page, data))
  );

  trackAction('manual-save', matchedManualTarget ? 'target' : 'custom');

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

const togglePreviewNikud = () => {
  previewWithNikud.value = !previewWithNikud.value;
};

const openPagePreview = () => {
  if (props.page == null) return;
  trackAction('preview-open');
  isPagePreviewOpen.value = true;
};

const onOpenTikkun = () => {
  if (!tikkunUrl.value) return;
  trackAction('preview-open-tikkun');
};

watch(isPagePreviewOpen, (isOpen) => {
  if (isOpen) {
    window.addEventListener('keydown', onPreviewKeydown);
    window.addEventListener('keyup', onPreviewKeyup);
    return;
  }

  window.removeEventListener('keydown', onPreviewKeydown);
  window.removeEventListener('keyup', onPreviewKeyup);
  isShiftPressed.value = false;
});

onUnmounted(() => {
  window.removeEventListener('keydown', onPreviewKeydown);
  window.removeEventListener('keyup', onPreviewKeyup);
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

.preview-dialog-title {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 8px;
}

.preview-dialog-card {
  max-height: min(66vh, 520px);
  overflow: hidden;
}

.preview-dialog-card :deep(.v-card-text) {
  overflow-y: auto;
}

.preview-top-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 8px;
  flex-wrap: wrap;
}

.preview-annotations-toggle {
  font-family: 'Noto Serif Hebrew', 'Times New Roman', serif;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  border: none;
  border-radius: 9999px;
  padding: 0;
  background: transparent;
  cursor: pointer;
}

.preview-toggle {
  --annotations-toggle-active-color: white;
  --annotations-toggle-inactive-color: hsla(0, 0%, 100%, 0.6);
  text-align: middle;
  display: flex;
  align-items: center;
  direction: ltr;
  unicode-bidi: isolate;
  -webkit-user-select: none;
  user-select: none;
}

.preview-toggle [type='checkbox'] {
  display: none;
}

.preview-toggle-state {
  color: var(--annotations-toggle-inactive-color);
  transition: all 0.1s;
  position: relative;
  right: 3px;
}

.preview-toggle-state.mod-off {
  display: inline-block;
  margin-right: 0.25em;
}

.preview-toggle [type='checkbox']:checked ~ .preview-toggle-state.mod-on,
.preview-toggle [type='checkbox']:not(:checked) ~ .preview-toggle-state.mod-off {
  transform: scale(1.5);
  color: var(--annotations-toggle-active-color);
}

.preview-toggle [type='checkbox']:not(:checked) ~ .preview-toggle-state.mod-on,
.preview-toggle [type='checkbox']:not(:checked) ~ .preview-toggle-state.mod-off {
  right: -3px;
}

.preview-shadowed-circle {
  padding: 0.72em;
  height: 2.95em;
  width: 2.95em;
  display: flex;
  direction: ltr;
  unicode-bidi: isolate;
  justify-content: center;
  align-items: center;
  border-radius: 50%;
  background: black;
  color: white;
  transition: 0.15s transform;
}

.preview-shadowed-circle:hover {
  transform: scale(1.08);
}

.tikkun-preview-line-shell {
  width: min(100%, 44rem);
  margin-inline: auto;
  overflow-x: auto;
  overflow-y: hidden;
  padding-bottom: 4px;
  -webkit-overflow-scrolling: touch;
}

.tikkun-preview-line {
  --preview-line-width: 27.5em;
  border: 1px solid rgba(var(--v-border-color), var(--v-border-opacity));
  border-radius: 12px;
  background-color: rgba(var(--v-theme-surface-variant), 0.18);
  position: relative;
  direction: rtl;
  unicode-bidi: isolate;
  text-align: justify;
  line-height: 100%;
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  min-width: var(--preview-line-width);
  width: var(--preview-line-width);
  padding: 12px 14px 10px;
  font-family: 'Noto Serif Hebrew', 'Times New Roman', serif;
  font-size: clamp(1rem, 2.1vw, 1.55rem);
}

.preview-column {
  flex: 1;
  display: flex;
  justify-content: space-between;
  direction: rtl;
  min-width: 18ch;
}

.preview-column:nth-child(2) {
  margin-right: 5em;
  width: 12em;
}

.tikkun-preview-fragment {
  width: 100%;
  white-space: nowrap;
}

.tikkun-preview-fragment.mod-setuma {
  width: auto;
}

.tikkun-preview-fragment::after {
  content: '';
  width: 100%;
  display: inline-block;
}

.tikkun-preview-line :deep(.ktiv-kri) {
  background-color: rgba(var(--v-theme-primary), 0.1);
  border: 1px solid rgba(var(--v-theme-primary), 0.2);
  border-radius: 8px;
  padding: 0.1rem;
}

.preview-open-btn {
  max-width: 100%;
  min-width: 0;
}

.preview-open-btn :deep(.v-btn__content) {
  white-space: normal;
  line-height: 1.15;
  text-align: center;
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
  .tikkun-preview-line-shell {
    width: 100%;
  }

  .tikkun-preview-line {
    font-size: 0.83rem;
    --preview-line-width: 100%;
    min-width: 100%;
    width: 100%;
  }

  .preview-column {
    min-width: 0;
  }

  .preview-column:nth-child(2) {
    margin-right: 1.4em;
    width: 8.6em;
  }

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
    min-width: 154px;
  }
}
</style>
