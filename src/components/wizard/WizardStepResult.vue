<template>
  <div class="wizard-step-result" :dir="isRtl ? 'rtl' : 'ltr'">
    <!-- Result Card -->
    <v-card class="result-summary-card mb-6 pa-6 text-center" variant="flat" border>
      <span class="text-overline text-uppercase text-primary">{{ $t('result.title') }}</span>
      
      <div v-if="roll" class="mt-4">
        <div class="big-number font-weight-black text-primary my-2">
          {{ roll.pages }} {{ $t('preview.cols', { count: roll.pages }).replace(/\d+/g, '').trim() }}
        </div>
        
        <h3 
          class="text-h5 font-weight-bold mb-4"
          :class="roll.rollDirection === 'forward' ? 'text-primary' : 'text-secondary'"
        >
          {{ $t(`result.direction.${roll.rollDirection}`) }}
        </h3>

        <!-- Flow Visualizer -->
        <div class="d-flex align-center justify-center ga-4 text-body-1 my-4">
          <div class="page-bubble pa-3 border rounded-xl">
            <div class="text-caption text-medium-emphasis">{{ $t('result.from') }}</div>
            <div class="font-weight-bold text-primary">{{ $t('page') }} {{ wizardStore.fromPage }}</div>
          </div>
          
          <v-icon size="32" :color="roll.rollDirection === 'forward' ? 'primary' : 'secondary'">
            {{ isRtl ? (roll.rollDirection === 'forward' ? 'mdi-arrow-left' : 'mdi-arrow-right') : (roll.rollDirection === 'forward' ? 'mdi-arrow-right' : 'mdi-arrow-left') }}
          </v-icon>
          
          <div class="page-bubble pa-3 border rounded-xl">
            <div class="text-caption text-medium-emphasis">{{ $t('result.to') }}</div>
            <div class="font-weight-bold text-primary">{{ $t('page') }} {{ wizardStore.toPage }}</div>
          </div>
        </div>

        <!-- Crossing Books Banner -->
        <div 
          v-if="remainingAfterBook" 
          class="d-inline-flex align-center justify-center ga-1 mt-2 text-body-2 bg-surface-variant px-3 py-1 rounded-pill"
        >
          <v-icon size="16">mdi-book-open-page-variant-outline</v-icon>
          <span>{{
            $t('result.remainingAfterBook', {
              count: remainingAfterBook.count,
              book: $t(`group.${remainingAfterBook.bookKey}`)
            })
          }}</span>
        </div>
      </div>
      <div v-else class="py-6">
        <div class="text-body-2">{{ $t('result.noData') }}</div>
      </div>
    </v-card>

    <!-- Previews and External links -->
    <v-row class="mb-6">
      <v-col cols="12" md="6">
        <v-card variant="outlined" class="pa-4 rounded-xl text-center fill-height">
          <div class="text-subtitle-2 text-medium-emphasis mb-1">{{ $t('result.from') }}</div>
          <div class="text-h6 font-weight-bold mb-4">{{ fromPageTitle }}</div>
          
          <v-btn 
            variant="tonal" 
            color="primary" 
            prepend-icon="mdi-book-open-page-variant-outline"
            class="mb-2 w-100"
            @click="openPreview('from')"
          >
            {{ $t('preview.openPage') }}
          </v-btn>
          <v-btn 
            v-if="startingTikkunUrl"
            variant="text" 
            color="primary" 
            size="small"
            append-icon="mdi-open-in-new"
            class="w-100"
            :href="startingTikkunUrl"
            target="_blank"
          >
            {{ $t('preview.openTikkunShort') }}
          </v-btn>
        </v-card>
      </v-col>
      <v-col cols="12" md="6">
        <v-card variant="outlined" class="pa-4 rounded-xl text-center fill-height">
          <div class="text-subtitle-2 text-medium-emphasis mb-1">{{ $t('result.to') }}</div>
          <div class="text-h6 font-weight-bold mb-4">{{ toPageTitle }}</div>
          
          <v-btn 
            variant="tonal" 
            color="primary" 
            prepend-icon="mdi-book-open-page-variant-outline"
            class="mb-2 w-100"
            @click="openPreview('to')"
          >
            {{ $t('preview.openPage') }}
          </v-btn>
          <v-btn 
            v-if="destinationTikkunUrl"
            variant="text" 
            color="primary" 
            size="small"
            append-icon="mdi-open-in-new"
            class="w-100"
            :href="destinationTikkunUrl"
            target="_blank"
          >
            {{ $t('preview.openTikkunShort') }}
          </v-btn>
        </v-card>
      </v-col>
    </v-row>

    <!-- Bottom Actions -->
    <div class="d-flex flex-wrap justify-space-between ga-3 pt-4 border-top">
      <v-btn 
        variant="outlined" 
        size="large" 
        prepend-icon="mdi-refresh"
        @click="startOver"
      >
        {{ $t('onboarding.actions.exit') }}
      </v-btn>
      <v-btn 
        color="primary" 
        size="large" 
        prepend-icon="mdi-content-copy"
        @click="copyResult"
      >
        {{ shareButtonText }}
      </v-btn>
    </div>

    <!-- Page Preview Dialogs -->
    <PagePreviewDialog
      v-model="isPreviewOpen"
      :page="previewPage"
      :preview-columns="pagePreviewColumns"
      :tikkun-url="previewTikkunUrl"
    />
  </div>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue';
import { useRtl } from 'vuetify';
import { useI18n } from 'vue-i18n';
import Swal from 'sweetalert2';
import { useWizardStore } from '@/stores/wizard';
import { useOptionsStore } from '@/stores/options';
import { useTorahData } from '@/composables/torahData';
import { computeRoll, getPageTitleKeys, getPageStartRef } from '@/composables/utils';
import { getRemainingAfterBookForRoll } from '@/composables/rollResultUtils';
import { toRefUrl, toTikkunUrl } from '@/composables/tikkunLinks';
import { toPreviewColumns } from '@/composables/firstLineSearch';
import { findReadingTargetByKey } from '@/composables/readingTargets';

import PagePreviewDialog from '@/components/PagePreviewDialog.vue';

import type { Verse } from '@/types';

const BOOK_LABEL_KEYS = ['genesis', 'exodus', 'leviticus', 'numbers', 'deuteronomy'] as const;
type BookLabelKey = (typeof BOOK_LABEL_KEYS)[number];

const wizardStore = useWizardStore();
const optionsStore = useOptionsStore();
const { isRtl } = useRtl();
const { t } = useI18n();

const { 
  realDb: torahRealDb, 
  pageFirstLines: torahPageFirstLines, 
  pageTitlesKeys: torahPageTitles 
} = useTorahData();

// Share state
const shareButtonText = ref(t('onboarding.actions.next') === 'Next' ? 'Copy Result' : 'Copier le résultat');

// Preview State
const isPreviewOpen = ref(false);
const previewPage = ref<number | null>(null);
const activePreviewSide = ref<'from' | 'to'>('from');

// Calculated Roll
const roll = computed(() => {
  if (wizardStore.fromPage === null || wizardStore.toPage === null) return null;
  return computeRoll(wizardStore.fromPage, wizardStore.toPage);
});

// Book Cross Over Banner
const remainingAfterBook = computed<{ count: number; bookKey: BookLabelKey } | null>(() => {
  if (
    roll.value === null || 
    wizardStore.fromPage === null || 
    wizardStore.toPage === null || 
    wizardStore.fromPage === wizardStore.toPage
  ) {
    return null;
  }

  const remaining = getRemainingAfterBookForRoll(
    wizardStore.fromPage, 
    wizardStore.toPage, 
    torahRealDb.value
  );
  
  if (!remaining) return null;
  const bookKey = BOOK_LABEL_KEYS[remaining.bookIndex];
  if (!bookKey) return null;

  return { count: remaining.count, bookKey };
});

// Title and Reference Strings
const fromPageTitle = computed(() => {
  if (wizardStore.fromPage === null) return '';
  const ref = wizardStore.fromRef;
  const keys = getPageTitleKeys(
    wizardStore.fromPage,
    ref ? { book: ref.book, chapter: ref.chapter || 1, verse: ref.verse || 1 } : null,
    optionsStore.isInGola,
    torahPageTitles.value
  );
  return keys.map((key) => t(key)).join(t('separator'));
});

const toPageTitle = computed(() => {
  if (wizardStore.toPage === null) return '';
  const ref = wizardStore.toRef;
  const keys = getPageTitleKeys(
    wizardStore.toPage,
    ref ? { book: ref.book, chapter: ref.chapter || 1, verse: ref.verse || 1 } : null,
    optionsStore.isInGola,
    torahPageTitles.value
  );
  return keys.map((key) => t(key)).join(t('separator'));
});

// Tikkun Links
const startingTikkunUrl = computed(() => {
  if (wizardStore.fromPage === null) return null;
  
  const target = wizardStore.fromTargetKey ? 
    findReadingTargetByKey(wizardStore.fromTargetKey, optionsStore.isInGola) : null;
  const targetUrl = toTikkunUrl(target);
  if (targetUrl) return targetUrl;

  const pageStartRef = getPageStartRef(torahRealDb.value, wizardStore.fromPage);
  return pageStartRef ? toRefUrl(pageStartRef) : null;
});

const destinationTikkunUrl = computed(() => {
  if (wizardStore.toPage === null) return null;

  const target = wizardStore.toTargetKey ? 
    findReadingTargetByKey(wizardStore.toTargetKey, optionsStore.isInGola) : null;
  const targetUrl = toTikkunUrl(target);
  if (targetUrl) return targetUrl;

  const pageStartRef = getPageStartRef(torahRealDb.value, wizardStore.toPage);
  return pageStartRef ? toRefUrl(pageStartRef) : null;
});

// Previews
const openPreview = (side: 'from' | 'to') => {
  activePreviewSide.value = side;
  previewPage.value = side === 'from' ? wizardStore.fromPage : wizardStore.toPage;
  isPreviewOpen.value = true;
};

const pagePreviewColumns = computed(() => {
  if (previewPage.value === null) return [];
  return toPreviewColumns(torahPageFirstLines.value[previewPage.value - 1]);
});

const previewTikkunUrl = computed(() => {
  return activePreviewSide.value === 'from' ? startingTikkunUrl.value : destinationTikkunUrl.value;
});

// Actions
const startOver = () => {
  wizardStore.resetWizard();
};

const copyResult = async () => {
  if (!roll.value || wizardStore.fromPage === null || wizardStore.toPage === null) return;
  
  const directionText = t(`result.direction.${roll.value.rollDirection}`);
  const summaryText = `${t('result.title')}:\n` +
                      `- ${t('result.from')}: Page ${wizardStore.fromPage} (${fromPageTitle.value})\n` +
                      `- ${t('result.to')}: Page ${wizardStore.toPage} (${toPageTitle.value})\n` +
                      `- Roll: ${roll.value.pages} pages, ${directionText}`;

  try {
    await navigator.clipboard.writeText(summaryText);
    const successMsg = t('language') === 'English' ? 'Result copied to clipboard!' : (t('language') === 'Hebrew' ? 'התוצאה הועתקה ללוח!' : 'Résultat copié dans le presse-papiers !');
    
    await Swal.fire({
      toast: true,
      position: 'top-end',
      icon: 'success',
      title: successMsg,
      showConfirmButton: false,
      timer: 2000,
      timerProgressBar: true
    });
  } catch {
    // Fallback
  }
};
</script>

<style scoped>
.big-number {
  font-size: clamp(3rem, 10vw, 5rem);
  line-height: 1.1;
  background: linear-gradient(135deg, rgb(var(--v-theme-primary)), rgb(var(--v-theme-secondary)));
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
  display: inline-block;
  text-shadow: 0 0 40px rgba(var(--v-theme-primary), 0.25);
}

.result-summary-card {
  border-radius: 24px;
  background: linear-gradient(135deg, rgba(23, 37, 84, 0.6), rgba(20, 184, 166, 0.05)) !important;
  border: 1px solid rgba(20, 184, 166, 0.2) !important;
  box-shadow: 0 12px 32px rgba(15, 23, 42, 0.4), inset 0 0 20px rgba(20, 184, 166, 0.05) !important;
}

.page-bubble {
  min-width: 120px;
  background-color: rgba(15, 23, 42, 0.4);
  border: 1px solid rgba(248, 250, 252, 0.12) !important;
  backdrop-filter: blur(4px);
  transition: all 0.3s ease;
}

.page-bubble:hover {
  border-color: rgb(var(--v-theme-primary)) !important;
  box-shadow: 0 0 12px rgba(var(--v-theme-primary), 0.15);
}

.border-top {
  border-top: 1px solid rgba(248, 250, 252, 0.08) !important;
}
</style>
