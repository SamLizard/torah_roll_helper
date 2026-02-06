<template>
  <!-- TODO 7.8: Add an arrow for the FROM -> TO, so the user saws directly the direction (pay attention to mobile) -->
  <v-container fluid class="pa-4">
    <v-row>
      <!-- TODO 8: Add the calendar view here, and in the manual choose. Here to display the few next readings (if clicked, chosen as TO). -->
      <v-col cols="12" md="6">
        <!-- DONE 1: Add the option to set manually the book + perek + verse (The utils getPageNumber should be used to give back the page number) -->
        <!-- The options for the book should be taken from i18n, with keys: genesis, exodus, leviticus, numbers, deuteronomy -->
        <!-- The minimum number for a perek is 1, and there are [50, 40, 27, 36, 34] perek for the books (so don't let user enter value bigger than it, depending on the book) -->
        <!-- The minimum number for a verse is 1, and the maximum is 90 (don't check for each perek, but put global maximum of 90) -->
        <!-- TODO 9: Make it reactive, so it works on phones. -->
        <!-- reusable selector used for FROM -->
        <LocationSelector
          key="from"
          side="from"
          :page="options.fromPage" 
          :selected-ref="fromRef"
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
          :page="options.toPage" 
          :selected-ref="toRef"
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

    <!-- Target list modal (full-screen). Component emits 'select' with item -->
    <!-- TODO 8.5: make the current (next reading) parasha look different, and start by looking at it? -->
    <!-- DONE 3: Add titles to group of targets (book separation, holiday separation) -->
    <!-- So there is the first separation by type (parasha/holyday) - add type.parasha and type.holydays to i18n, and display it -->
    <!-- And there is the second separation by group (only if there) is more than 1 item with this group. Take from group.group in i18n -->
    <!-- Each group is collapsable. The rest of the type that doesn't have more than an item with the same group, will be at the end of the type (after the groups, maybe in an "other" subgroup?) -->
    <TargetOptionsGrid
      v-model="targetsOpen"
      :side="activeSide"
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
import type { ManualData } from '@/components/ManualEntryDialog.vue'; // Ensure type is exported

import { computeRoll } from '@/composables/utils';
import type { RollInstructions } from '@/types';

/* --- Store Access --- */
const options = useOptionsStore(); // options.fromPage / options.toPage

/* --- Local state --- */
// fromPage ref REMOVED (using options.fromPage)
const fromRef = ref<ManualData | null>(null);

const toRef = ref<ManualData | null>(null);

const targetsOpen = ref(false);
const activeSide = ref<'from' | 'to'>('to'); // Renamed from targetsSide to generic activeSide

/* for optional photo-for-to toggle (checkbox in your UI or settings) */
const allowPhotoForTo = ref(false);

/* Dicta dialog state (not implemented here, placeholder) */
const dictaOpen = ref(false);

/* Only show gola option in Targets when 'full list' is opened (per your requirement) */
const allowGolaInTargets = computed(() => {
  // We expose the gola toggle from TargetOptionsGrid when it's the full list
  return true; // we pass it, but the component will show toggle only in full mode
});

/* --- derived roll --- */
const roll = ref<RollInstructions | null>(null);

// Watch store values instead of local refs
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

/* --- handlers --- */
function openDictaFor(side: 'from' | 'to') {
  activeSide.value = side;
  // open your dicta dialog here
  dictaOpen.value = true;
  // NOTE: implementing the actual Dicta iframe and postMessage handling belongs in a DictaDialog component
}

function openTargets(side: 'from' | 'to') {
  activeSide.value = side;
  targetsOpen.value = true;
}

// Handler for Manual Entry (emitted from LocationSelector)
function onSetFromPage(p: number | null, refData: ManualData | null = null) {
  options.changeFromPage(p); // Update store
  fromRef.value = refData;
}

// Handler for Manual Entry (emitted from LocationSelector)
function onSetToPage(p: number | null, refData: ManualData | null = null) {
  options.changeToPage(p);
  toRef.value = refData;
}

function onTargetSelected(item: any) {
  // Construct the Ref object from the target item
  const newRef: ManualData = {
    book: item.ref.book,
    chapter: item.ref.chapter,
    verse: item.ref.verse
  };

  if (activeSide.value === 'from') {
    options.changeFromPage(item.ref.page);
    fromRef.value = newRef;
  } else {
    options.changeToPage(item.ref.page);
    toRef.value = newRef;
  }
  targetsOpen.value = false;
}
</script>