import { sefariaProvider } from './sefaria';
import { tikkunIoProvider } from './tikkunIo';
import { getFaviconUrl } from './utils';
import type {
  ResolveTikkunLinkInput,
  TikkunLinkSource,
  TikkunProvider,
  TikkunProviderId,
  TikkunProviderSelection,
  TikkunProviderSelectionOption,
  TikkunResolvedLink,
} from './types';

const AUTO_TIKKUN_PROVIDER_ID = 'auto';
const TIKKUN_PROVIDERS = [tikkunIoProvider, sefariaProvider] as const satisfies readonly TikkunProvider[];

const TIKKUN_PROVIDER_SELECTION_OPTIONS: readonly TikkunProviderSelectionOption[] = [
  {
    id: AUTO_TIKKUN_PROVIDER_ID,
    nameKey: 'settings.tikkunProviders.auto.name',
    descriptionKey: 'settings.tikkunProviders.auto.description',
    faviconUrl: null,
  },
  ...TIKKUN_PROVIDERS.map((provider) => ({
    id: provider.id,
    nameKey: provider.nameKey,
    descriptionKey: provider.descriptionKey,
    faviconUrl: getFaviconUrl(provider.websiteUrl),
  })),
];

const providerSupportsLayout = (provider: TikkunProvider, layoutKey: string) =>
  provider.supportedLayoutKeys === null || provider.supportedLayoutKeys.includes(layoutKey);

const findProvider = (providerId: TikkunProviderId) =>
  TIKKUN_PROVIDERS.find((provider) => provider.id === providerId) ?? null;

const getAutoProvider = (layoutKey: string) =>
  TIKKUN_PROVIDERS.find((provider) => providerSupportsLayout(provider, layoutKey))
  ?? TIKKUN_PROVIDERS.find((provider) => provider.capabilities.refs)
  ?? TIKKUN_PROVIDERS[0];

const getSelectedTikkunProvider = (selection: TikkunProviderSelection, layoutKey: string) => {
  if (selection === AUTO_TIKKUN_PROVIDER_ID) return getAutoProvider(layoutKey);
  return findProvider(selection) ?? getAutoProvider(layoutKey);
};

const createResolvedLink = (
  provider: TikkunProvider,
  url: string,
  source: TikkunLinkSource,
  selectedLayoutKey: string,
): TikkunResolvedLink => ({
  url,
  source,
  providerId: provider.id,
  providerNameKey: provider.nameKey,
  providerFaviconUrl: getFaviconUrl(provider.websiteUrl),
  providerSupportedLayoutKeys: provider.supportedLayoutKeys,
  selectedLayoutKey,
  hasLayoutWarning: !providerSupportsLayout(provider, selectedLayoutKey),
});

const getAutoResolvedLink = (
  input: Omit<ResolveTikkunLinkInput, 'providerSelection'>,
): TikkunResolvedLink | null => {
  const readingLink = TIKKUN_PROVIDERS
    .map((provider) => ({ provider, url: provider.getReadingUrl(input.target ?? null) }))
    .find((candidate) => candidate.url !== null);

  if (readingLink?.url) {
    return createResolvedLink(readingLink.provider, readingLink.url, 'reading', input.layoutKey);
  }

  const refLink = TIKKUN_PROVIDERS
    .filter((provider) => providerSupportsLayout(provider, input.layoutKey))
    .map((provider) => ({ provider, url: provider.getRefUrl(input.ref ?? null) }))
    .find((candidate) => candidate.url !== null);

  if (refLink?.url) {
    return createResolvedLink(refLink.provider, refLink.url, 'ref', input.layoutKey);
  }

  const pageLink = TIKKUN_PROVIDERS
    .filter((provider) => providerSupportsLayout(provider, input.layoutKey))
    .map((provider) => ({ provider, url: provider.getPageUrl(input.page ?? null, input.layoutKey) }))
    .find((candidate) => candidate.url !== null);

  if (pageLink?.url) {
    return createResolvedLink(pageLink.provider, pageLink.url, 'page', input.layoutKey);
  }

  return null;
};

const resolveTikkunLink = ({
  providerSelection,
  layoutKey,
  target = null,
  ref = null,
  page = null,
}: ResolveTikkunLinkInput): TikkunResolvedLink | null => {
  if (providerSelection === AUTO_TIKKUN_PROVIDER_ID) {
    return getAutoResolvedLink({ layoutKey, target, ref, page });
  }

  const provider = getSelectedTikkunProvider(providerSelection, layoutKey);
  const readingUrl = provider.getReadingUrl(target);

  if (readingUrl) return createResolvedLink(provider, readingUrl, 'reading', layoutKey);

  const refUrl = provider.getRefUrl(ref);
  if (refUrl) return createResolvedLink(provider, refUrl, 'ref', layoutKey);

  const pageUrl = provider.getPageUrl(page, layoutKey);
  if (pageUrl) return createResolvedLink(provider, pageUrl, 'page', layoutKey);

  return null;
};

export {
  AUTO_TIKKUN_PROVIDER_ID,
  TIKKUN_PROVIDERS,
  TIKKUN_PROVIDER_SELECTION_OPTIONS,
  getSelectedTikkunProvider,
  providerSupportsLayout,
  resolveTikkunLink,
};

export type {
  ResolveTikkunLinkInput,
  TikkunProvider,
  TikkunProviderId,
  TikkunProviderSelection,
  TikkunProviderSelectionOption,
  TikkunResolvedLink,
} from './types';