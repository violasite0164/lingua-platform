import { requireMentor } from '@/lib/mentor/auth';
import { getMentorAssignmentsQueue } from '@/lib/mentor/queries';
import { AssignmentGradeCard } from '@/components/mentor/assignment-grade-card';

export default async function MentorAssignmentsPage() {
  const profile = await requireMentor();
  const queue = await getMentorAssignmentsQueue(profile.id);

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-foreground">作業審核</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          批改學員繳交的作業，給予分數與回饋。
        </p>
      </div>

      {queue.length === 0 ? (
        <div className="rounded-xl border border-border bg-card px-4 py-12 text-center text-sm text-muted-foreground">
          目前沒有待審作業。
        </div>
      ) : (
        <div className="space-y-4">
          {queue.map((a) => (
            <AssignmentGradeCard key={a.id} assignment={a} />
          ))}
        </div>
      )}
    </div>
  );
}
