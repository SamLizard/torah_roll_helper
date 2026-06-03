<template>
  <div ref="rootRef" :data-tutorial="appMode ? 'language-selector' : undefined">
    <v-select
      :data-tutorial="appMode ? 'language-select' : undefined"
      v-model:menu="isMenuOpen"
      :items="otherLocales"
      item-title="text"
      item-value="lang"
      :model-value="selectedLocale"
      :menu-props="{ contentClass: 'tutorial-language-menu' }"
      hide-details="auto"
      flat
      variant="solo"
      bg-color="transparent"
      type="hide"
      @update:model-value="onLocaleChanged"
    >
      <template #selection="{ item }">
        <v-img :src="`${baseUrl}flags/${item.value}.svg`" width="50" />
        <div class="ms-2">
          {{ appMode ? $t("language") : $t("language", 1, { locale: item.value }) }}
        </div>
      </template>
      <template #item="{ item, props }">
        <v-list-item v-bind="props">
          <template #prepend>
            <v-img :src="`${baseUrl}flags/${item.value}.svg`" class="me-2" width="50"/>
          </template>
        </v-list-item>
      </template>
    </v-select>
  </div>
</template>
<script setup lang="ts">
import { computed, onUnmounted, ref, watch } from 'vue';
import { useI18n } from 'vue-i18n';
import { useRouter } from 'vue-router';
import { trackLanguageChange } from '@/composables/analytics';
import { LANGUAGE_STORAGE_KEY } from '@/composables/storageKeys';
import { setLanguageMenuOpen } from '@/composables/tutorialUi';

const props = defineProps<{
  // When provided, the component is "controlled": it selects this locale and
  // emits changes instead of switching the whole app language. Used to pick a
  // message language (e.g. in the share dialog) without affecting the site.
  modelValue?: string;
}>();

const emit = defineEmits<{
  (e: 'update:modelValue', value: string): void;
}>();

const i18n = useI18n();
const t = i18n.t;
const router = useRouter();

const baseUrl = import.meta.env.BASE_URL || '/';
const isMenuOpen = ref(false);
const rootRef = ref<HTMLElement | null>(null);

interface LocaleItem {
  lang: string;
  text: string;
}

const appMode = computed(() => props.modelValue === undefined);

const selectedLocale = computed(() =>
  appMode.value ? i18n.locale.value : (props.modelValue as string),
);

const onLocaleChanged = (nextLocale: string | null) => {
  if (!nextLocale || nextLocale === selectedLocale.value) return;

  if (!appMode.value) {
    emit('update:modelValue', nextLocale);
    return;
  }

  const previousLocale = i18n.locale.value;
  i18n.locale.value = nextLocale;
  window.localStorage.setItem(LANGUAGE_STORAGE_KEY, nextLocale);
  trackLanguageChange(previousLocale, nextLocale);

  // Reflect the chosen language in the URL so the current view can be shared
  // and reopened directly in this language.
  void router.replace({
    query: { ...router.currentRoute.value.query, lang: nextLocale },
  });
};

const openMenu = (): void => {
  isMenuOpen.value = true;
};

const closeMenu = (): void => {
  isMenuOpen.value = false;
};

const isVisible = (): boolean => {
  const element = rootRef.value;
  if (!element) return false;

  const style = window.getComputedStyle(element);
  if (style.display === 'none' || style.visibility === 'hidden') {
    return false;
  }

  const rect = element.getBoundingClientRect();
  return (
    rect.width > 0 &&
    rect.height > 0 &&
    rect.bottom > 0 &&
    rect.right > 0 &&
    rect.top < window.innerHeight &&
    rect.left < window.innerWidth
  );
};

const otherLocales = computed((): LocaleItem[] => {
  return i18n.availableLocales.filter((locale) => locale !== selectedLocale.value).map((lang) => ({
    lang: lang,
    text: t("language", 1, { locale: lang }) as string
  }))
});

watch(isMenuOpen, (isOpen) => {
  if (!appMode.value) return;
  setLanguageMenuOpen(isOpen);
});

onUnmounted(() => {
  if (appMode.value && isMenuOpen.value) {
    setLanguageMenuOpen(false);
  }
});

defineExpose({
  openMenu,
  closeMenu,
  isVisible,
});
</script>
<style scoped>
.v-text-field :deep(.v-field__input) {
  padding: 0px !important;
}

.v-text-field :deep(.v-field--appended) {
  padding: 0px !important;
}
</style>
<style>
i.v-select__menu-icon {
  margin: 0px !important;
}
</style>
