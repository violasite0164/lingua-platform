'use client';

import { ClassroomQuizAudioMixControl } from '@/components/classroom-quiz/classroom-quiz-audio-mix-control';
import {
  ClassroomQuizVideoVolumeControl,
  type ClassroomQuizVideoVolumeTarget,
} from '@/components/classroom-quiz/classroom-quiz-video-volume-control';
import type { ClassroomQuizQuestionPayload } from '@/lib/course-quiz/types';
import type { ClassroomQuizPlayPhase } from '@/lib/course-quiz/play-phases';

function buildVideoTargetsForQuestion(
  question: ClassroomQuizQuestionPayload,
  playPhase: ClassroomQuizPlayPhase,
  outcomeVideoUid: string | null,
): {
  active: ClassroomQuizVideoVolumeTarget | null;
  related: ClassroomQuizVideoVolumeTarget[];
} {
  const entries: ClassroomQuizVideoVolumeTarget[] = [];
  if (question.cf_video_uid) {
    entries.push({ videoUid: question.cf_video_uid, label: '題目影片' });
  }
  if (question.cf_correct_video_uid) {
    entries.push({
      videoUid: question.cf_correct_video_uid,
      label: '答對結果影片',
    });
  }
  if (question.cf_wrong_video_uid) {
    entries.push({
      videoUid: question.cf_wrong_video_uid,
      label: '答錯結果影片',
    });
  }

  if (entries.length === 0) {
    return { active: null, related: [] };
  }

  const showingOutcome =
    Boolean(outcomeVideoUid) &&
    (playPhase === 'outcome_video' || playPhase === 'outcome_popup');

  let activeUid = question.cf_video_uid;
  if (showingOutcome && outcomeVideoUid) {
    activeUid = outcomeVideoUid;
  } else if (playPhase === 'outcome_video' && outcomeVideoUid) {
    activeUid = outcomeVideoUid;
  }

  const active =
    entries.find((e) => e.videoUid === activeUid) ?? entries[0] ?? null;
  const related = entries.filter((e) => e.videoUid !== active?.videoUid);

  return { active, related };
}

export function ClassroomQuizToolbar({
  question,
  playPhase,
  outcomeVideoUid,
}: {
  question: ClassroomQuizQuestionPayload | null;
  playPhase: ClassroomQuizPlayPhase;
  outcomeVideoUid: string | null;
}) {
  const { active, related } = question
    ? buildVideoTargetsForQuestion(question, playPhase, outcomeVideoUid)
    : { active: null, related: [] };

  return (
    <div className="flex items-center gap-0.5">
      <ClassroomQuizVideoVolumeControl activeVideo={active} relatedVideos={related} />
      <ClassroomQuizAudioMixControl />
    </div>
  );
}
