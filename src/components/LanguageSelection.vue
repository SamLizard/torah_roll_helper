<template>
  <div>
    <v-select :items="otherLocales" item-title="text" item-value="lang" v-model="$i18n.locale" hide-details="auto" flat
      variant="solo" bg-color="transparent" type="hide">
      <template #selection="{ item }">
        <v-img :src="'/flags/' + item.value + '.svg'" min-width="50px" max-width="50px" />
        <div :class="'m' + ($vuetify.locale.rtl[$i18n.locale] ? 'r' : 'l') + '-2'">
          {{ $t("language") }}
        </div>
      </template>
      <template #item="{ item, props }">
        <v-list-item v-bind="props">
          <template #prepend>
            <v-img :src="'/flags/' + item.value + '.svg'"
              :class="'m' + ($vuetify.locale.rtl[$i18n.locale] ? 'l' : 'r') + '-2'" min-width="50px" max-width="50px" />
          </template>
        </v-list-item>
      </template>
    </v-select>
  </div>
</template>
<script setup lang="ts">
import { computed } from 'vue';
import { useI18n } from 'vue-i18n';

const i18n = useI18n();
const t = i18n.t;


interface LocaleItem {
  lang: string;
  text: string;
}

const otherLocales = computed((): LocaleItem[] => {
  return i18n.availableLocales.filter((locale) => locale !== i18n.locale.value).map((lang) => {
    return { lang: lang, text: t("language", 1, { locale: lang }) as string };
  })
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