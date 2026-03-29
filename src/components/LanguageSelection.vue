<template>
  <div ref="rootRef" data-tutorial="language-selector">
    <v-select
      data-tutorial="language-select"
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
          {{ $t("language") }}
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
import { trackLanguageChange } from '@/composables/analytics';
import { setLanguageMenuOpen } from '@/composables/tutorialUi';

const i18n = useI18n();
const t = i18n.t;

const baseUrl = import.meta.env.BASE_URL || '/';
const isMenuOpen = ref(false);
const rootRef = ref<HTMLElement | null>(null);

interface LocaleItem {
  lang: string;
  text: string;
}

const selectedLocale = computed(() => i18n.locale.value);

const onLocaleChanged = (nextLocale: string | null) => {
  if (!nextLocale || nextLocale === i18n.locale.value) return;

  const previousLocale = i18n.locale.value;
  i18n.locale.value = nextLocale;
  trackLanguageChange(previousLocale, nextLocale);
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
  return i18n.availableLocales.filter((locale) => locale !== i18n.locale.value).map((lang) => ({
    lang: lang,
    text: t("language", 1, { locale: lang }) as string
  }))
});

watch(isMenuOpen, (isOpen) => {
  setLanguageMenuOpen(isOpen);
});

onUnmounted(() => {
  if (isMenuOpen.value) {
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
