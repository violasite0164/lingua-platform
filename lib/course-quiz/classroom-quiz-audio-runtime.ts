import { syncClassroomQuizBgmVolume } from '@/lib/course-quiz/classroom-quiz-bgm';
import {
  getClassroomQuizAudioMix,
  getClassroomQuizSfxVolumeScale,
} from '@/lib/course-quiz/classroom-quiz-audio-settings';
import { setClassroomQuizSfxScaleOverride } from '@/lib/quiz/rpg-audio';

export function applyClassroomQuizAudioRuntime() {
  setClassroomQuizSfxScaleOverride(getClassroomQuizSfxVolumeScale());
  syncClassroomQuizBgmVolume();
}

export function clearClassroomQuizAudioRuntime() {
  setClassroomQuizSfxScaleOverride(null);
}

export function bindClassroomQuizAudioRuntime(): () => void {
  applyClassroomQuizAudioRuntime();
  const onMixChange = () => applyClassroomQuizAudioRuntime();
  window.addEventListener('classroom-quiz-audio-mix-change', onMixChange);
  return () => {
    window.removeEventListener('classroom-quiz-audio-mix-change', onMixChange);
    clearClassroomQuizAudioRuntime();
  };
}

export function getClassroomQuizSpeechVolume(): number {
  return Math.min(1, Math.max(0, getClassroomQuizSfxVolumeScale()));
}
