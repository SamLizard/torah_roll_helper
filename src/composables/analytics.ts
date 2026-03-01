type LocationSide = 'from' | 'to';
type RollDirection = 'forward' | 'backward';

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
  trackFromToAction,
  trackLanguageChange,
  trackRollResultDisplayed,
  trackPageView,
};
