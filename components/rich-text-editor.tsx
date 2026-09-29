"use client";

import { plainTextToHtml, richTextToSafeHtml } from "@/lib/rich-text";
import {
  AlignCenter,
  AlignJustify,
  AlignLeft,
  AlignRight,
  Bold,
  Eye,
  Highlighter,
  IndentDecrease,
  IndentIncrease,
  Italic,
  Link2,
  List,
  ListOrdered,
  Pencil,
  Redo2,
  RemoveFormatting,
  Strikethrough,
  Subscript,
  Superscript,
  Underline,
  Undo2
} from "lucide-react";
import { useEffect, useRef, useState } from "react";

type RichTextEditorProps = {
  value: string;
  onChange: (value: string) => void;
  label?: string;
  placeholder?: string;
  minHeight?: number;
};

export function RichTextEditor({ value, onChange, label, placeholder = "Введите текст...", minHeight = 220 }: RichTextEditorProps) {
  const editorRef = useRef<HTMLDivElement>(null);
  const focusedRef = useRef(false);
  const [preview, setPreview] = useState(false);

  useEffect(() => {
    const editor = editorRef.current;
    if (!editor || focusedRef.current) return;
    const next = normalizeEditorValue(value);
    if (editor.innerHTML !== next) editor.innerHTML = next;
  }, [value, preview]);

  function emitChange() {
    const editor = editorRef.current;
    if (!editor) return;
    const safe = richTextToSafeHtml(editor.innerHTML);
    onChange(safe === "<p><br></p>" ? "" : safe);
  }

  function command(name: string, commandValue?: string) {
    const editor = editorRef.current;
    if (!editor) return;
    editor.focus();
    document.execCommand("styleWithCSS", false, "true");
    document.execCommand(name, false, commandValue);
    emitChange();
  }

  function addLink() {
    const href = window.prompt("Введите адрес ссылки", "https://");
    if (href) command("createLink", href);
  }

  function applyPreset(preset: "normal" | "intro" | "accent" | "note" | "quote") {
    if (preset === "normal") {
      command("formatBlock", "p");
      command("removeFormat");
      return;
    }
    if (preset === "intro") {
      command("formatBlock", "p");
      command("fontSize", "4");
      command("bold");
      return;
    }
    if (preset === "quote") {
      command("formatBlock", "blockquote");
      command("italic");
      return;
    }
    command("formatBlock", preset === "note" ? "blockquote" : "p");
    command("backColor", preset === "note" ? "#f8fafc" : "#e0f2fe");
  }

  function setLineHeight(value: string) {
    const selection = window.getSelection();
    const node = selection?.anchorNode;
    const element = node instanceof HTMLElement ? node : node?.parentElement;
    const block = element?.closest("p,div,h2,h3,h4,blockquote,li") as HTMLElement | null;
    if (block && editorRef.current?.contains(block)) {
      block.style.lineHeight = value;
      emitChange();
    }
  }

  const toolbarButton = "focus-ring grid size-9 shrink-0 place-items-center rounded-[6px] border border-line bg-white text-slate-600 transition hover:border-apple hover:text-apple";

  return (
    <div className="grid gap-2">
      {label ? <p className="text-sm font-semibold text-slate-600">{label}</p> : null}
      <div className="overflow-hidden rounded-[8px] border border-line bg-white shadow-sm">
        <div className="flex flex-wrap items-center justify-between gap-2 border-b border-line bg-mist p-2">
          <div className="flex flex-wrap gap-2">
            <PresetButton active={false} onClick={() => applyPreset("normal")}>Обычный</PresetButton>
            <PresetButton active={false} onClick={() => applyPreset("intro")}>Вступление</PresetButton>
            <PresetButton active={false} onClick={() => applyPreset("accent")}>Акцент</PresetButton>
            <PresetButton active={false} onClick={() => applyPreset("note")}>Заметка</PresetButton>
            <PresetButton active={false} onClick={() => applyPreset("quote")}>Цитата</PresetButton>
          </div>
          <button type="button" onClick={() => setPreview((current) => !current)} className="focus-ring flex h-9 items-center gap-2 rounded-[6px] border border-line bg-white px-3 text-sm font-semibold text-ink">
            {preview ? <Pencil size={16} /> : <Eye size={16} />}
            {preview ? "Редактировать" : "Предпросмотр"}
          </button>
        </div>

        {!preview ? (
          <>
            <div className="flex flex-wrap items-center gap-1 border-b border-line bg-[#f3f1ec] p-2">
              <ToolButton title="Отменить" onClick={() => command("undo")} className={toolbarButton}><Undo2 size={17} /></ToolButton>
              <ToolButton title="Повторить" onClick={() => command("redo")} className={toolbarButton}><Redo2 size={17} /></ToolButton>
              <ToolButton title="Очистить форматирование" onClick={() => command("removeFormat")} className={toolbarButton}><RemoveFormatting size={17} /></ToolButton>
              <ToolbarSelect title="Стиль" defaultValue="p" onChange={(next) => command("formatBlock", next)} options={[['p', 'Абзац'], ['h2', 'Заголовок 2'], ['h3', 'Заголовок 3'], ['blockquote', 'Цитата']]} />
              <ToolbarSelect title="Шрифт" defaultValue="Arial" onChange={(next) => command("fontName", next)} options={[["Arial", "Arial"], ["Georgia", "Georgia"], ["Tahoma", "Tahoma"], ["Verdana", "Verdana"], ["Times New Roman", "Times New Roman"]]} />
              <ToolbarSelect title="Размер" defaultValue="3" onChange={(next) => command("fontSize", next)} options={[["2", "Маленький"], ["3", "Обычный"], ["4", "Крупный"], ["5", "Очень крупный"]]} />
              <ToolButton title="Жирный" onClick={() => command("bold")} className={toolbarButton}><Bold size={17} /></ToolButton>
              <ToolButton title="Курсив" onClick={() => command("italic")} className={toolbarButton}><Italic size={17} /></ToolButton>
              <ToolButton title="Подчёркивание" onClick={() => command("underline")} className={toolbarButton}><Underline size={17} /></ToolButton>
              <ToolButton title="Зачёркивание" onClick={() => command("strikeThrough")} className={toolbarButton}><Strikethrough size={17} /></ToolButton>
              <ToolButton title="Надстрочный" onClick={() => command("superscript")} className={toolbarButton}><Superscript size={17} /></ToolButton>
              <ToolButton title="Подстрочный" onClick={() => command("subscript")} className={toolbarButton}><Subscript size={17} /></ToolButton>
              <label title="Цвет текста" className={`${toolbarButton} relative cursor-pointer`}><span className="font-bold">A</span><input type="color" defaultValue="#172033" onInput={(event) => command("foreColor", event.currentTarget.value)} className="absolute inset-0 cursor-pointer opacity-0" /></label>
              <label title="Цвет выделения" className={`${toolbarButton} relative cursor-pointer`}><Highlighter size={17} /><input type="color" defaultValue="#fde68a" onInput={(event) => command("backColor", event.currentTarget.value)} className="absolute inset-0 cursor-pointer opacity-0" /></label>
              <ToolButton title="Добавить ссылку" onClick={addLink} className={toolbarButton}><Link2 size={17} /></ToolButton>
              <ToolButton title="По левому краю" onClick={() => command("justifyLeft")} className={toolbarButton}><AlignLeft size={17} /></ToolButton>
              <ToolButton title="По центру" onClick={() => command("justifyCenter")} className={toolbarButton}><AlignCenter size={17} /></ToolButton>
              <ToolButton title="По правому краю" onClick={() => command("justifyRight")} className={toolbarButton}><AlignRight size={17} /></ToolButton>
              <ToolButton title="По ширине" onClick={() => command("justifyFull")} className={toolbarButton}><AlignJustify size={17} /></ToolButton>
              <ToolbarSelect title="Интервал" defaultValue="1.5" onChange={setLineHeight} options={[["1.2", "Интервал 1.2"], ["1.5", "Интервал 1.5"], ["1.8", "Интервал 1.8"], ["2", "Интервал 2"]]} />
              <ToolButton title="Маркированный список" onClick={() => command("insertUnorderedList")} className={toolbarButton}><List size={17} /></ToolButton>
              <ToolButton title="Нумерованный список" onClick={() => command("insertOrderedList")} className={toolbarButton}><ListOrdered size={17} /></ToolButton>
              <ToolButton title="Уменьшить отступ" onClick={() => command("outdent")} className={toolbarButton}><IndentDecrease size={17} /></ToolButton>
              <ToolButton title="Увеличить отступ" onClick={() => command("indent")} className={toolbarButton}><IndentIncrease size={17} /></ToolButton>
            </div>
            <div
              ref={editorRef}
              contentEditable
              suppressContentEditableWarning
              role="textbox"
              aria-multiline="true"
              data-placeholder={placeholder}
              onFocus={() => { focusedRef.current = true; }}
              onBlur={() => { focusedRef.current = false; emitChange(); }}
              onInput={emitChange}
              className="rich-text-editor focus-ring max-h-[640px] overflow-y-auto px-5 py-4 text-base leading-7 text-ink outline-none empty:before:pointer-events-none empty:before:text-slate-400 empty:before:content-[attr(data-placeholder)] [&_blockquote]:border-l-4 [&_blockquote]:border-apple [&_blockquote]:bg-sky-50 [&_blockquote]:px-4 [&_blockquote]:py-3 [&_h2]:text-2xl [&_h2]:font-semibold [&_h3]:text-xl [&_h3]:font-semibold [&_ol]:list-decimal [&_ol]:pl-6 [&_ul]:list-disc [&_ul]:pl-6"
              style={{ minHeight }}
            />
          </>
        ) : (
          <div className="min-h-[220px] px-5 py-4" dangerouslySetInnerHTML={{ __html: richTextToSafeHtml(value) }} />
        )}
      </div>
    </div>
  );
}

function normalizeEditorValue(value: string) {
  if (!value) return "";
  return /<[^>]+>/.test(value) ? richTextToSafeHtml(value) : plainTextToHtml(value);
}

function ToolButton({ title, onClick, className, children }: { title: string; onClick: () => void; className: string; children: React.ReactNode }) {
  return <button type="button" title={title} aria-label={title} onMouseDown={(event) => event.preventDefault()} onClick={onClick} className={className}>{children}</button>;
}

function ToolbarSelect({ title, defaultValue, options, onChange }: { title: string; defaultValue: string; options: string[][]; onChange: (value: string) => void }) {
  return (
    <select title={title} aria-label={title} defaultValue={defaultValue} onChange={(event) => onChange(event.target.value)} className="focus-ring h-9 min-w-24 rounded-[6px] border border-line bg-white px-2 text-sm font-semibold text-slate-600">
      {options.map(([value, label]) => <option key={value} value={value}>{label}</option>)}
    </select>
  );
}

function PresetButton({ active, onClick, children }: { active: boolean; onClick: () => void; children: React.ReactNode }) {
  return <button type="button" onMouseDown={(event) => event.preventDefault()} onClick={onClick} className={`focus-ring h-9 rounded-[6px] border px-3 text-sm font-semibold ${active ? "border-apple bg-[var(--accent-soft)] text-apple" : "border-line bg-white text-ink"}`}>{children}</button>;
}
