// DONE 14: pass rules to here (if possible)
import type { ComputedRef, Ref } from 'vue';

type Translate = (key: string) => string;
type RuleResult = true | string;
type NumberRule = (value: number | null) => RuleResult;

interface UseManualEntryRulesParams {
  hasPage: Readonly<Ref<boolean>> | ComputedRef<boolean>;
  maxChapters: Readonly<Ref<number>> | ComputedRef<number>;
  maxPage: Readonly<Ref<number>> | ComputedRef<number>;
  t: Translate;
}

const useManualEntryRules = ({
  hasPage,
  maxChapters,
  maxPage,
  t
}: UseManualEntryRulesParams) => {
  const requiredIfNoPage: NumberRule = (value) =>
    hasPage.value || value != null || t('manual.required');

  const positiveRule: NumberRule = (value) =>
    value == null || value > 0 || t('manual.must_be_positive');

  const chapterRules: NumberRule[] = [
    requiredIfNoPage,
    positiveRule,
    (value) =>
      value == null ||
      value <= maxChapters.value ||
      `${t('manual.max_chapter')} ${maxChapters.value}`
  ];

  const verseRules: NumberRule[] = [
    requiredIfNoPage,
    positiveRule,
    (value) => value == null || value <= 90 || `${t('manual.max_verse')} 90`
  ];

  const pageRules: NumberRule[] = [
    positiveRule,
    (value) =>
      value == null || value <= maxPage.value || `${t('manual.max_page')} ${maxPage.value}`
  ];

  return {
    chapterRules,
    verseRules,
    pageRules
  };
};

export { useManualEntryRules };
