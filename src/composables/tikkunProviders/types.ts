import type { TargetSpecific, TargetType } from '@/composables/readingTargets';
import type { TorahRef, Verse } from '@/types';

interface TikkunLinkTarget {
  key: string;
  type: TargetType;
  specific: TargetSpecific;
  ref: TorahRef;
}

interface TikkunRoute {
  route: 'p' | 'h';
  slug: string;
}

type TikkunProviderId = 'tikkun_io' | 'sefaria';
type TikkunProviderSelection = 'auto' | TikkunProviderId;
type TikkunLinkSource = 'reading' | 'ref' | 'page';

interface TikkunProviderCapabilities {
  readings: boolean;
  refs: boolean;
  pages: boolean;
}

interface TikkunProvider {
  id: TikkunProviderId;
  nameKey: string;
  descriptionKey: string;
  supportedLayoutKeys: readonly string[] | null;
  capabilities: TikkunProviderCapabilities;
  getReadingUrl: (target: TikkunLinkTarget | null) => string | null;
  getRefUrl: (ref: Verse | null) => string | null;
  getPageUrl: (page: number | null, layoutKey: string) => string | null;
}

interface TikkunProviderSelectionOption {
  id: TikkunProviderSelection;
  nameKey: string;
  descriptionKey: string;
}

interface ResolveTikkunLinkInput {
  providerSelection: TikkunProviderSelection;
  layoutKey: string;
  target?: TikkunLinkTarget | null;
  ref?: Verse | null;
  page?: number | null;
}

interface TikkunResolvedLink {
  url: string;
  source: TikkunLinkSource;
  providerId: TikkunProviderId;
  providerNameKey: string;
  providerSupportedLayoutKeys: readonly string[] | null;
  selectedLayoutKey: string;
  hasLayoutWarning: boolean;
}

export type {
  ResolveTikkunLinkInput,
  TikkunLinkSource,
  TikkunLinkTarget,
  TikkunProvider,
  TikkunProviderCapabilities,
  TikkunProviderId,
  TikkunProviderSelection,
  TikkunProviderSelectionOption,
  TikkunResolvedLink,
  TikkunRoute,
};