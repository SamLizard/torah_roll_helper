<template>
  <v-list-item
    v-if="mode === 'list-item'"
    prepend-icon="mdi-share-variant"
    :title="$t('share.label')"
    @click="openPanel"
  >
    <v-list-item-subtitle class="text-caption">
      {{ $t('share.subtitle') }}
    </v-list-item-subtitle>
  </v-list-item>

  <v-btn
    v-else
    icon="mdi-share-variant"
    variant="text"
    :class="['ms-1', wrapperClass]"
    :aria-label="$t('share.label')"
    @click="openPanel"
  />

  <v-dialog
    v-model="panelOpen"
    max-width="520px"
    content-class="share-dialog-content"
    scrollable
  >
    <v-card class="rounded-xl">
      <v-card-title class="text-h6 font-weight-bold d-flex align-center">
        <v-icon start>mdi-share-variant</v-icon>
        {{ $t('share.title') }}
      </v-card-title>

      <v-card-text class="pt-2">
        <div class="mb-4">
          <label class="text-caption text-medium-emphasis">{{ $t('share.languagePrompt') }}</label>
          <language-selection v-model="shareLocale" class="share-lang" />
        </div>

        <label class="text-caption text-medium-emphasis">{{ $t('share.contentPrompt') }}</label>
        <v-btn-toggle
          v-model="content"
          mandatory
          divided
          density="compact"
          color="primary"
          class="d-flex mb-4 mt-1 share-content-toggle"
        >
          <v-btn value="full" size="small" class="flex-grow-1 px-1 text-caption">{{ $t('share.contentFull') }}</v-btn>
          <v-btn value="short" size="small" class="flex-grow-1 px-1 text-caption">{{ $t('share.contentShort') }}</v-btn>
          <v-btn value="link" size="small" class="flex-grow-1 px-1 text-caption">{{ $t('share.contentLink') }}</v-btn>
        </v-btn-toggle>

        <label class="text-caption text-medium-emphasis">{{ $t('share.previewLabel') }}</label>
        <v-textarea
          :model-value="previewText"
          readonly
          auto-grow
          rows="4"
          max-rows="10"
          variant="outlined"
          density="compact"
          hide-details
          class="mt-1 mb-4 share-preview"
          :dir="previewDir"
          :aria-label="$t('share.previewLabel')"
          @focus="selectAll"
        />

        <v-btn
          v-if="nativeShareAvailable"
          block
          color="primary"
          prepend-icon="mdi-share-variant"
          class="mb-3"
          @click="onNativeShare"
        >
          {{ $t('share.nativeShare') }}
        </v-btn>

        <div class="d-flex flex-wrap ga-2">
          <v-btn
            class="flex-grow-1"
            variant="tonal"
            prepend-icon="mdi-content-copy"
            @click="onCopy"
          >
            {{ $t('share.copy') }}
          </v-btn>
          <v-btn
            class="flex-grow-1"
            variant="tonal"
            color="#25D366"
            prepend-icon="mdi-whatsapp"
            @click="onWhatsApp"
          >
            {{ $t('share.whatsapp') }}
          </v-btn>
          <v-btn
            class="flex-grow-1"
            variant="tonal"
            prepend-icon="mdi-email-outline"
            @click="onEmail"
          >
            {{ $t('share.email') }}
          </v-btn>
        </div>
      </v-card-text>

      <v-card-actions>
        <v-spacer />
        <v-btn variant="text" @click="panelOpen = false">
          {{ $t('actions.close') }}
        </v-btn>
      </v-card-actions>
    </v-card>
  </v-dialog>
</template>

<script setup lang="ts">
import { computed, ref } from 'vue';
import { useI18n } from 'vue-i18n';
import LanguageSelection from '@/components/LanguageSelection.vue';
import { SUPPORTED_LOCALES, isSupportedLocale } from '@/plugins/i18n';
import { useShare, type ShareContent } from '@/composables/share';

withDefaults(
  defineProps<{
    mode?: 'icon' | 'list-item';
    wrapperClass?: string;
  }>(),
  {
    mode: 'icon',
    wrapperClass: '',
  },
);

const emit = defineEmits<{
  (e: 'open'): void;
}>();

const i18n = useI18n();

const {
  canNativeShare,
  buildShareText,
  openShareOpenedEvent,
  nativeShare,
  copyText,
  shareViaWhatsApp,
  shareViaEmail,
  showToast,
} = useShare();

const RTL_LOCALES = new Set(['he']);

const panelOpen = ref(false);
const nativeShareAvailable = canNativeShare();
const content = ref<ShareContent>('full');

const resolveInitialLocale = (): string =>
  isSupportedLocale(i18n.locale.value) ? i18n.locale.value : SUPPORTED_LOCALES[0];

const shareLocale = ref<string>(resolveInitialLocale());

const previewText = computed(() => buildShareText(shareLocale.value, content.value));
const previewDir = computed(() => (RTL_LOCALES.has(shareLocale.value) ? 'rtl' : 'ltr'));

const openPanel = (): void => {
  shareLocale.value = resolveInitialLocale();
  content.value = 'full';
  openShareOpenedEvent();
  emit('open');
  panelOpen.value = true;
};

const selectAll = (event: FocusEvent): void => {
  const target = event.target as HTMLTextAreaElement | null;
  target?.select();
};

const onNativeShare = async (): Promise<void> => {
  const result = await nativeShare(shareLocale.value, content.value);

  if (result === 'shared') {
    panelOpen.value = false;
    return;
  }

  if (result === 'error') {
    showToast('error', i18n.t('share.nativeFailed') as string);
  }
  // 'cancelled' / 'unsupported': keep the panel open with fallback options.
};

const onCopy = async (): Promise<void> => {
  await copyText(shareLocale.value, content.value);
};

const onWhatsApp = (): void => {
  shareViaWhatsApp(shareLocale.value, content.value);
};

const onEmail = (): void => {
  shareViaEmail(shareLocale.value, content.value);
};
</script>

<style scoped>
.share-content-toggle {
  height: 36px;
}

.share-content-toggle :deep(.v-btn) {
  min-width: 0;
  letter-spacing: 0;
}

.share-preview :deep(textarea) {
  font-size: 0.8rem;
  line-height: 1.4;
}

.share-lang {
  max-width: 140px;
}
</style>

<style>
/* Keep share feedback toasts above the Vuetify dialog overlay scrim. */
.share-toast-container {
  z-index: 30000 !important;
}

/*
 * Vuetify caps dialog content at `width: calc(100% - 48px)` with 24px margins,
 * which overrides max-width. On small screens widen the content and shrink the
 * margins so the share message is comfortably readable.
 */
@media (max-width: 400px) {
  .share-dialog-content.v-overlay__content {
    width: calc(100% - 16px) !important;
    max-width: calc(100% - 16px) !important;
    margin: 8px !important;
  }
}
</style>
