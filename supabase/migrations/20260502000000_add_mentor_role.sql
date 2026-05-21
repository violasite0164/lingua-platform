-- 新增 mentor 角色，並讓課程／課堂／作業相關 RLS 視 mentor 與 teacher 同等
-- 在 Supabase SQL Editor 執行（若 enum 已含 mentor 可略過第一行錯誤）

ALTER TYPE public.user_role ADD VALUE IF NOT EXISTS 'mentor';

CREATE OR REPLACE FUNCTION public.is_teacher_or_admin()
RETURNS boolean
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.profiles
    WHERE id = auth.uid()
      AND role IN ('teacher', 'mentor', 'admin')
  );
$$;
