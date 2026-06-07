import type { CourseQuizVocabularyDisplay } from '@/types/database.types';

import { parseOptionShapeGlyphs } from '@/lib/course-quiz/shape-glyphs';
import {
  normalizeVocabularyShapeKind,
  type VocabularyShapeKind,
} from '@/lib/course-quiz/vocabulary-shape-presets';
import {
  vocabularyCharacterGlyph,
  vocabularyChipLabel,
  vocabularyShapeOptionLabel,
} from '@/lib/course-quiz/vocabulary-display';

export type VocabChipVisualSpec = {
  /** 字元模式 Text3D；圖形模式可為空 */
  glyph: string;
  imageUrl: string | null;
  /** 圖形模式內建立體圖形（無圖片時） */
  shapeKind: VocabularyShapeKind | null;
  /** 圖形模式：撿起時顯示在圖形中央的選項文字（無圖片時） */
  optionLabel: string;
};

export function buildVocabChipVisualSpecs(
  optionTexts: string[],
  display: CourseQuizVocabularyDisplay,
  optionImageUrls: string[],
  optionShapeGlyphs: string[],
): VocabChipVisualSpec[] {
  return optionTexts.map((text, i) => {
    const imageUrl = optionImageUrls[i]?.trim() || null;

    if (display === 'shape') {
      if (imageUrl) {
        return { glyph: '', imageUrl, shapeKind: null, optionLabel: '' };
      }
      return {
        glyph: '',
        imageUrl: null,
        shapeKind: normalizeVocabularyShapeKind(optionShapeGlyphs[i]),
        optionLabel: vocabularyShapeOptionLabel(text),
      };
    }

    if (display === 'character') {
      return {
        glyph: vocabularyCharacterGlyph(text),
        imageUrl: null,
        shapeKind: null,
        optionLabel: '',
      };
    }

    return {
      glyph: vocabularyChipLabel(text, display),
      imageUrl: null,
      shapeKind: null,
      optionLabel: '',
    };
  });
}

export { parseOptionShapeGlyphs };
