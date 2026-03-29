import { ref } from 'vue';

interface TutorialLanguageMenuControls {
  open: () => void;
  close: () => void;
}

const isLanguageMenuOpen = ref(false);
const tutorialLanguageMenuControls = ref<TutorialLanguageMenuControls | null>(null);

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

export {
  isLanguageMenuOpen,
  openTutorialLanguageMenu,
  closeTutorialLanguageMenu,
  setLanguageMenuOpen,
  setTutorialLanguageMenuControls,
};

export type {
  TutorialLanguageMenuControls,
};
