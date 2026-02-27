<template>
  <!-- TODO 21: When a result is displayed, if there are more then a book of distance, add a small text with the number of remaining pages to roll after the last book he will go through. -->
  <v-sheet class="pa-6 d-flex flex-column align-center" elevation="2">
    <div class="text-subtitle-1 mb-2">{{ $t('result.title') }}</div>

    <div v-if="pages !== null" class="text-center">
      <div class="big-number">{{ pages }}</div>
      <div
        class="text-h6 mt-2"
        :class="direction === 'forward' ? 'text-primary' : direction === 'backward' ? 'text-secondary' : ''"
      >
        {{ $t(`result.direction.${direction}`) }}
      </div>
      <div class="mt-4 text-body-2">
        {{ $t('result.from') }}: {{ fromPage ?? '—' }} &nbsp;
        <span :class="direction === 'forward' ? 'text-primary' : direction === 'backward' ? 'text-secondary' : ''">
          {{
            direction === 'forward'
              ? ($vuetify.locale.isRtl ? '←' : '→')
              : direction === 'backward'
                ? ($vuetify.locale.isRtl ? '→' : '←')
                : ($vuetify.locale.isRtl ? '←' : '→')
          }}
        </span>
        &nbsp; {{ $t('result.to') }}: {{ toPage ?? '—' }}
      </div>
    </div>

    <div v-else class="text-body-2">
      {{ $t('result.noData') }}
    </div>
  </v-sheet>
</template>

<script setup lang="ts">
const props = defineProps({
  pages: { type: Number as () => number | null, default: null },
  direction: { type: String as () => 'forward' | 'backward' | null, default: null },
  fromPage: { type: Number as () => number | null, default: null },
  toPage: { type: Number as () => number | null, default: null }
});
</script>

<style scoped>
.big-number {
  font-size: clamp(2.25rem, 9vw, 3.25rem);
  font-weight: 900;
  line-height: 1;
  letter-spacing: normal;
}
</style>
