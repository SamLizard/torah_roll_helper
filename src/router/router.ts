import {
  createRouter,
  createWebHashHistory,
  type RouteLocationNormalized,
  type RouteRecordRaw,
} from "vue-router";
import { trackPageView } from '@/composables/analytics';
import i18n, { isSupportedLocale, setLocale } from '@/plugins/i18n';
import HomeView from "../views/HomeView.vue";
import AboutView from "../views/AboutView.vue";
import HowToUseView from "../views/HowToUseView.vue";
import SavedScrollsView from "../views/SavedScrollsView.vue";

const routes: RouteRecordRaw[] = [
  {
    path: "/",
    redirect: "/home",
  },
  {
    path: "/home",
    name: "home",
    component: HomeView,
    meta: {
      icon: 'mdi-home',
      showInNav: true,
      titleKey: 'seo.routes.home.title',
      descriptionKey: 'seo.routes.home.description',
    },
  },
  {
    path: '/saved-scrolls',
    name: 'savedScrolls',
    component: SavedScrollsView,
    meta: {
      icon: 'mdi-bookshelf',
      showInNav: false,
      titleKey: 'seo.routes.savedScrolls.title',
      descriptionKey: 'seo.routes.savedScrolls.description',
    }
  },
  {
    path: '/about',
    name: 'about',
    component: AboutView,
    meta: {
      icon: 'mdi-information',
      showInNav: true,
      titleKey: 'seo.routes.about.title',
      descriptionKey: 'seo.routes.about.description',
    }
  },
  {
    path: '/how-to',
    name: 'howTo',
    component: HowToUseView,
    meta: {
      icon: 'mdi-help-circle-outline',
      showInNav: true,
      titleKey: 'seo.routes.howTo.title',
      descriptionKey: 'seo.routes.howTo.description',
    }
  }
];

const router = createRouter({
  history: createWebHashHistory(),
  routes,
});

const getQueryLang = (to: RouteLocationNormalized): string | undefined => {
  const queryLang = to.query.lang;
  const lang = Array.isArray(queryLang) ? queryLang[0] : queryLang;

  return isSupportedLocale(lang) ? lang : undefined;
};

// Keep the active language in sync with the URL so a shared link opens in the
// right language. The query param wins over the stored preference, and we add
// it back when missing so it persists as the user navigates.
router.beforeEach((to) => {
  const queryLang = getQueryLang(to);

  if (queryLang) {
    setLocale(queryLang);
    return true;
  }

  const currentLocale = (i18n.global.locale.value as any);

  return {
    ...to,
    query: { ...to.query, lang: currentLocale },
    replace: true,
  };
});

router.afterEach((to) => {
  trackPageView(to.path, typeof to.name === 'string' ? to.name : undefined);
});

export default router;
