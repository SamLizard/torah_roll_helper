<template>
  <v-container fluid class="pa-4">
    <v-row class="position-relative">
      <v-col cols="12" md="6" class="px-md-5">
        <LocationSelector
          key="from"
          side="from"
          :page="options.fromPage" 
          :selected-ref="fromRef"
          :target-key="fromTargetKey"
          @open-dicta="openDictaFor('from')"
          @choose-manual="openTargets('from')"
          @manual-set="onSetFromPage"
        />
      </v-col>

      <v-icon
        class="position-absolute d-none d-md-flex"
        style="left: 50%; top: 50%; transform: translate(-50%, -50%);"
        size="36"
      >
        mdi-arrow-{{ $vuetify.locale.isRtl ? 'left' : 'right' }}
      </v-icon>

      <v-col cols="12" class="d-flex d-md-none align-center justify-center py-0">
        <v-icon size="36">mdi-arrow-down</v-icon>
      </v-col>

      <v-col cols="12" md="6" class="px-md-5">
        <LocationSelector
          key="to"
          side="to"
          :page="options.toPage" 
          :selected-ref="toRef"
          :target-key="toTargetKey"
          :allow-photo-for-to="allowPhotoForTo"
          @open-dicta="openDictaFor('to')"
          @choose-manual="openTargets('to')"
          @manual-set="onSetToPage"
        />
      </v-col>
    </v-row>

    <v-row class="mt-6" justify="center">
      <v-col cols="12" md="8">
        <RollResult
          :pages="roll?.pages ?? null"
          :direction="roll?.rollDirection ?? null"
          :from-page="options.fromPage"
          :to-page="options.toPage"
        />
      </v-col>
    </v-row>

    <TargetOptionsGrid
      v-model="targetsOpen"
      :side="activeSide"
      :selected-target-key="(activeSide === 'from' ? fromTargetKey : toTargetKey) ?? undefined"
      :allow-gola="allowGolaInTargets"
      @select="onTargetSelected"
    />

    </v-container>
</template>

<script setup lang="ts">
import { ref, computed, watch } from 'vue';
import { useOptionsStore } from '@/stores/options';
import LocationSelector from '@/components/LocationSelector.vue';
import RollResult from '@/components/RollResult.vue';
import TargetOptionsGrid from '@/components/TargetOptionsGrid.vue';
import type { ManualData } from '@/components/ManualEntryDialog.vue';

import { computeRoll } from '@/composables/utils';
import type { RollInstructions, TorahRef } from '@/types';

interface HomeTargetItem {
  key: string;
  ref: TorahRef;
  refEndPartial?: TorahRef;
  refEnd: TorahRef;
}

const options = useOptionsStore();
const fromRef = ref<ManualData | null>(null);

const toRef = ref<ManualData | null>(null);
const fromTargetKey = ref<string | null>(null);
const toTargetKey = ref<string | null>(null);

const targetsOpen = ref(false);
const activeSide = ref<'from' | 'to'>('to');

const allowPhotoForTo = ref(false);

const dictaOpen = ref(false);

const allowGolaInTargets = computed(() => {
  return true;
});

const roll = ref<RollInstructions | null>(null);

watch(
  [() => options.fromPage, () => options.toPage], 
  ([newFrom, newTo]) => {
    if (newFrom != null && newTo != null) {
      roll.value = computeRoll(newFrom, newTo);
    } else {
      roll.value = null;
    }
  },
  { immediate: true }
);

const toManualData = (torahRef: TorahRef): ManualData => ({
  book: torahRef.book,
  chapter: torahRef.chapter,
  verse: torahRef.verse,
});

const getDefaultRefForSide = (target: HomeTargetItem, side: 'from' | 'to'): TorahRef => {
  if (side === 'from') return target.refEndPartial ?? target.refEnd;
  return target.ref;
};

const openDictaFor = (side: 'from' | 'to') => {
  activeSide.value = side;
  dictaOpen.value = true;
};

const openTargets = (side: 'from' | 'to') => {
  activeSide.value = side;
  targetsOpen.value = true;
};

const onSetFromPage = (
  p: number | null,
  refData: ManualData | null = null,
  targetKey: string | null = null
) => {
  options.changeFromPage(p);
  fromRef.value = refData;
  fromTargetKey.value = p == null ? null : targetKey;
};

const onSetToPage = (
  p: number | null,
  refData: ManualData | null = null,
  targetKey: string | null = null
) => {
  options.changeToPage(p);
  toRef.value = refData;
  toTargetKey.value = p == null ? null : targetKey;
};

const onTargetSelected = (item: HomeTargetItem) => {
  const selectedRef = getDefaultRefForSide(item, activeSide.value);
  const newRef = toManualData(selectedRef);

  if (activeSide.value === 'from') {
    options.changeFromPage(selectedRef.page);
    fromRef.value = newRef;
    fromTargetKey.value = item.key;
  } else {
    options.changeToPage(selectedRef.page);
    toRef.value = newRef;
    toTargetKey.value = item.key;
  }
  targetsOpen.value = false;
};
</script>
