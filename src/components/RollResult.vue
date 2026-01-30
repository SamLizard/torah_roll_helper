<template>
  <v-sheet class="pa-6 d-flex flex-column align-center" elevation="2">
    <div class="text-subtitle-1 mb-2">{{ $t('result.title') }}</div>

    <div v-if="pages !== null" class="text-center">
      <div class="big-number">{{ pages }}</div>
      <div class="text-h6 mt-2">{{ $t(`result.direction.${direction}`) }}</div>
      <div class="mt-4 text-body-2">
        {{ $t('result.from') }}: {{ fromPage ?? '—' }} &nbsp; {{ $vuetify.locale.isRtl ? '←' : '→' }} &nbsp; {{ $t('result.to') }}: {{ toPage ?? '—' }}
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
  font-size: 3.5rem;
  font-weight: 700;
  letter-spacing: 6px;
}
</style>
