<template>
  <div
    class="reading-option-card"
    :class="{
      'reading-option-card--calendar': compactCalendar,
      'reading-option-card--calendar-balanced': compactCalendar && balanceCalendarCardHeight,
      'reading-option-card--active': active,
      'reading-option-card--specific': Boolean(specificBadge),
      'reading-option-card--gola': specificBadge === 'gola',
      'reading-option-card--israel': specificBadge === 'israel',
      'reading-option-card--next': highlightNextParasha,
      'reading-option-card--with-next-badge': highlightNextParasha && showNextParashaBadge,
    }"
    @click="onClick"
    v-ripple
  >
    <div v-if="specificBadge" class="reading-option-card__specific-badge">
      <v-icon size="10" color="primary" class="me-1">
        {{ specificBadge === 'gola' ? 'mdi-earth' : 'mdi-map-marker-radius' }}
      </v-icon>
      <span>{{ $t(`targets.${specificBadge}Badge`) }}</span>
    </div>

    <div v-if="highlightNextParasha && showNextParashaBadge" class="reading-option-card__next-badge">
      <v-icon size="11" color="primary">mdi-book-marker</v-icon>
    </div>

    <div v-if="dateLabel" class="d-flex align-center text-caption text-medium-emphasis mb-2">
      <v-icon v-if="showDateIcon" size="14" class="me-1">mdi-calendar-month-outline</v-icon>
      <span>{{ dateLabel }}</span>
    </div>

    <div ref="nameRowRef" class="reading-option-card__name-row">
      <span
        class="reading-option-card__name"
        :class="{ 'reading-option-card__name--compact': isCompactName }"
      >
        {{ readingTitle }}
      </span>

      <span
        v-if="compactCalendar"
        ref="readingNameMeasureRef"
        aria-hidden="true"
        class="reading-option-card__name reading-option-card__name--measure"
      >
        {{ readingTitle }}
      </span>
    </div>

    <div class="reading-option-card__meta d-flex align-center text-caption text-medium-emphasis justify-space-between gap-1">
      <span>{{ $t('page') }} {{ page }}</span>

      <div
        v-if="rollPreview"
        :class="`text-${rollPreview.color} d-flex align-center gap-1`"
      >
        <v-icon size="x-small">{{ rollPreview.icon }}</v-icon>
        <span class="font-weight-bold mx-1">{{ rollPreview.text }}</span>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed, nextTick, onMounted, onUnmounted, ref, watch } from 'vue';
import { useI18n } from 'vue-i18n';

type TargetBadgeKind = 'gola' | 'israel';

interface RollPreview {
  icon: string;
  color: string;
  text: string;
}

const props = withDefaults(defineProps<{
  readingKey: string;
  readingLabel?: string | null;
  page: number;
  active?: boolean;
  specificBadge?: TargetBadgeKind | null;
  highlightNextParasha?: boolean;
  showNextParashaBadge?: boolean;
  dateLabel?: string | null;
  showDateIcon?: boolean;
  rollPreview?: RollPreview | null;
  compactCalendar?: boolean;
  balanceCalendarCardHeight?: boolean;
}>(), {
  readingLabel: null,
  active: false,
  specificBadge: null,
  highlightNextParasha: false,
  showNextParashaBadge: true,
  dateLabel: null,
  showDateIcon: false,
  rollPreview: null,
  compactCalendar: false,
  balanceCalendarCardHeight: false,
});
const { t, locale } = useI18n();

const emit = defineEmits<{
  (e: 'click'): void;
  (e: 'calendar-compact-change', compact: boolean): void;
}>();

const nameRowRef = ref<HTMLElement | null>(null);
const readingNameMeasureRef = ref<HTMLElement | null>(null);
const isCompactName = ref(false);
const readingTitle = computed(() => props.readingLabel ?? t(`readingTargets.${props.readingKey}`));
let resizeObserver: ResizeObserver | null = null;
let measurementFrameId: number | null = null;

const onClick = () => {
  emit('click');
};

const cancelScheduledMeasurement = () => {
  if (measurementFrameId === null) return;

  window.cancelAnimationFrame(measurementFrameId);
  measurementFrameId = null;
};

const updateCompactNameState = () => {
  if (!props.compactCalendar) {
    isCompactName.value = false;
    return;
  }

  const measureElement = readingNameMeasureRef.value;
  if (!measureElement) return;

  const computedStyle = window.getComputedStyle(measureElement);
  const lineHeight = Number.parseFloat(computedStyle.lineHeight);

  if (!Number.isFinite(lineHeight) || lineHeight <= 0) {
    isCompactName.value = false;
    return;
  }

  const renderedHeight = measureElement.getBoundingClientRect().height;
  isCompactName.value = renderedHeight > lineHeight * 1.15;
};

const scheduleCompactNameMeasurement = () => {
  cancelScheduledMeasurement();

  measurementFrameId = window.requestAnimationFrame(() => {
    measurementFrameId = null;
    updateCompactNameState();
  });
};

onMounted(() => {
  resizeObserver = new ResizeObserver(() => {
    scheduleCompactNameMeasurement();
  });

  if (nameRowRef.value) {
    resizeObserver.observe(nameRowRef.value);
  }

  scheduleCompactNameMeasurement();
});

watch(
  () => [
    props.compactCalendar,
    props.readingLabel,
    props.readingKey,
    props.highlightNextParasha,
    props.showNextParashaBadge,
    locale.value,
  ],
  async () => {
    await nextTick();
    scheduleCompactNameMeasurement();
  },
);

watch(
  () => [props.compactCalendar, isCompactName.value],
  ([compactCalendar, compactName]) => {
    emit('calendar-compact-change', compactCalendar && compactName);
  },
  { immediate: true }
);

onUnmounted(() => {
  cancelScheduledMeasurement();
  resizeObserver?.disconnect();
});
</script>

<style scoped>
.gap-1 {
  gap: 4px;
}

.reading-option-card {
  background-color: rgb(var(--v-theme-surface));
  border: 1px solid rgba(var(--v-border-color), var(--v-border-opacity));
  border-radius: 12px;
  padding: 16px;
  cursor: pointer;
  transition: all 0.2s ease-in-out;
  position: relative;
  overflow: hidden;
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.02);
  min-width: 0;
  display: flex;
  flex-direction: column;
}

.reading-option-card--calendar {
  min-width: 176px;
  max-width: 208px;
  padding: 10px;
  margin-inline: 4px;
}

.reading-option-card--calendar-balanced {
  min-height: 96px;
}

.reading-option-card--active {
  border-color: rgb(var(--v-theme-primary));
  background-color: rgba(var(--v-theme-primary), 0.08);
}

.reading-option-card--next {
  border-color: rgba(var(--v-theme-primary), 0.55);
  box-shadow: 0 0 0 1px rgba(var(--v-theme-primary), 0.2);
}

.reading-option-card__next-badge {
  position: absolute;
  top: 8px;
  inset-inline-start: 8px;
  width: 20px;
  height: 20px;
  background-color: rgba(var(--v-theme-surface), 0.92);
  border: 1px solid rgba(var(--v-theme-primary), 0.2);
  border-radius: 4px;
  display: flex;
  align-items: center;
  justify-content: center;
}

.reading-option-card--with-next-badge .reading-option-card__name {
  padding-inline-start: 20px;
}

.reading-option-card--specific {
  border-color: rgba(var(--v-theme-primary), 0.3);
  background-color: rgba(var(--v-theme-primary), 0.03);
}

.reading-option-card--israel {
  border-color: rgba(var(--v-theme-secondary), 0.35);
  background-color: rgba(var(--v-theme-secondary), 0.04);
}

.reading-option-card__specific-badge {
  position: absolute;
  top: 8px;
  inset-inline-end: 8px;
  background-color: rgba(var(--v-theme-surface), 0.9);
  border: 1px solid rgba(var(--v-theme-primary), 0.2);
  border-radius: 4px;
  padding: 2px 6px;
  font-size: 0.65rem;
  font-weight: 700;
  color: rgb(var(--v-theme-primary));
  text-transform: uppercase;
  display: flex;
  align-items: center;
}

.reading-option-card__name {
  display: block;
  font-weight: 600;
  font-size: 1rem;
  line-height: 1.25;
  padding-inline-end: 20px;
  white-space: normal;
  overflow-wrap: break-word;
}

.reading-option-card__name--measure {
  position: absolute;
  inset-block-start: 0;
  inset-inline-start: 0;
  width: 100%;
  visibility: hidden;
  pointer-events: none;
}

.reading-option-card__name-row {
  position: relative;
  min-width: 0;
  margin-bottom: 8px;
}

.reading-option-card__meta {
  margin-top: auto;
}

.reading-option-card--calendar .text-caption {
  font-size: 0.68rem !important;
  line-height: 1.2;
}

.reading-option-card--calendar .reading-option-card__name--compact {
  font-size: 0.88rem;
  line-height: 1.18;
}

.reading-option-card--calendar .reading-option-card__name-row {
  margin-bottom: 6px;
}

.reading-option-card--calendar .reading-option-card__specific-badge {
  top: 6px;
  inset-inline-end: 6px;
  padding: 1px 5px;
  font-size: 0.58rem;
}

.reading-option-card--calendar .reading-option-card__next-badge {
  top: 6px;
  inset-inline-start: 6px;
  width: 18px;
  height: 18px;
}

@media (hover: hover) and (pointer: fine) {
  .reading-option-card:hover {
    transform: translateY(-4px);
    box-shadow: 0 8px 16px rgba(0, 0, 0, 0.08);
    border-color: rgb(var(--v-theme-primary));
  }
}

@media (hover: none), (pointer: coarse) {
  .reading-option-card:active {
    transform: translateY(-4px);
    box-shadow: 0 8px 16px rgba(0, 0, 0, 0.08);
    border-color: rgb(var(--v-theme-primary));
  }
}
</style>
