import { requireMentor } from '@/lib/mentor/auth';
import { getMentorAssignmentsQueue } from '@/lib/mentor/queries';
import { AssignmentGradeCard } from '@/components/mentor/assignment-grade-card';

export default async function MentorAssignmentsPage() {
  const profile = await requireMentor();
  const rows = await getMentorAssignmentsQueue(profile.id);

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-zinc-50">作業審核</h1>
        <p className="mt-1 text-sm text-zinc-400">
          顯示狀態為 submitted / grading 的作業，批改後狀態將更新為 graded。
        </p>
      </div>

      {rows.length === 0 ? (
        <div className="rounded-xl border border-zinc-800 bg-zinc-900/60 px-4 py-12 text-center text-sm text-zinc-500">
          目前沒有待審作業。
        </div>
      ) : (
        <div className="space-y-6">
          {rows.map((a) => (
            <AssignmentGradeCard key={a.id} assignment={a} />
          ))}
        </div>
      )}
    </div>
  );
}
