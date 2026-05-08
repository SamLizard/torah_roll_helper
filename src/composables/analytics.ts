type LocationSide = 'from' | 'to';
type RollDirection = 'forward' | 'backward';
type TutorialKind = 'quick' | 'full';
type TutorialEventAction = 'open' | 'close' | 'advanced-details';
type TutorialPromptAction = 'shown' | 'opened-quick-tutorial';
type FirstLineSearchSource = 'manual' | 'camera-fallback' | 'tutorial';
type FirstLineSearchStatus = 'success' | 'no-result';
type FirstLineSearchMode = 'line-start' | 'inside-line';
type PhotoAttemptOutcome = 'single-result' | 'multiple-results' | 'no-result' | 'error';
type PhotoSuccessType = 'single-result' | 'multiple-results';

interface GoatCounterCountPayload {
  path: string;
  title: string;
  event?: boolean;
}

interface TrackFromToActionInput {
  side: LocationSide;
  action: string;
  value?: string | number | null;
}

interface TrackRollResultDisplayedInput {
  direction: RollDirection;
  pages: number;
}

interface TrackTutorialEventInput {
  tutorial: TutorialKind;
  action: TutorialEventAction;
  progressPercent?: number;
  step?: number;
  totalSteps?: number;
  durationSeconds?: number;
  source?: string | null;
}

interface TrackFirstLineSearchOutcomeInput {
  side: LocationSide;
  source: FirstLineSearchSource;
  status: FirstLineSearchStatus;
  mode: FirstLineSearchMode;
  lettersCount: number;
  firstResultLettersCount?: number | null;
}

interface TrackPhotoAttemptOutcomeInput {
  side: LocationSide;
  outcome: PhotoAttemptOutcome;
  multipleResultCount?: number | null;
}

interface TrackPhotoSuccessInput {
  side: LocationSide;
  successType: PhotoSuccessType;
  triesBeforeSuccess: number;
  multiResultRetakesBeforeSuccess: number;
}

interface TrackPhotoMultiResultSelectionInput {
  side: LocationSide;
  position: number;
  totalOptions: number;
}

interface GoatCounterApi {
  count?: (payload: GoatCounterCountPayload) => void;
}

interface GoatCounterWindow extends Window {
  goatcounter?: GoatCounterApi;
  __trhGoatcounterLoading?: boolean;
  __trhGoatcounterQueue?: GoatCounterCountPayload[];
}

const GOATCOUNTER_URL = String(import.meta.env.VITE_GOATCOUNTER_URL ?? '').trim();
const GOATCOUNTER_SCRIPT_SRC = 'https://gc.zgo.at/count.js';
const EVENT_PATH_PREFIX = '/torah-roll-helper/actions';
const ROLL_RESULTS_PATH_PREFIX = '/torah-roll-helper/roll-results';

const isAnalyticsEnabled = () => GOATCOUNTER_URL.length > 0;

const toSlug = (value: string) =>
  value
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');

const normalizeMetricCount = (value: number) => Math.max(0, Math.round(value));

const getGoatCounterWindow = () => window as GoatCounterWindow;

const bootstrapAnalytics = () => {
  if (typeof window === 'undefined' || !isAnalyticsEnabled()) return;

  const goatCounterWindow = getGoatCounterWindow();
  if (goatCounterWindow.goatcounter?.count || goatCounterWindow.__trhGoatcounterLoading) return;

  const existingScript = document.querySelector<HTMLScriptElement>(
    'script[data-trh-goatcounter="true"]'
  );
  if (existingScript) return;

  goatCounterWindow.__trhGoatcounterLoading = true;

  const script = document.createElement('script');
  script.async = true;
  script.src = GOATCOUNTER_SCRIPT_SRC;
  script.dataset.goatcounter = GOATCOUNTER_URL;
  script.dataset.trhGoatcounter = 'true';
  script.addEventListener('load', () => {
    goatCounterWindow.__trhGoatcounterLoading = false;
    const queue = goatCounterWindow.__trhGoatcounterQueue ?? [];
    goatCounterWindow.__trhGoatcounterQueue = [];

    const count = goatCounterWindow.goatcounter?.count;
    if (!count) return;

    for (const payload of queue) {
      count(payload);
    }
  });
  script.addEventListener('error', () => {
    goatCounterWindow.__trhGoatcounterLoading = false;
    goatCounterWindow.__trhGoatcounterQueue = [];
  });

  document.head.appendChild(script);
};

const trackGoatCounterEvent = (payload: GoatCounterCountPayload) => {
  if (typeof window === 'undefined' || !isAnalyticsEnabled()) return;

  const goatCounterWindow = getGoatCounterWindow();
  const count = goatCounterWindow.goatcounter?.count;

  if (count) {
    count(payload);
    return;
  }

  goatCounterWindow.__trhGoatcounterQueue = [
    ...(goatCounterWindow.__trhGoatcounterQueue ?? []),
    payload,
  ];
  bootstrapAnalytics();
};

const trackFromToAction = ({ side, action, value }: TrackFromToActionInput) => {
  if (!isAnalyticsEnabled()) return;

  const eventPathSegments = [
    EVENT_PATH_PREFIX,
    side,
    toSlug(action),
    value == null ? '' : toSlug(String(value)),
  ].filter((segment) => segment.length > 0);

  const path = eventPathSegments.join('/');
  const title = `${side}:${action}${value == null ? '' : `:${value}`}`;

  trackGoatCounterEvent({
    path,
    title,
    event: true,
  });
};

const trackLanguageChange = (fromLocale: string, toLocale: string) => {
  if (!isAnalyticsEnabled()) return;
  if (fromLocale === toLocale) return;

  const path = `${EVENT_PATH_PREFIX}/language-change/${toSlug(fromLocale)}/${toSlug(toLocale)}`;
  const title = `language-change:${fromLocale}:${toLocale}`;

  trackGoatCounterEvent({
    path,
    title,
    event: true,
  });
};

const trackGolaChoice = (isInGola: boolean) => {
  if (!isAnalyticsEnabled()) return;

  const selectedLocation = isInGola ? 'gola' : 'israel';
  const path = `${EVENT_PATH_PREFIX}/location-mode/${selectedLocation}`;
  const title = `location-mode:${selectedLocation}`;

  trackGoatCounterEvent({
    path,
    title,
    event: true,
  });
};

const trackRollResultDisplayed = ({ direction, pages }: TrackRollResultDisplayedInput) => {
  if (!isAnalyticsEnabled()) return;

  const path = `${ROLL_RESULTS_PATH_PREFIX}/${toSlug(direction)}/${pages}`;
  const title = `roll-result:${direction}:${pages}`;

  trackGoatCounterEvent({
    path,
    title,
    event: true,
  });
};

const trackTutorialEvent = ({
  tutorial,
  action,
  progressPercent,
  step,
  totalSteps,
  durationSeconds,
  source,
}: TrackTutorialEventInput) => {
  if (!isAnalyticsEnabled()) return;

  const normalizedProgress = progressPercent == null ? null : Math.max(0, Math.min(100, Math.round(progressPercent)));
  const normalizedDurationSeconds =
    durationSeconds == null ? null : Math.max(0, Math.round(durationSeconds));

  const pathSegments = [
    EVENT_PATH_PREFIX,
    'tutorial',
    tutorial,
    action,
    normalizedProgress == null ? '' : `progress-${normalizedProgress}`,
    source ? `source-${toSlug(source)}` : '',
  ].filter((segment) => segment.length > 0);

  const titleSegments = [
    'tutorial',
    tutorial,
    action,
    step == null || totalSteps == null ? '' : `step:${step}/${totalSteps}`,
    normalizedProgress == null ? '' : `progress:${normalizedProgress}`,
    normalizedDurationSeconds == null ? '' : `duration:${normalizedDurationSeconds}`,
    source ? `source:${source}` : '',
  ].filter((segment) => segment.length > 0);

  trackGoatCounterEvent({
    path: pathSegments.join('/'),
    title: titleSegments.join(':'),
    event: true,
  });
};

const trackTutorialPromptEvent = (action: TutorialPromptAction) => {
  if (!isAnalyticsEnabled()) return;

  const path = `${EVENT_PATH_PREFIX}/tutorial-prompt/${toSlug(action)}`;
  const title = `tutorial-prompt:${action}`;

  trackGoatCounterEvent({
    path,
    title,
    event: true,
  });
};

const trackFirstLineSearchOutcome = ({
  side,
  source,
  status,
  mode,
  lettersCount,
  firstResultLettersCount,
}: TrackFirstLineSearchOutcomeInput) => {
  if (!isAnalyticsEnabled()) return;

  const normalizedLettersCount = normalizeMetricCount(lettersCount);
  const normalizedFirstResultLettersCount =
    firstResultLettersCount == null ? null : normalizeMetricCount(firstResultLettersCount);
  const actionBase = `first-line-search-${status}-${source}-${mode}`;

  trackFromToAction({ side, action: actionBase });
  trackFromToAction({
    side,
    action: `${actionBase}-letters`,
    value: normalizedLettersCount,
  });

  if (normalizedFirstResultLettersCount != null) {
    trackFromToAction({
      side,
      action: `${actionBase}-first-result-letters`,
      value: normalizedFirstResultLettersCount,
    });
  }
};

const trackPhotoAttemptOutcome = ({
  side,
  outcome,
  multipleResultCount,
}: TrackPhotoAttemptOutcomeInput) => {
  if (!isAnalyticsEnabled()) return;

  trackFromToAction({ side, action: `photo-attempt-${outcome}` });

  if (outcome === 'multiple-results' && multipleResultCount != null) {
    trackFromToAction({
      side,
      action: 'photo-attempt-multiple-results-count',
      value: normalizeMetricCount(multipleResultCount),
    });
  }
};

const trackPhotoSuccess = ({
  side,
  successType,
  triesBeforeSuccess,
  multiResultRetakesBeforeSuccess,
}: TrackPhotoSuccessInput) => {
  if (!isAnalyticsEnabled()) return;

  trackFromToAction({
    side,
    action: `photo-success-${successType}-tries`,
    value: normalizeMetricCount(triesBeforeSuccess),
  });
  trackFromToAction({
    side,
    action: 'photo-success-multi-result-retakes',
    value: normalizeMetricCount(multiResultRetakesBeforeSuccess),
  });
};

const trackPhotoMultiResultSelection = ({
  side,
  position,
  totalOptions,
}: TrackPhotoMultiResultSelectionInput) => {
  if (!isAnalyticsEnabled()) return;

  const normalizedPosition = normalizeMetricCount(position) + 1;
  const normalizedTotalOptions = Math.max(normalizedPosition, normalizeMetricCount(totalOptions));

  trackFromToAction({
    side,
    action: 'photo-multiple-results-choice-position',
    value: `${normalizedPosition}-of-${normalizedTotalOptions}`,
  });
};

const trackPhotoMultiResultRetake = (side: LocationSide) => {
  if (!isAnalyticsEnabled()) return;

  trackFromToAction({ side, action: 'photo-multiple-results-retake' });
};

const trackPageView = (routePath: string, routeName?: string) => {
  if (!isAnalyticsEnabled()) return;

  const normalizedRoutePath = routePath.startsWith('/') ? routePath : `/${routePath}`;
  const pagePath = `/torah_roll_helper${normalizedRoutePath}`;
  const pageTitle = routeName ? `Torah Roll Helper - ${routeName}` : 'Torah Roll Helper';

  trackGoatCounterEvent({
    path: pagePath,
    title: pageTitle,
  });
};

export {
  bootstrapAnalytics,
  trackFirstLineSearchOutcome,
  trackFromToAction,
  trackGolaChoice,
  trackLanguageChange,
  trackPhotoAttemptOutcome,
  trackPhotoMultiResultRetake,
  trackPhotoMultiResultSelection,
  trackPhotoSuccess,
  trackRollResultDisplayed,
  trackPageView,
  trackTutorialEvent,
  trackTutorialPromptEvent,
};

export type {
  FirstLineSearchMode,
  FirstLineSearchSource,
};
