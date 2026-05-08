type TutorialKind = 'quick' | 'full';

interface TutorialState {
  version: number;
  firstVisitedAt: string | null;
  hasSeenHowToPage: boolean;
  hasSeenTutorialPrompt: boolean;
  hasStartedTutorial: boolean;
  hasStartedQuickTutorial: boolean;
  hasStartedFullTutorial: boolean;
}

interface TutorialInitializationResult {
  state: TutorialState;
  isFirstVisit: boolean;
}

const STORAGE_KEY = 'trh:tutorial-state';
const STORAGE_VERSION = 1;

const createDefaultTutorialState = (): TutorialState => ({
  version: STORAGE_VERSION,
  firstVisitedAt: null,
  hasSeenHowToPage: false,
  hasSeenTutorialPrompt: false,
  hasStartedTutorial: false,
  hasStartedQuickTutorial: false,
  hasStartedFullTutorial: false,
});

const normalizeTutorialState = (state?: Partial<TutorialState> | null): TutorialState => ({
  version: STORAGE_VERSION,
  firstVisitedAt: typeof state?.firstVisitedAt === 'string' ? state.firstVisitedAt : null,
  hasSeenHowToPage: Boolean(state?.hasSeenHowToPage),
  hasSeenTutorialPrompt: Boolean(state?.hasSeenTutorialPrompt),
  hasStartedTutorial: Boolean(state?.hasStartedTutorial),
  hasStartedQuickTutorial: Boolean(state?.hasStartedQuickTutorial),
  hasStartedFullTutorial: Boolean(state?.hasStartedFullTutorial),
});

const canUseStorage = (): boolean => {
  return typeof window !== 'undefined' && typeof window.localStorage !== 'undefined';
};

const readTutorialState = (): TutorialState => {
  if (!canUseStorage()) {
    return createDefaultTutorialState();
  }

  try {
    const rawState = window.localStorage.getItem(STORAGE_KEY);

    if (!rawState) {
      return createDefaultTutorialState();
    }

    return normalizeTutorialState(JSON.parse(rawState) as Partial<TutorialState>);
  } catch {
    return createDefaultTutorialState();
  }
};

const writeTutorialState = (state: TutorialState): TutorialState => {
  const normalizedState = normalizeTutorialState(state);

  if (!canUseStorage()) {
    return normalizedState;
  }

  window.localStorage.setItem(STORAGE_KEY, JSON.stringify(normalizedState));
  return normalizedState;
};

const updateTutorialState = (updater: (state: TutorialState) => TutorialState): TutorialState => {
  const nextState = updater(readTutorialState());
  return writeTutorialState(nextState);
};

const initializeTutorialState = (): TutorialInitializationResult => {
  const currentState = readTutorialState();

  if (currentState.firstVisitedAt) {
    return {
      state: currentState,
      isFirstVisit: false,
    };
  }

  const initializedState = writeTutorialState({
    ...currentState,
    firstVisitedAt: new Date().toISOString(),
  });

  return {
    state: initializedState,
    isFirstVisit: true,
  };
};

const getTutorialState = (): TutorialState => {
  return readTutorialState();
};

const markHowToPageSeen = (): TutorialState => {
  return updateTutorialState((state) => ({
    ...state,
    hasSeenHowToPage: true,
  }));
};

const markTutorialPromptSeen = (): TutorialState => {
  return updateTutorialState((state) => ({
    ...state,
    hasSeenTutorialPrompt: true,
  }));
};

const markTutorialStarted = (tutorial: TutorialKind): TutorialState => {
  return updateTutorialState((state) => ({
    ...state,
    hasStartedTutorial: true,
    hasStartedQuickTutorial: tutorial === 'quick' ? true : state.hasStartedQuickTutorial,
    hasStartedFullTutorial: tutorial === 'full' ? true : state.hasStartedFullTutorial,
  }));
};

export {
  getTutorialState,
  initializeTutorialState,
  markHowToPageSeen,
  markTutorialPromptSeen,
  markTutorialStarted,
};
