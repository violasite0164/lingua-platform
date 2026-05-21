'use client';

import type { Editor } from '@tiptap/react';
import {
  Bold, Code, Code2, Heading1, Heading2, Heading3, Highlighter,
  Image as ImageIcon, Italic, Link2, List, ListOrdered, Minus,
  Pilcrow, Quote, Redo, Strikethrough, Underline as UnderlineIcon, Undo,
} from 'lucide-react';
import { cn } from '@/lib/utils';

interface ToolbarButtonProps {
  onClick: () => void;
  active?: boolean;
  disabled?: boolean;
  title: string;
  children: React.ReactNode;
}

function ToolbarButton({ onClick, active, disabled, title, children }: ToolbarButtonProps) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      title={title}
      className={cn(
        'inline-flex items-center justify-center h-7 w-7 rounded text-sm transition-colors',
        'hover:bg-muted focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring',
        'disabled:opacity-40 disabled:pointer-events-none',
        active && 'bg-muted text-foreground',
        !active && 'text-muted-foreground hover:text-foreground',
      )}
    >
      {children}
    </button>
  );
}

function Divider() {
  return <div className="w-px h-5 bg-border mx-0.5 shrink-0" />;
}

interface ToolbarProps {
  editor: Editor;
  onImageUpload?: () => void;
}

export function Toolbar({ editor, onImageUpload }: ToolbarProps) {
  const addLink = () => {
    const url = window.prompt('輸入連結 URL：');
    if (url) {
      editor.chain().focus().setLink({ href: url, target: '_blank' }).run();
    }
  };

  const groups = [
    // History
    [
      <ToolbarButton key="undo" onClick={() => editor.chain().focus().undo().run()} disabled={!editor.can().undo()} title="復原 (Ctrl+Z)">
        <Undo className="h-3.5 w-3.5" />
      </ToolbarButton>,
      <ToolbarButton key="redo" onClick={() => editor.chain().focus().redo().run()} disabled={!editor.can().redo()} title="重做 (Ctrl+Y)">
        <Redo className="h-3.5 w-3.5" />
      </ToolbarButton>,
    ],
    // Headings
    [
      <ToolbarButton key="h1" onClick={() => editor.chain().focus().toggleHeading({ level: 1 }).run()} active={editor.isActive('heading', { level: 1 })} title="標題 1">
        <Heading1 className="h-3.5 w-3.5" />
      </ToolbarButton>,
      <ToolbarButton key="h2" onClick={() => editor.chain().focus().toggleHeading({ level: 2 }).run()} active={editor.isActive('heading', { level: 2 })} title="標題 2">
        <Heading2 className="h-3.5 w-3.5" />
      </ToolbarButton>,
      <ToolbarButton key="h3" onClick={() => editor.chain().focus().toggleHeading({ level: 3 }).run()} active={editor.isActive('heading', { level: 3 })} title="標題 3">
        <Heading3 className="h-3.5 w-3.5" />
      </ToolbarButton>,
      <ToolbarButton key="p" onClick={() => editor.chain().focus().setParagraph().run()} active={editor.isActive('paragraph')} title="正文">
        <Pilcrow className="h-3.5 w-3.5" />
      </ToolbarButton>,
    ],
    // Inline formatting
    [
      <ToolbarButton key="bold" onClick={() => editor.chain().focus().toggleBold().run()} active={editor.isActive('bold')} title="粗體 (Ctrl+B)">
        <Bold className="h-3.5 w-3.5" />
      </ToolbarButton>,
      <ToolbarButton key="italic" onClick={() => editor.chain().focus().toggleItalic().run()} active={editor.isActive('italic')} title="斜體 (Ctrl+I)">
        <Italic className="h-3.5 w-3.5" />
      </ToolbarButton>,
      <ToolbarButton key="underline" onClick={() => editor.chain().focus().toggleUnderline().run()} active={editor.isActive('underline')} title="底線 (Ctrl+U)">
        <UnderlineIcon className="h-3.5 w-3.5" />
      </ToolbarButton>,
      <ToolbarButton key="strike" onClick={() => editor.chain().focus().toggleStrike().run()} active={editor.isActive('strike')} title="刪除線">
        <Strikethrough className="h-3.5 w-3.5" />
      </ToolbarButton>,
      <ToolbarButton key="highlight" onClick={() => editor.chain().focus().toggleHighlight().run()} active={editor.isActive('highlight')} title="螢光標記">
        <Highlighter className="h-3.5 w-3.5" />
      </ToolbarButton>,
    ],
    // Lists & blocks
    [
      <ToolbarButton key="ul" onClick={() => editor.chain().focus().toggleBulletList().run()} active={editor.isActive('bulletList')} title="無序列表">
        <List className="h-3.5 w-3.5" />
      </ToolbarButton>,
      <ToolbarButton key="ol" onClick={() => editor.chain().focus().toggleOrderedList().run()} active={editor.isActive('orderedList')} title="有序列表">
        <ListOrdered className="h-3.5 w-3.5" />
      </ToolbarButton>,
      <ToolbarButton key="quote" onClick={() => editor.chain().focus().toggleBlockquote().run()} active={editor.isActive('blockquote')} title="引用">
        <Quote className="h-3.5 w-3.5" />
      </ToolbarButton>,
      <ToolbarButton key="code" onClick={() => editor.chain().focus().toggleCode().run()} active={editor.isActive('code')} title="行內程式碼">
        <Code className="h-3.5 w-3.5" />
      </ToolbarButton>,
      <ToolbarButton key="codeblock" onClick={() => editor.chain().focus().toggleCodeBlock().run()} active={editor.isActive('codeBlock')} title="程式碼區塊">
        <Code2 className="h-3.5 w-3.5" />
      </ToolbarButton>,
    ],
    // Media & extras
    [
      <ToolbarButton key="link" onClick={addLink} active={editor.isActive('link')} title="插入連結">
        <Link2 className="h-3.5 w-3.5" />
      </ToolbarButton>,
      ...(onImageUpload
        ? [
            <ToolbarButton key="image" onClick={onImageUpload} title="插入圖片">
              <ImageIcon className="h-3.5 w-3.5" />
            </ToolbarButton>,
          ]
        : []),
      <ToolbarButton key="hr" onClick={() => editor.chain().focus().setHorizontalRule().run()} title="分隔線">
        <Minus className="h-3.5 w-3.5" />
      </ToolbarButton>,
    ],
  ];

  return (
    <div className="flex flex-wrap items-center gap-0.5 px-2 py-1.5 border-b bg-muted/30">
      {groups.map((group, i) => (
        <div key={i} className="flex items-center">
          {group}
          {i < groups.length - 1 && <Divider />}
        </div>
      ))}
    </div>
  );
}
