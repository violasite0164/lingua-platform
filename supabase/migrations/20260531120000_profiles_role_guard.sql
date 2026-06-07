-- 禁止一般使用者自行變更 profiles.role（僅 admin 可改，含改他人角色）

CREATE OR REPLACE FUNCTION public.trg_profiles_guard_role()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NEW.role IS DISTINCT FROM OLD.role THEN
    -- service role / migration（無 JWT）允許
    IF auth.uid() IS NULL THEN
      RETURN NEW;
    END IF;
    IF NOT EXISTS (
      SELECT 1
      FROM public.profiles p
      WHERE p.id = auth.uid()
        AND p.role = 'admin'
    ) THEN
      RAISE EXCEPTION 'permission denied: cannot change role'
        USING ERRCODE = '42501';
    END IF;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS profiles_guard_role ON public.profiles;
CREATE TRIGGER profiles_guard_role
  BEFORE UPDATE ON public.profiles
  FOR EACH ROW
  EXECUTE FUNCTION public.trg_profiles_guard_role();

COMMENT ON FUNCTION public.trg_profiles_guard_role() IS
  'RLS 無法限制單欄時，阻擋非 admin 修改 profiles.role';
