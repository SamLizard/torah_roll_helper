<template>
  <v-container fluid class="pa-4">
    <v-row>
      <v-col cols="12" md="6">
        <!-- reusable selector used for FROM -->
        <LocationSelector
          key="from"
          side="from"
          :page="fromPage"
          @open-dicta="openDictaFor('from')"
          @choose-manual="openTargets('from')"
          @manual-set="onSetFromPage"
        />
      </v-col>

      <v-col cols="12" md="6">
        <!-- reusable selector used for TO -->
        <LocationSelector
          key="to"
          side="to"
          :page="toPage"
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
          :from-page="fromPage"
          :to-page="toPage"
        />
      </v-col>
    </v-row>

    <!-- Target list modal (full-screen). Component emits 'select' with item -->
    <TargetOptionsGrid
      v-model="targetsOpen"
      :side="targetsSide"
      :allow-gola="allowGolaInTargets"
      @select="onTargetSelected"
    />

    <!-- Dicta dialog could be a separate component; we open it from Home and listen globally -->
    <!-- <DictaDialog v-model:open="dictaOpen" :side="dictaSide" /> -->
  </v-container>
</template>

<script setup lang="ts">
import { ref, computed, watch } from 'vue';
import { useOptionsStore } from '@/stores/options';
import LocationSelector from '@/components/LocationSelector.vue';
import RollResult from '@/components/RollResult.vue';
import TargetOptionsGrid from '@/components/TargetOptionsGrid.vue';

import { computeRoll } from '@/composables/utils';
import type { RollInstructions } from '@/types';

/* --- local state --- */
const fromPage = ref<number | null>(null);
const toPage = ref<number | null>(null);

const targetsOpen = ref(false);
const targetsSide = ref<'from' | 'to'>('to');

/* for optional photo-for-to toggle (checkbox in your UI or settings) */
const allowPhotoForTo = ref(false);

/* Dicta dialog state (not implemented here, placeholder) */
const dictaOpen = ref(false);
const dictaSide = ref<'from' | 'to'>('from');

/* Use Pinia store to persist isInGola and toPage */
const options = useOptionsStore();

/* Only show gola option in Targets when 'full list' is opened (per your requirement) */
const allowGolaInTargets = computed(() => {
  // We expose the gola toggle from TargetOptionsGrid when it's the full list
  return true; // we pass it, but the component will show toggle only in full mode
});

/* --- derived roll --- */
const roll = ref<RollInstructions | null>(null);

watch([fromPage, toPage], () => {
  if (fromPage.value != null && toPage.value != null) {
    roll.value = computeRoll(fromPage.value, toPage.value);
  } else {
    roll.value = null;
  }
});

/* --- handlers --- */
function openDictaFor(side: 'from' | 'to') {
  dictaSide.value = side;
  // open your dicta dialog here
  dictaOpen.value = true;
  // NOTE: implementing the actual Dicta iframe and postMessage handling belongs in a DictaDialog component
}

function openTargets(side: 'from' | 'to') {
  targetsSide.value = side;
  targetsOpen.value = true;
}

function onSetFromPage(p: number) {
  fromPage.value = p;
}

function onSetToPage(p: number) {
  toPage.value = p;
  // store the chosen toPage in Pinia as the user requested
  options.changeToPage(p);
}

function onTargetSelected(item: any) {
  // item contains { page, name, ... }
  if (targetsSide.value === 'from') {
    fromPage.value = item.ref.page;
  } else {
    toPage.value = item.ref.page;
    options.changeToPage(item.ref.page);
  }
  targetsOpen.value = false;
}
</script>