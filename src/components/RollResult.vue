<template>
  <!-- TODO 25: maybe add an option to see the result in full screen, with an option to retake a picture for the FROM, and looking at all the details directly, in big. -->
  <v-sheet class="pa-6 d-flex flex-column align-center" elevation="2">
    <div class="text-subtitle-1 mb-2">{{ $t('result.title') }}</div>

    <div v-if="pages !== null" class="text-center">
      <div class="big-number">{{ pages }}</div>
      <div v-if="remainingAfterBook !== null" class="text-caption mt-1 text-medium-emphasis">
        {{
          $t('result.remainingAfterBook', {
            count: remainingAfterBook.count,
            book: $t(`group.${remainingAfterBook.bookKey}`)
          })
        }}
      </div>
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
import { computed } from 'vue';
import realDb from '@/data/real_db.json';
import type { RealDb } from '@/types';
import { getRemainingAfterBookForRoll } from '@/composables/rollResultUtils';

const bookLabelKeys = ['genesis', 'exodus', 'leviticus', 'numbers', 'deuteronomy'] as const;
type BookLabelKey = (typeof bookLabelKeys)[number];

const props = defineProps({
  pages: { type: Number as () => number | null, default: null },
  direction: { type: String as () => 'forward' | 'backward' | null, default: null },
  fromPage: { type: Number as () => number | null, default: null },
  toPage: { type: Number as () => number | null, default: null }
});

const remainingAfterBook = computed<{ count: number; bookKey: BookLabelKey } | null>(() => {
  if (props.pages === null || props.fromPage === null || props.toPage === null || props.fromPage === props.toPage) {
    return null;
  }

  const remaining = getRemainingAfterBookForRoll(props.fromPage, props.toPage, realDb as RealDb);
  if (!remaining) return null;
  const bookKey = bookLabelKeys[remaining.bookIndex];
  if (!bookKey) return null;

  return {
    count: remaining.count,
    bookKey
  };
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
