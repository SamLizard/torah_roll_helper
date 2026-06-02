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
    class="ms-1"
    :aria-label="$t('share.label')"
    @click="openPanel"
  />

  <v-dialog v-model="panelOpen" max-width="460px">
    <v-card class="rounded-xl">
      <v-card-title class="text-h6 font-weight-bold d-flex align-center">
        <v-icon start>mdi-share-variant</v-icon>
        {{ $t('share.title') }}
      </v-card-title>

      <v-card-text class="pt-2">
        <p class="text-body-2 mb-3">{{ $t('share.languagePrompt') }}</p>

        <v-btn-toggle
          v-model="shareLocale"
          mandatory
          divided
          color="primary"
          class="d-flex mb-4 share-lang-toggle"
        >
          <v-btn
            v-for="locale in localeOptions"
            :key="locale.value"
            :value="locale.value"
            class="flex-grow-1"
            :aria-label="locale.label"
          >
            <v-img :src="`${baseUrl}flags/${locale.value}.svg`" width="28" class="me-2" />
            <span class="text-caption">{{ locale.label }}</span>
          </v-btn>
        </v-btn-toggle>

        <v-text-field
          :model-value="shareLink"
          readonly
          variant="outlined"
          density="compact"
          hide-details
          class="mb-3 share-link-field"
          :aria-label="$t('share.linkLabel')"
          @focus="selectLinkText"
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
            @click="onCopyLink"
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
import { SUPPORTED_LOCALES, isSupportedLocale } from '@/plugins/i18n';
import { useShare } from '@/composables/share';

interface LocaleOption {
  value: string;
  label: string;
}

withDefaults(
  defineProps<{
    mode?: 'icon' | 'list-item';
  }>(),
  {
    mode: 'icon',
  },
);

const emit = defineEmits<{
  (e: 'open'): void;
}>();

const i18n = useI18n();
const baseUrl = import.meta.env.BASE_URL || '/';

const {
  canNativeShare,
  buildShareLink,
  openShareOpenedEvent,
  nativeShare,
  copyLink,
  shareViaWhatsApp,
  shareViaEmail,
  showToast,
} = useShare();

const panelOpen = ref(false);
const nativeShareAvailable = canNativeShare();
const defaultLocale = isSupportedLocale(i18n.locale.value) ? i18n.locale.value : SUPPORTED_LOCALES[0];
const shareLocale = ref<string>(defaultLocale);

const localeOptions = computed<LocaleOption[]>(() => {
  return SUPPORTED_LOCALES.map((value) => ({
    value,
    label: i18n.t('language', 1, { locale: value }) as string,
  }));
});

const shareLink = computed(() => buildShareLink(shareLocale.value));

const openPanel = (): void => {
  shareLocale.value = isSupportedLocale(i18n.locale.value) ? i18n.locale.value : SUPPORTED_LOCALES[0];
  openShareOpenedEvent();
  emit('open');
  panelOpen.value = true;
};

const selectLinkText = (event: FocusEvent): void => {
  const target = event.target as HTMLInputElement | null;
  target?.select();
};

const onNativeShare = async (): Promise<void> => {
  const result = await nativeShare(shareLocale.value);

  if (result === 'shared') {
    panelOpen.value = false;
    return;
  }

  if (result === 'error') {
    showToast('error', i18n.t('share.nativeFailed') as string);
  }
  // 'cancelled' / 'unsupported': keep the panel open with fallback options.
};

const onCopyLink = async (): Promise<void> => {
  await copyLink(shareLocale.value);
};

const onWhatsApp = (): void => {
  shareViaWhatsApp(shareLocale.value);
};

const onEmail = (): void => {
  shareViaEmail(shareLocale.value);
};
</script>

<style scoped>
.share-lang-toggle {
  height: 48px;
}

.share-link-field :deep(input) {
  font-size: 0.8rem;
}
</style>
