'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { formatDistanceToNow } from 'date-fns';
import { zhTW } from 'date-fns/locale';
import { Inbox, Loader2, Mail, Zap, CheckCircle2 } from 'lucide-react';

import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import {
  claimProfileInboxStaminaPack,
  listProfileInboxMessages,
  markProfileInboxRead,
} from '@/lib/profile/inbox-actions';
import {
  canClaimStaminaPack,
  isProfileInboxUnread,
  type ProfileInboxMessage,
} from '@/lib/profile/inbox-types';
import { cn } from '@/lib/utils';

export function ProfileInboxPanel({
  onUnreadChange,
}: {
  onUnreadChange?: (count: number) => void;
}) {
  const [messages, setMessages] = useState<ProfileInboxMessage[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [claimingId, setClaimingId] = useState<string | null>(null);
  const [claimFeedback, setClaimFeedback] = useState<string | null>(null);

  const unreadCount = useMemo(
    () => messages.filter((m) => isProfileInboxUnread(m)).length,
    [messages],
  );

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    const res = await listProfileInboxMessages();
    if (!res.ok) {
      setError(res.message);
      setMessages([]);
      setLoading(false);
      onUnreadChange?.(0);
      return;
    }
    setMessages(res.messages);
    const unread = res.messages.filter((m) => isProfileInboxUnread(m)).length;
    onUnreadChange?.(unread);
    setLoading(false);
  }, [onUnreadChange]);

  useEffect(() => {
    void load();
  }, [load]);

  async function handleMarkAllRead() {
    const unreadIds = messages.filter((m) => isProfileInboxUnread(m)).map((m) => m.id);
    if (unreadIds.length === 0) return;
    const res = await markProfileInboxRead();
    if (!res.ok) {
      setError(res.message);
      return;
    }
    const now = new Date().toISOString();
    setMessages((prev) =>
      prev.map((m) => (m.read_at ? m : { ...m, read_at: now })),
    );
    onUnreadChange?.(0);
  }

  async function handleClaim(message: ProfileInboxMessage) {
    if (!canClaimStaminaPack(message)) return;
    setClaimingId(message.id);
    setClaimFeedback(null);
    const res = await claimProfileInboxStaminaPack(message.id);
    setClaimingId(null);
    if (!res.ok) {
      setClaimFeedback(res.message);
      return;
    }
    const now = new Date().toISOString();
    setMessages((prev) => {
      const next = prev.map((m) =>
        m.id === message.id
          ? { ...m, claimed_at: now, read_at: m.read_at ?? now }
          : m,
      );
      onUnreadChange?.(next.filter((m) => isProfileInboxUnread(m)).length);
      return next;
    });
    setClaimFeedback(`已回復 ${res.granted} 點體力，目前體力 ${res.stamina.stamina}/${res.stamina.max}`);
    window.setTimeout(() => setClaimFeedback(null), 4000);
  }

  return (
    <Card id="inbox" className="border-border/60 shadow-sm overflow-hidden scroll-mt-24">
      <CardHeader className="pb-3 border-b border-border/50 bg-muted/20">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <CardTitle className="text-base flex items-center gap-2">
            <Inbox className="h-4 w-4 text-primary" />
            收件匣
            {unreadCount > 0 ? (
              <Badge
                variant="destructive"
                className="h-5 min-w-5 rounded-full px-1.5 text-[10px] font-bold animate-pulse"
              >
                {unreadCount > 99 ? '99+' : unreadCount}
              </Badge>
            ) : null}
          </CardTitle>
          {unreadCount > 0 ? (
            <Button type="button" variant="outline" size="sm" onClick={() => void handleMarkAllRead()}>
              全部標為已讀
            </Button>
          ) : null}
        </div>
        <p className="text-xs text-muted-foreground mt-1">
          購買的體力道具與通知會出現在這裡；未讀訊息會以醒目樣式標示。
        </p>
      </CardHeader>

      <CardContent className="p-0">
        {claimFeedback ? (
          <p className="border-b border-border/50 bg-green-500/10 px-4 py-2 text-xs text-green-700 dark:text-green-400">
            {claimFeedback}
          </p>
        ) : null}

        {loading ? (
          <div className="flex items-center justify-center gap-2 py-12 text-sm text-muted-foreground">
            <Loader2 className="h-4 w-4 animate-spin" />
            載入收件匣…
          </div>
        ) : error ? (
          <p className="px-4 py-8 text-center text-sm text-destructive">{error}</p>
        ) : messages.length === 0 ? (
          <div className="flex flex-col items-center gap-2 py-12 text-center text-muted-foreground">
            <Mail className="h-8 w-8 opacity-40" />
            <p className="text-sm">目前沒有訊息</p>
            <p className="text-xs">購買體力包後會送到這裡</p>
          </div>
        ) : (
          <ul className="divide-y divide-border/60">
            {messages.map((message) => (
              <InboxMessageRow
                key={message.id}
                message={message}
                claiming={claimingId === message.id}
                onClaim={() => void handleClaim(message)}
              />
            ))}
          </ul>
        )}
      </CardContent>
    </Card>
  );
}

function InboxMessageRow({
  message,
  claiming,
  onClaim,
}: {
  message: ProfileInboxMessage;
  claiming: boolean;
  onClaim: () => void;
}) {
  const unread = isProfileInboxUnread(message);
  const claimable = canClaimStaminaPack(message);
  const claimed = message.kind === 'stamina_pack' && Boolean(message.claimed_at);

  const timeLabel = formatDistanceToNow(new Date(message.created_at), {
    addSuffix: true,
    locale: zhTW,
  });

  return (
    <li
      className={cn(
        'relative px-4 py-4 transition-colors',
        unread && 'bg-primary/8 border-l-4 border-l-primary shadow-[inset_0_0_0_1px_hsl(var(--primary)/0.12)]',
        !unread && 'border-l-4 border-l-transparent',
      )}
    >
      {unread ? (
        <span
          className="absolute right-3 top-3 flex h-2.5 w-2.5 rounded-full bg-destructive ring-2 ring-background"
          aria-hidden
        />
      ) : null}

      <div className="flex gap-3 pr-4">
        <div
          className={cn(
            'flex h-10 w-10 shrink-0 items-center justify-center rounded-full',
            message.kind === 'stamina_pack'
              ? 'bg-amber-500/15 text-amber-600 dark:text-amber-400'
              : 'bg-muted text-muted-foreground',
          )}
        >
          {message.kind === 'stamina_pack' ? (
            <Zap className="h-5 w-5" />
          ) : (
            <Mail className="h-5 w-5" />
          )}
        </div>

        <div className="min-w-0 flex-1 space-y-2">
          <div className="flex flex-wrap items-start justify-between gap-2">
            <p className={cn('text-sm font-semibold leading-snug', unread && 'text-primary')}>
              {message.title}
            </p>
            <span className="text-[11px] text-muted-foreground whitespace-nowrap">{timeLabel}</span>
          </div>
          <p className="text-sm text-muted-foreground leading-relaxed">{message.body}</p>

          {message.kind === 'stamina_pack' ? (
            <div className="flex flex-wrap items-center gap-2">
              {claimable ? (
                <Button
                  type="button"
                  size="sm"
                  className="gap-1.5"
                  disabled={claiming}
                  onClick={onClaim}
                >
                  {claiming ? (
                    <Loader2 className="h-3.5 w-3.5 animate-spin" />
                  ) : (
                    <Zap className="h-3.5 w-3.5" />
                  )}
                  使用（+{message.payload.stamina_amount ?? 0} 體力）
                </Button>
              ) : claimed ? (
                <span className="inline-flex items-center gap-1 text-xs text-green-600 dark:text-green-400">
                  <CheckCircle2 className="h-3.5 w-3.5" />
                  已使用
                </span>
              ) : null}
            </div>
          ) : null}
        </div>
      </div>
    </li>
  );
}
