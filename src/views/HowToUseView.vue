<template>
  <!-- TODO 19: Add informations for camera usage. -->
  <v-container fluid class="pa-4">
    <v-row justify="center">
      <v-col cols="12" md="9" lg="7">
        <v-card variant="flat" :dir="$vuetify.locale.isRtl ? 'rtl' : 'ltr'">
          <v-card-title class="text-h5 font-weight-bold">
            {{ $t('howTo.title') }}
          </v-card-title>
          <v-card-subtitle class="text-body-1 mt-1 howto-subtitle">
            {{ $t('howTo.subtitle') }}
          </v-card-subtitle>

          <v-card-text class="pt-6">
            <ol class="howto-list">
              <li v-for="(step, idx) in 3" :key="idx">
                {{ $t(`howTo.steps.step${idx + 1}`) }}
              </li>
            </ol>

            <v-alert type="info" variant="tonal" class="mt-6">
              {{ $t('howTo.tip') }}
            </v-alert>
          </v-card-text>
        </v-card>
      </v-col>
    </v-row>
  </v-container>
</template>

<script setup lang="ts">
</script>

<style scoped>
.howto-list {
  margin: 0;
  padding-inline-start: 20px;
  display: grid;
  gap: 10px;
}

.howto-subtitle {
  white-space: normal !important;
  overflow: visible;
  text-overflow: initial;
  line-height: 1.35;
}
</style>
