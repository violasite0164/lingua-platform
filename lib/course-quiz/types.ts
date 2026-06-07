import { choiceCountForMode } from '@/lib/course-quiz/choice-mode';
import {
  parseOptionImageUrls,
  parseOptionShapeGlyphs,
} from '@/lib/course-quiz/shape-glyphs';
import { resolveCourseQuizVocabularyDisplay } from '@/lib/course-quiz/vocabulary-display';
import type {
  QuizVideoTextAlign,
  QuizVideoTextAnimation,
  QuizVideoTextFontId,
} from '@/lib/course-quiz/video-text';
import type {
  CourseQuizChoiceMode,
  CourseQuizQuestion,
  CourseQuizVocabularyDisplay,
} from '@/types/database.types';

export type ClassroomQuizVideoTextPayload = {
  id: string;
  text_content: string;
  font_family: QuizVideoTextFontId;
  font_size_px: number;
  text_color: string;
  text_align: QuizVideoTextAlign;
  text_animation: QuizVideoTextAnimation;
};

export type ClassroomQuizQuestionPayload = {
  id: string;
  question_text: string;
  options: string[];
  option_count: 3 | 4;
  correct_index: number;
  explanation: string;
  cf_video_uid: string | null;
  cf_correct_video_uid: string | null;
  cf_wrong_video_uid: string | null;
  question_audio_url: string | null;
  option_audio_urls: string[];
  option_image_urls: string[];
  option_shape_glyphs: string[];
  vocabulary_display: CourseQuizVocabularyDisplay;
};

export function toClassroomQuizQuestionPayload(
  row: CourseQuizQuestion,
  choiceMode: CourseQuizChoiceMode,
): ClassroomQuizQuestionPayload {
  const count = choiceCountForMode(choiceMode);
  const raw = row.options;
  const opts = Array.isArray(raw) ? raw.map(String) : [];
  while (opts.length < count) opts.push('');
  const rawAudio = row.option_audio_urls;
  const audioList = Array.isArray(rawAudio) ? rawAudio.map(String) : [];
  while (audioList.length < count) audioList.push('');

  return {
    id: row.id,
    question_text: row.question_text,
    options: opts.slice(0, count),
    option_count: count,
    correct_index: Math.min(row.correct_index, count - 1),
    explanation: row.explanation ?? '',
    cf_video_uid: row.cf_video_uid,
    cf_correct_video_uid: row.cf_correct_video_uid ?? null,
    cf_wrong_video_uid: row.cf_wrong_video_uid ?? null,
    question_audio_url: row.question_audio_url ?? null,
    option_audio_urls: audioList.slice(0, count),
    option_image_urls: parseOptionImageUrls(row.option_image_urls, count),
    option_shape_glyphs: parseOptionShapeGlyphs(row.option_shape_glyphs, count),
    vocabulary_display: resolveCourseQuizVocabularyDisplay(row.vocabulary_display),
  };
}
