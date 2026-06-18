import { getReadingUrl, getRefUrl, getTikkunRouteForTarget } from '@/composables/tikkunProviders/tikkunIo';
import { resolveTikkunLink } from '@/composables/tikkunProviders';
import type { Verse } from '@/types';

const toRefUrl = (ref: Verse) => getRefUrl(ref) ?? '';
const toTikkunUrl = getReadingUrl;

export {
  getTikkunRouteForTarget,
  resolveTikkunLink,
  toRefUrl,
  toTikkunUrl,
};

export type {
  TikkunLinkTarget,
  TikkunProviderSelection,
  TikkunResolvedLink,
  TikkunRoute,
} from '@/composables/tikkunProviders/types';
