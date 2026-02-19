import {
  createRouter,
  createWebHashHistory,
  type RouteRecordRaw,
} from "vue-router";
import HomeView from "../views/HomeView.vue";
import AboutView from "../views/AboutView.vue";
import HowToUseView from "../views/HowToUseView.vue";

// TODO 10: add a real home page? So the current home is another view? Add an about page?
const routes: RouteRecordRaw[] = [
  {
    path: "/",
    redirect: "/home",
  },
  {
    path: "/home",
    name: "home",
    component: HomeView,
    meta: { icon: 'mdi-home', showInNav: true },
  },
  {
    path: '/about',
    name: 'about',
    component: AboutView,
    meta: { icon: 'mdi-information', showInNav: true }
  },
  {
    path: '/how-to',
    name: 'howTo',
    component: HowToUseView,
    meta: { icon: 'mdi-help-circle-outline', showInNav: true }
  }
];

const router = createRouter({
  history: createWebHashHistory(),
  routes,
});

export default router;
