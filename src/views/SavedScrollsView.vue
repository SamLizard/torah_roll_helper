<template>
  <v-container fluid class="saved-scrolls-view pa-4">
    <div class="saved-scrolls-view__header mb-4">
      <v-btn
        :to="{ name: 'home' }"
        icon="mdi-arrow-left"
        variant="text"
        :aria-label="$t('routes.home')"
      />
      <h1 class="text-h5 font-weight-bold ma-0">{{ $t('savedScrolls.title') }}</h1>
    </div>

    <SavedScrollsPanel
      :current-torah-type="options.torahType"
      @apply="onSavedScrollApply"
    />
  </v-container>
</template>

<script setup lang="ts">
import { nextTick } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import SavedScrollsPanel from '@/components/SavedScrollsPanel.vue';
import { useOptionsStore } from '@/stores/options';
import type { SavedScroll } from '@/stores/savedScrolls';

const router = useRouter();
const route = useRoute();
const options = useOptionsStore();

const onSavedScrollApply = async (scroll: SavedScroll): Promise<void> => {
  options.changeTorahType(scroll.torahType);
  await nextTick();

  await router.push({
    name: 'home',
    query: {
      ...route.query,
      savedScroll: scroll.id,
    },
  });
};
</script>

<style scoped>
.saved-scrolls-view {
  max-width: 900px;
}

.saved-scrolls-view__header {
  display: flex;
  align-items: center;
  gap: 8px;
}
</style>