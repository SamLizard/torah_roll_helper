<template>
  <v-navigation-drawer v-model="drawer" temporary location="start">
    <v-list-item class="pa-4 pt-6" to="/" link>
      <v-list-item-title class="text-h6 font-weight-bold full-title-wrap">
        {{ $t("title") }}
      </v-list-item-title>
      <v-list-item-subtitle class="mt-1">Navigation</v-list-item-subtitle>
    </v-list-item>

    <v-divider></v-divider>

    <v-list nav active-color="primary">
      <v-list-item 
        v-for="route in navLinks" 
        :key="route.path" 
        :to="route.path"
        :prepend-icon="getRouteIcon(route)"
        :title="$t('routes.' + route.name?.toString())"
      />
    </v-list>

    <template v-slot:append>
      <div class="border-t">
        <v-list nav>
          <v-list-item
            prepend-icon="mdi-cog"
            :title="$t('settings.label')"
            @click="openSettingsPopup"
          >
            <v-list-item-subtitle class="text-caption">
              {{ $t('settings.subtitle') }}
            </v-list-item-subtitle>
          </v-list-item>
        </v-list>
        
        <div class="pa-4 pt-0">
          <language-selection :class="$vuetify.locale.isRtl ? 'rtl' : 'ltr'" />
        </div>
      </div>
    </template>
  </v-navigation-drawer>

  <v-app-bar app color="#f2f2f2" flat density="comfortable">
    <v-app-bar-nav-icon class="d-md-none" @click="drawer = !drawer" />

    <v-toolbar-title 
      class="font-weight-bold title-link text-truncate" 
      @click="router.push('/')"
    >
      {{ $t("title") }}
    </v-toolbar-title>

    <div class="d-none d-md-flex align-center flex-shrink-0">
      <v-btn
        v-for="route in navLinks"
        :key="route.path"
        :to="route.path"
        variant="text"
        class="mx-1"
        active-color="primary"
      >
        <v-icon start v-if="getRouteIcon(route)">{{ getRouteIcon(route) }}</v-icon>
        {{ $t("routes." + route.name?.toString()) }}
      </v-btn>
    </div>

    <v-spacer class="d-md-block d-none"></v-spacer>

    <div class="d-flex align-center flex-shrink-0 pe-2">
      <language-selection :class="$vuetify.locale.isRtl ? 'rtl' : 'ltr'" />
      <v-btn
        icon="mdi-cog"
        variant="text"
        class="ms-1"
        :aria-label="$t('settings.label')"
        @click="openSettingsPopup"
      />
    </div>
  </v-app-bar>

  <settings-dialog v-model="settingsPopupOpen" />
</template>

<script setup lang="ts">
import { computed, ref } from 'vue';
import { useRouter } from 'vue-router';
import LanguageSelection from "./LanguageSelection.vue";
import SettingsDialog from './SettingsDialog.vue';

const router = useRouter();
const drawer = ref(false);
const settingsPopupOpen = ref(false);

const navLinks = computed(() => {
  return router.getRoutes().filter(route => route.meta?.showInNav);
});

const getRouteIcon = (route: (typeof navLinks.value)[number]): string | undefined => {
  const icon = route.meta?.icon;
  return typeof icon === 'string' ? icon : undefined;
};

const openSettingsPopup = (): void => {
  // DONE: Implement your settings logic here
  settingsPopupOpen.value = true;
  drawer.value = false;
};
</script>

<style scoped>
.title-link {
  cursor: pointer;
  flex-grow: 1;
  min-width: 0;
  margin-right: 8px;
}

/* Allow the title in the drawer to take multiple lines so it's readable */
.full-title-wrap {
  white-space: normal !important;
  line-height: 1.2;
  word-break: break-word;
}

.flex-shrink-0 {
  flex-shrink: 0;
}

.border-t {
  border-top: 1px solid rgba(0, 0, 0, 0.12);
}

/* Visually highlight the active button on desktop */
.v-btn--active {
  font-weight: bold;
}
</style>
