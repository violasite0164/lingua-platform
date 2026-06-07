import type { MentorSpecialty } from '@/types/database.types';

export const MENTOR_SPECIALTY_OPTIONS: {
  value: MentorSpecialty;
  label: string;
}[] = [
  { value: 'activity', label: '活動導師' },
  { value: 'science', label: '理科導師' },
  { value: 'language', label: '語言導師' },
  { value: 'other', label: '其他導師' },
  { value: 'technical', label: '技術人員' },
];

export function getMentorSpecialtyLabel(
  specialty: MentorSpecialty | null | undefined,
): string | null {
  if (!specialty) return null;
  return (
    MENTOR_SPECIALTY_OPTIONS.find((o) => o.value === specialty)?.label ?? null
  );
}
