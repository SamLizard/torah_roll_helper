import {
  createRouter,
  createWebHashHistory,
  type RouteRecordRaw,
} from "vue-router";
import { trackPageView } from '@/composables/analytics';
import HomeView from "../views/HomeView.vue";
import AboutView from "../views/AboutView.vue";
import HowToUseView from "../views/HowToUseView.vue";

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

router.afterEach((to) => {
  trackPageView(to.path, typeof to.name === 'string' ? to.name : undefined);
});

export default router;
