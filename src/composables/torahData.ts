/**
 * Torah layout data registry.
 *
 * To add a new layout:
 * 1. Create a folder `src/data/<pageCount>/` with `real_db.json`, `page_first_lines.json`, `page_titles_keys.json`
 * 2. Import the three files below and add an entry to `LAYOUT_DATA`
 * 3. Add `{ id: 'klaf_<pageCount>', pageCount: <pageCount> }` to `TORAH_TYPE_OPTIONS` in `src/stores/options.ts`
 * 4. Add a translation key `settings.torahTypeOptions.klaf_<pageCount>` in each locale file
 * 5. Add a `"<pageCount>"` key to every `page` object in `src/data/target_pages.json`
 */

import { computed } from 'vue';
import { useOptionsStore, getLayoutKey } from '@/stores/options';
import type { RealDb } from '@/types';
import type { PageFirstLine } from '@/composables/firstLineSearch';

// --- Layout data imports ---
import realDb245 from '@/data/245/real_db.json';
import realDb248 from '@/data/248/real_db.json';
import pageFirstLines245 from '@/data/245/page_first_lines.json';
import pageFirstLines248 from '@/data/248/page_first_lines.json';
import pageTitlesKeys245 from '@/data/245/page_titles_keys.json';
import pageTitlesKeys248 from '@/data/248/page_titles_keys.json';

// --- Layout registry ---
interface LayoutData {
  realDb: RealDb;
  pageFirstLines: PageFirstLine[];
  pageTitlesKeys: string[][];
}

const LAYOUT_DATA: Record<string, LayoutData> = {
  '245': {
    realDb: realDb245 as RealDb,
    pageFirstLines: pageFirstLines245 as PageFirstLine[],
    pageTitlesKeys: pageTitlesKeys245 as string[][],
  },
  '248': {
    realDb: realDb248 as RealDb,
    pageFirstLines: pageFirstLines248 as PageFirstLine[],
    pageTitlesKeys: pageTitlesKeys248 as string[][],
  },
};

const DEFAULT_LAYOUT_KEY = '245';

const getLayoutData = (layoutKey: string): LayoutData => {
  return LAYOUT_DATA[layoutKey] ?? LAYOUT_DATA[DEFAULT_LAYOUT_KEY];
};

// --- Composable for reactive layout data ---
const useTorahData = () => {
  const optionsStore = useOptionsStore();

  const layoutKey = computed(() => getLayoutKey(optionsStore.torahType));
  const realDb = computed<RealDb>(() => getLayoutData(layoutKey.value).realDb);
  const pageFirstLines = computed<PageFirstLine[]>(() => getLayoutData(layoutKey.value).pageFirstLines);
  const pageTitlesKeys = computed<string[][]>(() => getLayoutData(layoutKey.value).pageTitlesKeys);

  return {
    layoutKey,
    realDb,
    pageFirstLines,
    pageTitlesKeys,
  };
};

/**
 * Resolve the page number from a TorahRef page map for the given layout key.
 */
const resolvePageForLayout = (pageMap: Record<string, number>, layoutKey: string): number => {
  return pageMap[layoutKey] ?? pageMap[DEFAULT_LAYOUT_KEY] ?? 0;
};

export { useTorahData, resolvePageForLayout, getLayoutData, LAYOUT_DATA, DEFAULT_LAYOUT_KEY };
export type { LayoutData };
