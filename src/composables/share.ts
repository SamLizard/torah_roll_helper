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

type NavigatorWithShare = Navigator & {
  share?: (data: ShareData) => Promise<void>;
};

const isAbortError = (error: unknown): boolean => {
  return error instanceof DOMException && error.name === 'AbortError';
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

  const translate = (key: string, locale: string): string => {
    const value = i18n.t(key, {}, { locale });
    return typeof value === 'string' ? value : '';
  };

  const buildShareTitle = (shareLocale: string): string => {
    return translate('share.shareTitle', resolveLocale(shareLocale));
  };

  const buildShareText = (shareLocale: string): string => {
    return translate('share.shareText', resolveLocale(shareLocale));
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
    });
  };

  const openShareOpenedEvent = (): void => {
    trackShareOpened();
  };

  const nativeShare = async (shareLocale: string): Promise<'shared' | 'cancelled' | 'unsupported' | 'error'> => {
    if (!canNativeShare()) {
      return 'unsupported';
    }

    const lang = resolveLocale(shareLocale);

    try {
      await (navigator as NavigatorWithShare).share!({
        title: buildShareTitle(lang),
        text: buildShareText(lang),
        url: buildShareLink(lang),
      });

      trackShareCompleted('native', lang);
      return 'shared';
    } catch (error) {
      if (isAbortError(error)) {
        return 'cancelled';
      }

      return 'error';
    }
  };

  const copyLink = async (shareLocale: string): Promise<boolean> => {
    const lang = resolveLocale(shareLocale);
    const link = buildShareLink(lang);

    try {
      if (typeof navigator === 'undefined' || !navigator.clipboard) {
        throw new Error('Clipboard API unavailable');
      }

      await navigator.clipboard.writeText(link);
      trackShareCompleted('copy-link', lang);
      showToast('success', i18n.t('share.copied') as string);
      return true;
    } catch {
      showToast('error', i18n.t('share.copyFailed') as string);
      return false;
    }
  };

  const shareViaWhatsApp = (shareLocale: string): void => {
    const lang = resolveLocale(shareLocale);
    const message = `${buildShareText(lang)}\n${buildShareLink(lang)}`;
    const url = `https://wa.me/?text=${encodeURIComponent(message)}`;
    const opened = window.open(url, '_blank', 'noopener,noreferrer');

    if (!opened) {
      showToast('error', i18n.t('share.openFailed') as string);
      return;
    }

    trackShareCompleted('whatsapp', lang);
  };

  const shareViaEmail = (shareLocale: string): void => {
    const lang = resolveLocale(shareLocale);
    const subject = buildShareTitle(lang);
    const body = `${buildShareText(lang)}\n\n${buildShareLink(lang)}`;
    const url = `mailto:?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;

    window.location.href = url;
    trackShareCompleted('email', lang);
  };

  return {
    canNativeShare,
    buildShareLink,
    openShareOpenedEvent,
    nativeShare,
    copyLink,
    shareViaWhatsApp,
    shareViaEmail,
    showToast,
  };
};

export { useShare };
export type { ShareMethod };
