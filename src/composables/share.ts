import { useI18n } from 'vue-i18n';
import { useRoute, type LocationQuery } from 'vue-router';
import { useDisplay, useRtl } from 'vuetify';
import Swal, { type SweetAlertPosition } from 'sweetalert2';
import { isSupportedLocale } from '@/plugins/i18n';
import {
  trackShareCompleted,
  trackShareOpened,
  type ShareMethod,
} from '@/composables/analytics';

const CANONICAL_ORIGIN = 'https://samlizard.github.io/torah_roll_helper/';
const FALLBACK_LOCALE = 'en';
const TOAST_TIMER_MS = 3000;

// What the shared payload contains.
type ShareContent = 'full' | 'short' | 'link';

type NavigatorWithShare = Navigator & {
  share?: (data: ShareData) => Promise<void>;
};

type NavigatorWithStandalone = Navigator & {
  standalone?: boolean;
};

const isAbortError = (error: unknown): boolean => {
  return error instanceof DOMException && error.name === 'AbortError';
};

// Detects whether the app is running as an installed PWA (standalone display).
const isStandalonePwa = (): boolean => {
  if (typeof window === 'undefined') {
    return false;
  }

  const standaloneDisplay = window.matchMedia('(display-mode: standalone)').matches;
  const iosStandalone = (window.navigator as NavigatorWithStandalone).standalone === true;

  return standaloneDisplay || iosStandalone;
};

const useShare = () => {
  const i18n = useI18n();
  const route = useRoute();
  const { smAndDown } = useDisplay();
  const { isRtl } = useRtl();

  const canNativeShare = (): boolean => {
    return typeof navigator !== 'undefined' && typeof (navigator as NavigatorWithShare).share === 'function';
  };

  const resolveLocale = (shareLocale: string): string => {
    if (isSupportedLocale(shareLocale)) {
      return shareLocale;
    }

    return isSupportedLocale(i18n.locale.value) ? i18n.locale.value : FALLBACK_LOCALE;
  };

  const serializeQuery = (query: LocationQuery, lang: string): string => {
    const params = new URLSearchParams();

    for (const [key, value] of Object.entries(query)) {
      if (key === 'lang') continue;

      if (Array.isArray(value)) {
        value.forEach((entry) => {
          if (entry != null) params.append(key, entry);
        });
      } else if (value != null) {
        params.append(key, value);
      }
    }

    params.set('lang', lang);
    return params.toString();
  };

  const buildShareLink = (shareLocale: string): string => {
    const lang = resolveLocale(shareLocale);
    const queryString = serializeQuery(route.query, lang);
    const hashPath = `${route.path}${queryString ? `?${queryString}` : ''}`;

    return `${CANONICAL_ORIGIN}#${hashPath}`;
  };

  const translate = (key: string, locale: string, named: Record<string, unknown> = {}): string => {
    const value = i18n.t(key, named, { locale });
    return typeof value === 'string' ? value : '';
  };

  const buildShareTitle = (shareLocale: string): string => {
    return translate('share.shareTitle', resolveLocale(shareLocale));
  };

  // Builds the text that will be shared, in the chosen message language. The
  // link is passed as a named i18n parameter ({link}) so vue-i18n interpolates
  // it for us and the message stays a normal, self-updating translation.
  const buildShareText = (shareLocale: string, content: ShareContent): string => {
    const lang = resolveLocale(shareLocale);
    const link = buildShareLink(lang);

    if (content === 'link') {
      return link;
    }

    const key = content === 'short' ? 'share.messageShort' : 'share.message';
    return translate(key, lang, { link });
  };

  const toastPosition = (): SweetAlertPosition => {
    if (smAndDown.value) {
      return 'top';
    }

    return isRtl.value ? 'top-start' : 'top-end';
  };

  const showToast = (icon: 'success' | 'error', title: string): void => {
    void Swal.fire({
      toast: true,
      position: toastPosition(),
      icon,
      title,
      showConfirmButton: false,
      timer: TOAST_TIMER_MS,
      timerProgressBar: true,
      customClass: {
        container: 'share-toast-container',
      },
    });
  };

  const openShareOpenedEvent = (): void => {
    trackShareOpened();
  };

  const nativeShare = async (
    shareLocale: string,
    content: ShareContent,
  ): Promise<'shared' | 'cancelled' | 'unsupported' | 'error'> => {
    if (!canNativeShare()) {
      return 'unsupported';
    }

    const lang = resolveLocale(shareLocale);
    const link = buildShareLink(lang);

    // For link-only we still pass url; otherwise the text already embeds the link.
    const data: ShareData =
      content === 'link'
        ? { title: buildShareTitle(lang), url: link }
        : { title: buildShareTitle(lang), text: buildShareText(lang, content) };

    try {
      await (navigator as NavigatorWithShare).share!(data);
      trackShareCompleted({ method: 'native', shareLocale: lang, content, appLocale: i18n.locale.value });
      return 'shared';
    } catch (error) {
      if (isAbortError(error)) {
        return 'cancelled';
      }

      return 'error';
    }
  };

  const copyText = async (shareLocale: string, content: ShareContent): Promise<boolean> => {
    const lang = resolveLocale(shareLocale);
    const text = buildShareText(lang, content);

    try {
      if (typeof navigator === 'undefined' || !navigator.clipboard) {
        throw new Error('Clipboard API unavailable');
      }

      await navigator.clipboard.writeText(text);
      trackShareCompleted({ method: 'copy-link', shareLocale: lang, content, appLocale: i18n.locale.value });
      showToast('success', i18n.t('share.copied') as string);
      return true;
    } catch {
      showToast('error', i18n.t('share.copyFailed') as string);
      return false;
    }
  };

  const shareViaWhatsApp = (shareLocale: string, content: ShareContent): void => {
    const lang = resolveLocale(shareLocale);
    const message = buildShareText(lang, content);
    const encoded = encodeURIComponent(message);

    trackShareCompleted({ method: 'whatsapp', shareLocale: lang, content, appLocale: i18n.locale.value });

    if (isStandalonePwa()) {
      // Inside an installed PWA, opening the https `wa.me` link spawns an
      // intermediate browser tab that deep-links into the WhatsApp app and is
      // then left behind blank (the PWA cannot close it). The `whatsapp://`
      // custom scheme is handled directly by the OS, which launches the app
      // without creating a tab and without navigating the PWA away.
      window.location.href = `whatsapp://send?text=${encoded}`;
      return;
    }

    // In a regular browser tab, use the api.whatsapp.com endpoint: unlike the
    // `wa.me` redirector (which can drop the text during the hand-off to the
    // desktop app in some browsers, e.g. Chrome), this passes the prefilled
    // message through reliably and needs no phone number.
    window.open(`https://api.whatsapp.com/send?text=${encoded}`, '_blank', 'noopener,noreferrer');
  };

  const shareViaEmail = (shareLocale: string, content: ShareContent): void => {
    const lang = resolveLocale(shareLocale);
    const subject = buildShareTitle(lang);
    const body = buildShareText(lang, content);
    const url = `mailto:?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;

    trackShareCompleted({ method: 'email', shareLocale: lang, content, appLocale: i18n.locale.value });
    window.location.href = url;
  };

  return {
    canNativeShare,
    buildShareLink,
    buildShareText,
    openShareOpenedEvent,
    nativeShare,
    copyText,
    shareViaWhatsApp,
    shareViaEmail,
    showToast,
  };
};

export { useShare };
export type { ShareMethod, ShareContent };
