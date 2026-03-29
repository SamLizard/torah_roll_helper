import { ref } from 'vue';

interface TutorialLanguageMenuControls {
  open: () => void;
  close: () => void;
}

interface TutorialNavDrawerControls {
  open: () => void;
  close: () => void;
}

const isLanguageMenuOpen = ref(false);
const tutorialLanguageMenuControls = ref<TutorialLanguageMenuControls | null>(null);
const tutorialNavDrawerControls = ref<TutorialNavDrawerControls | null>(null);

const setLanguageMenuOpen = (isOpen: boolean): void => {
  isLanguageMenuOpen.value = isOpen;
};

const setTutorialLanguageMenuControls = (controls: TutorialLanguageMenuControls | null): void => {
  tutorialLanguageMenuControls.value = controls;
};

const openTutorialLanguageMenu = (): void => {
  tutorialLanguageMenuControls.value?.open();
};

const closeTutorialLanguageMenu = (): void => {
  tutorialLanguageMenuControls.value?.close();
};

const setTutorialNavDrawerControls = (controls: TutorialNavDrawerControls | null): void => {
  tutorialNavDrawerControls.value = controls;
};

const openTutorialNavDrawer = (): void => {
  tutorialNavDrawerControls.value?.open();
};

const closeTutorialNavDrawer = (): void => {
  tutorialNavDrawerControls.value?.close();
};

export {
  isLanguageMenuOpen,
  openTutorialLanguageMenu,
  openTutorialNavDrawer,
  closeTutorialLanguageMenu,
  closeTutorialNavDrawer,
  setLanguageMenuOpen,
  setTutorialLanguageMenuControls,
  setTutorialNavDrawerControls,
};

export type {
  TutorialLanguageMenuControls,
  TutorialNavDrawerControls,
};
