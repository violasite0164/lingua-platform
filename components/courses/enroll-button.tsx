'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { createClient } from '@/lib/supabase/client';
import { formatPrice } from '@/lib/utils';

interface EnrollButtonProps {
  courseId: string;
  price: number;
  isFree: boolean;
  isEnrolled: boolean;
  /** 有效訂閱且本課程有訂閱免費內容（不需購買即可學習） */
  hasSubscriptionAccess?: boolean;
  nextLessonId?: string;
}

export function EnrollButton({
  courseId,
  price,
  isFree,
  isEnrolled,
  hasSubscriptionAccess = false,
  nextLessonId,
}: EnrollButtonProps) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);

  // 已報名 → 「繼續學習」
  if (isEnrolled) {
    return (
      <Button
        size="lg"
        className="w-full"
        onClick={() =>
          router.push(
            nextLessonId
              ? `/learn/${courseId}/${nextLessonId}`
              : `/learn/${courseId}`,
          )
        }
      >
        繼續學習
      </Button>
    );
  }

  // 訂閱權益可觀看 → 「開始學習」
  if (hasSubscriptionAccess) {
    return (
      <Button
        size="lg"
        className="w-full"
        onClick={() => router.push(`/learn/${courseId}`)}
      >
        開始學習
      </Button>
    );
  }

  async function handleEnroll() {
    setLoading(true);
    try {
      const supabase = createClient();
      const { data: { user } } = await supabase.auth.getUser();

      if (!user) {
        router.push(`/login?redirect=/courses/${courseId}`);
        return;
      }

      if (isFree || price === 0) {
        // 免費課程：直接寫入 enrollments
        const { error } = await supabase
          .from('enrollments')
          .insert({ user_id: user.id, course_id: courseId });
        if (error) throw error;
        router.refresh();
        return;
      }

      // 付費課程：呼叫 Stripe Checkout API
      const res = await fetch('/api/stripe/checkout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ kind: 'course', courseId }),
      });
      const { url, error } = await res.json() as { url?: string; error?: string };
      if (error || !url) {
        const msg =
          error === '您已報名此課程'
            ? error
            : error ?? 'Stripe 錯誤';
        throw new Error(msg);
      }
      window.location.href = url;
    } catch (err) {
      console.error(err);
      alert('發生錯誤，請稍後再試');
    } finally {
      setLoading(false);
    }
  }

  return (
    <Button
      size="lg"
      className="w-full"
      onClick={handleEnroll}
      disabled={loading}
    >
      {loading && <Loader2 className="h-4 w-4 animate-spin" />}
      {isFree || price === 0 ? '免費報名' : `購買課程 · ${formatPrice(price)}`}
    </Button>
  );
}
