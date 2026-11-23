"use client";

import { EditorContent, useEditor, useEditorState } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import { Bold, Code, Heading2, Heading3, Italic, List, ListOrdered, Quote, Redo2, Strikethrough, Underline, Undo2 } from "lucide-react";
import { useEffect, useRef } from "react";
import { Toggle } from "@/components/ui/toggle";
import { useL } from "@/i18n";
import { cn } from "@/lib/utils";

/**
 * Rich-text note editor (Tiptap). Output HTML is constrained by the editor schema,
 * so it is safe to store and re-render (no raw HTML injection).
 */
export function NoteEditor({ content, editable = true, onChange, className }: { content: string; editable?: boolean; onChange?: (html: string) => void; className?: string }) {
  const l = useL();
  /** Last HTML the editor reported/received — filters out schema-normalisation "updates". */
  const last = useRef<string | null>(null);
  const editor = useEditor({
    extensions: [StarterKit.configure({ link: { openOnClick: !editable, autolink: true } })],
    content,
    editable,
    immediatelyRender: false,
    editorProps: {
      attributes: {
        class: cn("prose-content min-h-64 max-w-none px-1 py-2 outline-none", !editable && "min-h-0"),
        "aria-label": l("নোটের বিষয়বস্তু", "Note content"),
        role: "textbox",
        "aria-multiline": "true",
      },
    },
    onCreate: ({ editor }) => {
      last.current = editor.getHTML();
    },
    onUpdate: ({ editor }) => {
      const html = editor.getHTML();
      if (!editor.isEditable || html === last.current) return;
      last.current = html;
      onChange?.(html);
    },
  });

  // External content changes (version restore, switching notes).
  useEffect(() => {
    if (editor && content !== editor.getHTML() && content !== last.current) {
      editor.commands.setContent(content, { emitUpdate: false });
      last.current = editor.getHTML();
    }
  }, [content, editor]);

  useEffect(() => {
    editor?.setEditable(editable);
  }, [editable, editor]);

  const state = useEditorState({
    editor,
    selector: ({ editor: e }) =>
      e
        ? {
            bold: e.isActive("bold"),
            italic: e.isActive("italic"),
            underline: e.isActive("underline"),
            strike: e.isActive("strike"),
            h2: e.isActive("heading", { level: 2 }),
            h3: e.isActive("heading", { level: 3 }),
            bullet: e.isActive("bulletList"),
            ordered: e.isActive("orderedList"),
            quote: e.isActive("blockquote"),
            code: e.isActive("code"),
            canUndo: e.can().undo(),
            canRedo: e.can().redo(),
          }
        : null,
  });

  if (!editor) return <div className={cn("min-h-64 animate-pulse rounded-lg bg-muted", className)} />;

  const tools = [
    { key: "bold", icon: Bold, label: l("বোল্ড", "Bold"), run: () => editor.chain().focus().toggleBold().run() },
    { key: "italic", icon: Italic, label: l("ইটালিক", "Italic"), run: () => editor.chain().focus().toggleItalic().run() },
    { key: "underline", icon: Underline, label: l("আন্ডারলাইন", "Underline"), run: () => editor.chain().focus().toggleUnderline().run() },
    { key: "strike", icon: Strikethrough, label: l("কাটা দাগ", "Strikethrough"), run: () => editor.chain().focus().toggleStrike().run() },
    { key: "h2", icon: Heading2, label: l("শিরোনাম ২", "Heading 2"), run: () => editor.chain().focus().toggleHeading({ level: 2 }).run() },
    { key: "h3", icon: Heading3, label: l("শিরোনাম ৩", "Heading 3"), run: () => editor.chain().focus().toggleHeading({ level: 3 }).run() },
    { key: "bullet", icon: List, label: l("বুলেট তালিকা", "Bullet list"), run: () => editor.chain().focus().toggleBulletList().run() },
    { key: "ordered", icon: ListOrdered, label: l("ক্রমিক তালিকা", "Numbered list"), run: () => editor.chain().focus().toggleOrderedList().run() },
    { key: "quote", icon: Quote, label: l("উদ্ধৃতি", "Quote"), run: () => editor.chain().focus().toggleBlockquote().run() },
    { key: "code", icon: Code, label: l("কোড/সূত্র", "Code/formula"), run: () => editor.chain().focus().toggleCode().run() },
  ] as const;

  return (
    <div className={className}>
      {editable && (
        <div className="no-print sticky top-16 z-10 mb-2 flex flex-wrap gap-0.5 rounded-lg border bg-background/95 p-1 backdrop-blur" role="toolbar" aria-label={l("ফরম্যাটিং", "Formatting")}>
          {tools.map((t) => (
            <Toggle key={t.key} size="sm" pressed={!!state?.[t.key]} onPressedChange={t.run} aria-label={t.label} title={t.label}>
              <t.icon />
            </Toggle>
          ))}
          <span className="mx-1 w-px self-stretch bg-border" />
          <Toggle size="sm" pressed={false} disabled={!state?.canUndo} onPressedChange={() => editor.chain().focus().undo().run()} aria-label={l("আগের অবস্থা", "Undo")}>
            <Undo2 />
          </Toggle>
          <Toggle size="sm" pressed={false} disabled={!state?.canRedo} onPressedChange={() => editor.chain().focus().redo().run()} aria-label={l("পুনরায়", "Redo")}>
            <Redo2 />
          </Toggle>
        </div>
      )}
      <EditorContent editor={editor} />
    </div>
  );
}
