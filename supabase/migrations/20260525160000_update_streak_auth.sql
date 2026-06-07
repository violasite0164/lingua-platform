-- 連續登入：僅允許更新自己的 streak，並開放 authenticated 執行

create or replace function public.update_streak(p_user_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_last date;
  v_today date := (timezone('Asia/Hong_Kong', now()))::date;
begin
  if auth.uid() is null or auth.uid() <> p_user_id then
    return;
  end if;

  select last_active_at into v_last from public.profiles where id = p_user_id;

  if v_last = v_today then
    return;
  elsif v_last = v_today - 1 then
    update public.profiles
    set streak_days = streak_days + 1, last_active_at = v_today
    where id = p_user_id;
  else
    update public.profiles
    set streak_days = 1, last_active_at = v_today
    where id = p_user_id;
  end if;
end;
$$;

grant execute on function public.update_streak(uuid) to authenticated;
