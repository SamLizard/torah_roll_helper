<template>
  <v-card class="h-100 d-flex flex-column" variant="outlined" style="border-radius: 16px;">
    <v-card-item>
      <template #title>
        <div class="text-h6 font-weight-bold">{{ $t(`home.${side}.title`) }}</div>
      </template>
      <template #subtitle>
        <div class="text-caption">{{ $t(`home.${side}.subtitle`) }}</div>
      </template>
      <template #append>
        <div class="d-flex gap-2">
          <v-btn size="small" variant="tonal" color="primary" prepend-icon="mdi-camera" @click="$emit('open-dicta')">
            {{ $t('home.actions.photo') }}
          </v-btn>
          <v-btn size="small" variant="text" prepend-icon="mdi-format-list-bulleted" @click="$emit('choose-manual')">
            {{ $t('home.actions.choose') }}
          </v-btn>
        </div>
      </template>
    </v-card-item>

    <v-divider />

    <v-card-text class="flex-grow-1 d-flex align-center justify-center">
      <div v-if="page !== null" class="text-center w-100">
        <!-- TODO: display the name of the page -->
        <div class="text-h2 font-weight-black text-primary mb-2">{{ page }}</div>
        <div class="text-caption text-medium-emphasis text-uppercase">{{ $t('page') }}</div>

        <v-btn class="mt-4" size="small" color="error" variant="text" @click="clear">
          {{ $t('home.actions.clear') }}
        </v-btn>
      </div>

      <div v-else class="text-center text-medium-emphasis py-6">
        <v-icon size="48" class="mb-2 opacity-50">mdi-book-open-page-variant-outline</v-icon>
        <div>{{ $t('home.noSelection') }}</div>
      </div>
    </v-card-text>

    <v-card-actions v-if="side === 'to' && allowPhotoForTo" class="bg-grey-lighten-5">
      <small class="text-caption text-medium-emphasis mx-auto">
        {{ $t('home.to.canUsePhoto') }}
      </small>
    </v-card-actions>
  </v-card>
</template>

<script setup lang="ts">
const props = defineProps({
  side: { type: String as () => 'from' | 'to', required: true },
  page: { type: Number as () => number | null, default: null },
  allowPhotoForTo: { type: Boolean, default: false }
});

const emit = defineEmits<{
  (e: 'open-dicta'): void;
  (e: 'choose-manual'): void;
  (e: 'manual-set', page: number | null): void;
}>();

const clear = () => {
  emit('manual-set', null);
};
</script>

<style scoped>
.gap-2 {
  gap: 8px;
}
</style>