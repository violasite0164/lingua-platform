import { notFound } from 'next/navigation';
import Link from 'next/link';
import { ChevronLeft } from 'lucide-react';

import { requireMentor } from '@/lib/mentor/auth';
import { getMentorCourseForEdit } from '@/lib/mentor/queries';
import { UploadVideoClient } from './upload-video-client';

export default async function UploadVideoPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const profile = await requireMentor();

  const pack = await getMentorCourseForEdit(id, profile.id);
  if (!pack) notFound();

  const { course, lessons } = pack;

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      {/* 麵包屑 */}
      <div className="flex items-center gap-2 text-sm text-zinc-400">
        <Link
          href={`/mentor/courses/${id}/edit`}
          className="flex items-center gap-1 hover:text-zinc-100"
        >
          <ChevronLeft className="h-4 w-4" />
          返回課程編輯
        </Link>
        <span>/</span>
        <span className="text-zinc-200">上傳影片</span>
      </div>

      <div>
        <h1 className="text-2xl font-bold text-zinc-50">上傳教學影片</h1>
        <p className="mt-1 text-sm text-zinc-400">
          {course.title} · 選擇單元後上傳影片，系統會自動透過 Cloudflare Stream 轉碼。
        </p>
      </div>

      <UploadVideoClient lessons={lessons} courseId={id} />
    </div>
  );
}
