'use client';

import { useCallback, useRef } from 'react';
import { useEditor, EditorContent } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import Underline from '@tiptap/extension-underline';
import Link from '@tiptap/extension-link';
import Image from '@tiptap/extension-image';
import Highlight from '@tiptap/extension-highlight';
import Placeholder from '@tiptap/extension-placeholder';
import CodeBlockLowlight from '@tiptap/extension-code-block-lowlight';
import TextAlign from '@tiptap/extension-text-align';
import { common, createLowlight } from 'lowlight';

import { Toolbar } from './toolbar';
import { createClient } from '@/lib/supabase/client';
import { cn } from '@/lib/utils';

const lowlight = createLowlight(common);

export interface RichTextEditorProps {
  /** HTML 內容（受控） */
  value?: string;
  onChange?: (html: string) => void;
  placeholder?: string;
  /** Supabase Storage bucket（圖片上傳用），不傳則不顯示圖片按鈕 */
  imageBucket?: string;
  minHeight?: number;
  className?: string;
  disabled?: boolean;
  /** 只讀模式（純顯示，不顯示工具列） */
  readOnly?: boolean;
}

export function RichTextEditor({
  value = '',
  onChange,
  placeholder = '在這裡輸入內容...',
  imageBucket,
  minHeight = 240,
  className,
  disabled = false,
  readOnly = false,
}: RichTextEditorProps) {
  const fileInputRef = useRef<HTMLInputElement>(null);

  const editor = useEditor({
    extensions: [
      StarterKit.configure({
        codeBlock: false, // 用 CodeBlockLowlight 替換
        heading: { levels: [1, 2, 3] },
      }),
      Underline,
      Highlight.configure({ multicolor: false }),
      Link.configure({
        openOnClick: false,
        HTMLAttributes: { rel: 'noopener noreferrer', target: '_blank' },
      }),
      Image.configure({ allowBase64: false }),
      CodeBlockLowlight.configure({ lowlight }),
      TextAlign.configure({ types: ['heading', 'paragraph'] }),
      Placeholder.configure({ placeholder }),
    ],
    content: value,
    editable: !disabled && !readOnly,
    onUpdate: ({ editor }) => {
      onChange?.(editor.getHTML());
    },
    editorProps: {
      attributes: {
        class: 'tiptap focus:outline-none',
        style: `min-height: ${minHeight}px`,
      },
    },
  });

  // ── Image upload ───────────────────────────────────────

  const handleImageUpload = useCallback(() => {
    fileInputRef.current?.click();
  }, []);

  async function onImageFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file || !editor || !imageBucket) return;

    // 只允許圖片
    if (!file.type.startsWith('image/')) {
      alert('請選擇圖片檔案');
      return;
    }

    try {
      const supabase = createClient();
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const ext  = file.name.split('.').pop();
      const path = `${user.id}/${Date.now()}.${ext}`;

      const { error: upErr } = await supabase.storage
        .from(imageBucket)
        .upload(path, file, { upsert: true });

      if (upErr) throw upErr;

      const { data } = supabase.storage.from(imageBucket).getPublicUrl(path);

      editor.chain().focus().setImage({ src: data.publicUrl, alt: file.name }).run();
    } catch (err) {
      console.error(err);
      alert('圖片上傳失敗');
    } finally {
      // Reset input so the same file can be selected again
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  }

  if (!editor) return null;

  // ── Read-only display ──────────────────────────────────
  if (readOnly) {
    return (
      <div className={cn('prose prose-sm max-w-none dark:prose-invert', className)}>
        <EditorContent editor={editor} />
      </div>
    );
  }

  return (
    <div
      className={cn(
        'rounded-lg border bg-background overflow-hidden',
        'focus-within:ring-2 focus-within:ring-ring focus-within:ring-offset-1',
        disabled && 'opacity-60 pointer-events-none',
        className,
      )}
    >
      {/* Toolbar */}
      <Toolbar
        editor={editor}
        onImageUpload={imageBucket ? handleImageUpload : undefined}
      />

      {/* Editor area */}
      <div className="overflow-y-auto" style={{ maxHeight: 600 }}>
        <EditorContent editor={editor} />
      </div>

      {/* Bubble: character count hint */}
      <div className="flex items-center justify-end px-3 py-1.5 border-t bg-muted/20">
        <span className="text-[11px] text-muted-foreground">
          {editor.storage.characterCount?.characters?.() ?? 0} 字元
        </span>
      </div>

      {/* Hidden file input for image upload */}
      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        className="hidden"
        onChange={onImageFileChange}
      />
    </div>
  );
}
