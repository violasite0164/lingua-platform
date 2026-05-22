-- 課本 PDF 裁切頁碼（上傳時擷取指定頁面後儲存）

alter table public.lesson_textbooks
  add column if not exists page_start integer,
  add column if not exists page_end integer,
  add column if not exists source_page_count integer;

alter table public.lesson_textbooks
  add constraint lesson_textbooks_page_range_check
  check (
    (page_start is null and page_end is null and source_page_count is null)
    or (
      page_start is not null
      and page_end is not null
      and source_page_count is not null
      and page_start >= 1
      and page_end >= page_start
      and page_end <= source_page_count
    )
  );
