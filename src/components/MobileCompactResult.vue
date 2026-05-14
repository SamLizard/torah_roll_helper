<template>
  <div
    class="d-flex d-md-none align-center justify-center py-0 mobile-compact-result"
    :class="{ 'mobile-compact-result--clickable': hasResult }"
    @click="scrollToResult"
  >
    <!-- Left side: cols + direction -->
    <span
      class="mobile-compact-result__side text-body-2 font-weight-medium"
      :class="hasResult ? colorClass : 'invisible'"
    >
      {{ $t('preview.cols', { count: pages }) }} · {{ $t(`result.direction.${direction}`) }}
    </span>

    <v-icon size="36" class="mx-2">mdi-arrow-down</v-icon>

    <!-- Right side: book hint (visible) or mirror of left (invisible, for centering) -->
    <span class="mobile-compact-result__side text-caption text-medium-emphasis">
      <span v-if="hasResult && remainingAfterBookLabel" class="d-inline-flex align-start">
        <v-icon size="14" class="me-1 mt-1 flex-shrink-0">mdi-book-open-page-variant-outline</v-icon>
        <span>{{ remainingAfterBookLabel }}</span>
      </span>
      <span v-else class="invisible text-body-2">
        {{ $t('preview.cols', { count: pages }) }} · {{ $t(`result.direction.${direction}`) }}
      </span>
    </span>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue';

const props = defineProps({
  pages: { type: Number as () => number | null, default: null },
  direction: { type: String as () => 'forward' | 'backward' | null, default: null },
  remainingAfterBookLabel: { type: String as () => string | null, default: null },
});

const hasResult = computed(() => props.pages !== null && props.direction !== null);

const colorClass = computed(() => {
  if (props.direction === 'forward') return 'text-primary';
  if (props.direction === 'backward') return 'text-secondary';
  return '';
});

const scrollToResult = () => {
  if (!hasResult.value) return;
  const el = document.querySelector('[data-tutorial="roll-result"]');
  if (el) {
    el.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }
};
</script>

<style scoped>
.mobile-compact-result--clickable {
  cursor: pointer;
}

.mobile-compact-result__side {
  flex: 1 1 0;
}

.mobile-compact-result__side:first-child {
  text-align: end;
}

.mobile-compact-result__side:last-child {
  text-align: start;
}

.invisible {
  visibility: hidden;
}
</style>
