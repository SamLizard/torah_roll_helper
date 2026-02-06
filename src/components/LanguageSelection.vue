<template>
  <div>
    <v-select :items="otherLocales" item-title="text" item-value="lang" v-model="$i18n.locale" hide-details="auto" flat
      variant="solo" bg-color="transparent" type="hide">
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
import { computed, ref, type Ref } from 'vue';
import { useI18n } from 'vue-i18n';

const i18n = useI18n();
const t = i18n.t;

const baseUrl = import.meta.env.BASE_URL || '/';

interface LocaleItem {
  lang: string;
  text: string;
}

const otherLocales = computed((): LocaleItem[] => {
  return i18n.availableLocales.filter((locale) => locale !== i18n.locale.value).map((lang) => ({
    lang: lang,
    text: t("language", 1, { locale: lang }) as string
  }))
})
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