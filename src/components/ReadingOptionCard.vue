<template>
  <div
    class="reading-option-card"
    :class="{
      'reading-option-card--calendar': compactCalendar,
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

    <div class="d-flex justify-space-between align-start mb-2">
      <span class="reading-option-card__name text-truncate">
        {{ readingLabel ?? $t(`readingTargets.${readingKey}`) }}
      </span>
    </div>

    <div class="d-flex align-center text-caption text-medium-emphasis justify-space-between gap-1">
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
type TargetBadgeKind = 'gola' | 'israel';

interface RollPreview {
  icon: string;
  color: string;
  text: string;
}

withDefaults(defineProps<{
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
});

const emit = defineEmits<{
  (e: 'click'): void;
}>();

const onClick = () => {
  emit('click');
};
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
}

.reading-option-card:hover {
  transform: translateY(-4px);
  box-shadow: 0 8px 16px rgba(0, 0, 0, 0.08);
  border-color: rgb(var(--v-theme-primary));
}

.reading-option-card--calendar {
  min-width: 166px;
  max-width: 184px;
  padding: 12px;
  margin-inline: 4px;
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
  font-weight: 600;
  font-size: 1rem;
  line-height: 1.2;
  padding-inline-end: 20px;
}
</style>
