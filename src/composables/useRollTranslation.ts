import { useI18n } from 'vue-i18n';
import type { RollInstructions } from '../types';

/**
 * Composable to translate roll instructions
 */
export const useRollTranslation = () => {
  const { t } = useI18n();

  const getDirectionText = (direction: 'forward' | 'backward'): string => {
    return t(`directions.${direction}`);
  };

  const translateRollInstructions = (instructions: RollInstructions): { pages: number; direction: string } => {
    return {
      pages: instructions.pages,
      direction: getDirectionText(instructions.rollDirection)
    };
  };

  return {
    getDirectionText,
    translateRollInstructions
  };
};
