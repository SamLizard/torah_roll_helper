<template>
  <v-app-bar app color="#f2f2f2" :align="$vuetify.locale.isRtl ? 'right' : 'left'" class="navbar" flat>
    <v-toolbar-title>
      <strong>{{ $t("title") }}</strong>
    </v-toolbar-title>
    <div class="route-links-container">
      <v-btn v-for="route in router.getRoutes()" v-show="showRoute(route)" :key="route.path"
        :color="route.path === router.currentRoute.value.path ? 'primary' : ''" :to="route.path" variant="elevated"
        active-class="no-active" flex-grow>
        {{ $t("routes." + route.name?.toString()) }}
      </v-btn>
    </div>
    <v-spacer v-for="i in 3" :key="i"></v-spacer>
    <div>
      <v-toolbar-items>
        <language-selection :class="$vuetify.locale.isRtl ? 'rtl' : 'ltr'" />
      </v-toolbar-items>
    </div>
  </v-app-bar>
</template>

<script setup lang="ts">
import { useRouter } from 'vue-router';
import LanguageSelection from "./LanguageSelection.vue";

const router = useRouter();

const allowedRoutes = ['home'];

const showRoute = (route: any): boolean => {
  return !allowedRoutes.includes(route.name) || route.name === 'home';
};
</script>
<style scoped>
.navbar {
  background-color: #f2f2f2;
  /*#f8f9fa;*/
}

.route-links-container {
  display: flex;
  justify-content: space-evenly;
  flex-grow: 0.5 !important;
  min-width: 10% !important;
  max-width: 40% !important;
}

.v-toolbar-title {
  flex-grow: 0.8;
  flex-shrink: 0.8;
  min-width: max-content !important;
}
</style>