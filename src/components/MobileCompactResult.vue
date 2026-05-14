<template>
  <div
    class="d-flex d-md-none align-center justify-center py-0 mobile-compact-result"
    :class="{ 'mobile-compact-result--clickable': hasResult }"
    @click="scrollToResult"
  >
    <span
      v-if="hasResult"
      class="text-body-2 font-weight-medium me-2"
      :class="colorClass"
    >
      {{ $t('preview.cols', { count: pages }) }} · {{ $t(`result.direction.${direction}`) }}
    </span>
    <v-icon size="36">mdi-arrow-down</v-icon>
    <span
      v-if="hasResult"
      class="ms-2"
      style="visibility: hidden;"
    >
      {{ $t('preview.cols', { count: pages }) }} · {{ $t(`result.direction.${direction}`) }}
    </span>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue';

const props = defineProps({
  pages: { type: Number as () => number | null, default: null },
  direction: { type: String as () => 'forward' | 'backward' | null, default: null },
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
</style>
