import { useEffect, useRef, useCallback } from "react";
import Editor, { type OnMount, type OnChange } from "@monaco-editor/react";
import * as Monaco from "monaco-editor";
import { useEditorStore } from "../../stores/editorStore";
import { useSettingStore } from "../../stores/settingStore";
import { useSearchStore } from "../../stores/searchStore";
import { useSnippetStore } from "../../stores/snippetStore";
import { defineThemes, getThemeName } from "../../services/monaco/themes";
import { configureLanguages, getLanguageFromPath } from "../../services/monaco/languages";
import { configureFolding } from "../../services/monaco/folding";
import { registerKeybindings } from "../../services/monaco/keybindings";
import { EditOperations } from "../../services/monaco/editOperations";
import { macroRecorder } from "../../services/macro/recorder";
import { clipboardWrite, clipboardRead } from "../../utils/clipboard";
import { useI18n } from "../../stores/i18nStore";

interface MonacoEditorProps {
  tabId: string;
  path: string;
  content: string;
  language?: string;
  readonly?: boolean;
  onContentChange?: (value: string) => void;
  onCursorChange?: (line: number, column: number) => void;
  onSelectionChange?: (chars: number, lines: number) => void;
}

export function MonacoEditor({
  tabId,
  path,
  content,
  language,
  readonly = false,
  onContentChange,
  onCursorChange,
  onSelectionChange,
}: MonacoEditorProps) {
  const editorRef = useRef<Monaco.editor.IStandaloneCodeEditor | null>(null);
  const monacoRef = useRef<typeof Monaco | null>(null);
  const decorationIdsRef = useRef<string[]>([]);
  const { isDark, getBookmarks } = useEditorStore();
  const {
    fontSize, fontFamily, tabSize, insertSpaces, wordWrap,
    showLineNumbers, showWhitespace, showMinimap, folding,
    bracketPairColorization, autoIndent, showIndentGuides,
    wrapLongLines, showPrintMargin, printMarginColumn,
  } = useSettingStore();
  const { searchQuery, replaceQuery, isRegex, caseSensitive } = useSearchStore();
  const { t } = useI18n();

  const handleMount: OnMount = useCallback((editor, monaco) => {
    editorRef.current = editor;
    monacoRef.current = monaco;
    window.monaco = monaco;

    defineThemes(monaco);
    configureLanguages(monaco);
    configureFolding(monaco);
    registerKeybindings(monaco, editor);

    editor.onDidChangeCursorPosition((e) => {
      onCursorChange?.(e.position.lineNumber, e.position.column);
    });

    editor.onDidChangeCursorSelection((e) => {
      const selection = e.selection;
      if (selection.startLineNumber === selection.endLineNumber &&
          selection.startColumn === selection.endColumn) {
        onSelectionChange?.(0, 0);
      } else {
        const text = editor.getModel()?.getValueInRange(selection) || "";
        const lines = Math.abs(selection.endLineNumber - selection.startLineNumber) + 1;
        onSelectionChange?.(text.length, lines);
      }
    });

    editor.onDidChangeModelContent(() => {
      if (macroRecorder.recording()) {
        macroRecorder.record({ type: "command", payload: { id: "type" } });
      }
    });

    editor.onMouseDown((e) => {
      if (e.target.type === Monaco.editor.MouseTargetType.GUTTER_GLYPH_MARGIN) {
        const line = e.target.position?.lineNumber;
        if (line) {
          useEditorStore.getState().toggleBookmark(tabId, line);
        }
      }
    });

    editor.addAction({
      id: "markpt-delete-line",
      label: t("action.deleteLine"),
      keybindings: [Monaco.KeyMod.CtrlCmd | Monaco.KeyCode.KeyD],
      run: (ed) => EditOperations.deleteCurrentLine(ed, monaco),
    });
    editor.addAction({
      id: "markpt-duplicate-line",
      label: t("action.duplicateLine"),
      keybindings: [Monaco.KeyMod.Shift | Monaco.KeyMod.Alt | Monaco.KeyCode.KeyD],
      run: (ed) => EditOperations.duplicateCurrentLine(ed),
    });
    editor.addAction({
      id: "markpt-move-line-up",
      label: t("action.moveUp"),
      keybindings: [Monaco.KeyMod.Alt | Monaco.KeyCode.UpArrow],
      run: (ed) => EditOperations.moveLineUp(ed),
    });
    editor.addAction({
      id: "markpt-move-line-down",
      label: t("action.moveDown"),
      keybindings: [Monaco.KeyMod.Alt | Monaco.KeyCode.DownArrow],
      run: (ed) => EditOperations.moveLineDown(ed),
    });
    editor.addAction({
      id: "markpt-delete-blank-lines",
      label: t("action.deleteBlank"),
      run: (ed) => EditOperations.deleteBlankLines(ed),
    });
    editor.addAction({
      id: "markpt-trim-trailing",
      label: t("action.trimTrailing"),
      run: (ed) => EditOperations.trimTrailingWhitespace(ed),
    });
    editor.addAction({
      id: "markpt-trim-leading",
      label: t("action.trimTrailing"),
      run: (ed) => EditOperations.trimLeadingWhitespace(ed),
    });
    editor.addAction({
      id: "markpt-upper-case",
      label: t("action.toUpperCase"),
      keybindings: [Monaco.KeyMod.CtrlCmd | Monaco.KeyMod.Shift | Monaco.KeyCode.KeyU],
      run: (ed) => EditOperations.toUpperCase(ed),
    });
    editor.addAction({
      id: "markpt-lower-case",
      label: t("action.toLowerCase"),
      keybindings: [Monaco.KeyMod.CtrlCmd | Monaco.KeyMod.Shift | Monaco.KeyCode.KeyL],
      run: (ed) => EditOperations.toLowerCase(ed),
    });
    editor.addAction({
      id: "markpt-title-case",
      label: t("action.toUpperCase"),
      run: (ed) => EditOperations.toTitleCase(ed),
    });
    editor.addAction({
      id: "markpt-invert-case",
      label: t("action.toUpperCase"),
      run: (ed) => EditOperations.invertCase(ed),
    });
    editor.addAction({
      id: "markpt-sort-asc",
      label: t("action.sortAsc"),
      run: (ed) => EditOperations.sortLinesAscending(ed),
    });
    editor.addAction({
      id: "markpt-sort-desc",
      label: t("action.sortDesc"),
      run: (ed) => EditOperations.sortLinesDescending(ed),
    });
    editor.addAction({
      id: "markpt-toggle-comment",
      label: t("action.toggleComment"),
      keybindings: [Monaco.KeyMod.CtrlCmd | Monaco.KeyCode.Slash],
      run: (ed) => EditOperations.toggleLineComment(ed, monaco),
    });
    editor.addAction({
      id: "markpt-remove-duplicates",
      label: t("action.removeDuplicates"),
      run: (ed) => EditOperations.removeDuplicateLines(ed),
    });
    editor.addAction({
      id: "markpt-sort-length-asc",
      label: t("action.sortAsc"),
      run: (ed) => EditOperations.sortLinesByLength(ed, false),
    });
    editor.addAction({
      id: "markpt-sort-length-desc",
      label: t("action.sortDesc"),
      run: (ed) => EditOperations.sortLinesByLength(ed, true),
    });
    editor.addAction({
      id: "markpt-sort-random",
      label: t("action.sortDesc"),
      run: (ed) => EditOperations.sortLinesRandom(ed),
    });
    editor.addAction({
      id: "markpt-reverse-lines",
      label: t("action.sortDesc"),
      run: (ed) => EditOperations.reverseLineOrder(ed),
    });

    const doCopy = async (ed: Monaco.editor.IStandaloneCodeEditor) => {
      const sel = ed.getSelection();
      if (!sel) return;
      const text = ed.getModel()?.getValueInRange(sel) || "";
      if (text) await clipboardWrite(text);
    };
    const doCut = async (ed: Monaco.editor.IStandaloneCodeEditor) => {
      const sel = ed.getSelection();
      if (!sel) return;
      const model = ed.getModel();
      if (!model) return;
      const text = model.getValueInRange(sel);
      if (text) {
        await clipboardWrite(text);
        ed.executeEdits("cut", [{ range: sel, text: "" }]);
      }
    };
    const doPaste = async (ed: Monaco.editor.IStandaloneCodeEditor) => {
      const text = await clipboardRead();
      if (!text) return;
      const sel = ed.getSelection();
      if (!sel) return;
      ed.executeEdits("paste", [{ range: sel, text, forceMoveMarkers: true }]);
    };

    editor.addAction({
      id: "markpt-clipboard-copy",
      label: t("toolbar.copy"),
      keybindings: [Monaco.KeyMod.CtrlCmd | Monaco.KeyCode.KeyC],
      contextMenuGroupId: "9_cutcopypaste",
      run: (ed) => { doCopy(ed as Monaco.editor.IStandaloneCodeEditor); },
    });
    editor.addAction({
      id: "markpt-clipboard-cut",
      label: t("toolbar.cut"),
      keybindings: [Monaco.KeyMod.CtrlCmd | Monaco.KeyCode.KeyX],
      contextMenuGroupId: "9_cutcopypaste",
      run: (ed) => { doCut(ed as Monaco.editor.IStandaloneCodeEditor); },
    });
    editor.addAction({
      id: "markpt-clipboard-paste",
      label: t("toolbar.paste"),
      keybindings: [Monaco.KeyMod.CtrlCmd | Monaco.KeyCode.KeyV],
      contextMenuGroupId: "9_cutcopypaste",
      run: (ed) => { doPaste(ed as Monaco.editor.IStandaloneCodeEditor); },
    });

    editor.addAction({
      id: "markpt-context-find",
      label: t("search.find"),
      keybindings: [Monaco.KeyMod.CtrlCmd | Monaco.KeyCode.KeyF],
      contextMenuGroupId: "8_search",
      run: () => { useSearchStore.getState().toggleSearchPanel(); },
    });
    editor.addAction({
      id: "markpt-context-replace",
      label: t("search.replace"),
      keybindings: [Monaco.KeyMod.CtrlCmd | Monaco.KeyCode.KeyH],
      contextMenuGroupId: "8_search",
      run: () => { useSearchStore.getState().toggleReplacePanel(); },
    });
    editor.addAction({
      id: "markpt-context-goto-line",
      label: t("toolbar.gotoLine"),
      keybindings: [Monaco.KeyMod.CtrlCmd | Monaco.KeyCode.KeyG],
      contextMenuGroupId: "8_search",
      run: () => { window.dispatchEvent(new CustomEvent("markpt:goto-line")); },
    });
    editor.addAction({
      id: "markpt-context-toggle-comment",
      label: t("action.toggleComment"),
      keybindings: [Monaco.KeyMod.CtrlCmd | Monaco.KeyCode.Slash],
      contextMenuGroupId: "7_edit",
      run: (ed) => EditOperations.toggleLineComment(ed, monaco),
    });
    editor.addAction({
      id: "markpt-context-format",
      label: t("action.toggleComment"),
      contextMenuGroupId: "7_edit",
      run: (ed) => { ed.getAction("editor.action.formatDocument")?.run(); },
    });
    editor.addAction({
      id: "markpt-context-duplicate",
      label: t("action.duplicateLine"),
      contextMenuGroupId: "7_edit",
      run: (ed) => EditOperations.duplicateCurrentLine(ed),
    });
    editor.addAction({
      id: "markpt-context-delete-line",
      label: t("action.deleteLine"),
      contextMenuGroupId: "7_edit",
      run: (ed) => EditOperations.deleteCurrentLine(ed, monaco),
    });
    editor.addAction({
      id: "markpt-context-insert-datetime",
      label: t("dialog.insertDateTime"),
      contextMenuGroupId: "6_insert",
      run: (ed) => {
        const now = new Date();
        const text = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-${String(now.getDate()).padStart(2, "0")} ${String(now.getHours()).padStart(2, "0")}:${String(now.getMinutes()).padStart(2, "0")}:${String(now.getSeconds()).padStart(2, "0")}`;
        const pos = ed.getPosition();
        if (pos) ed.executeEdits("insert-datetime", [{ range: new monaco.Range(pos.lineNumber, pos.column, pos.lineNumber, pos.column), text }]);
      },
    });
    editor.addAction({
      id: "markpt-context-select-all",
      label: t("toolbar.lineNumbers"),
      keybindings: [Monaco.KeyMod.CtrlCmd | Monaco.KeyCode.KeyA],
      contextMenuGroupId: "9_cutcopypaste",
      run: (ed) => {
        const model = ed.getModel();
        if (model) ed.setSelection(new monaco.Range(1, 1, model.getLineCount(), model.getLineMaxColumn(model.getLineCount()) + 1));
      },
    });

    const container = editor.getContainerDomNode();
    const resizeObserver = new ResizeObserver(() => {
      requestAnimationFrame(() => editor.layout());
    });
    resizeObserver.observe(container);
    window.addEventListener("resize", () => editor.layout());

    return () => {
      resizeObserver.disconnect();
    };
  }, [onCursorChange, tabId, t]);

  // 行号跳转
  useEffect(() => {
    const handler = (e: Event) => {
      const line = (e as CustomEvent).detail?.line;
      if (editorRef.current && line) {
        editorRef.current.revealLineInCenter(line);
        editorRef.current.setPosition({ lineNumber: line, column: 1 });
        editorRef.current.focus();
      }
    };
    window.addEventListener("markpt:goto-line-confirm", handler);
    return () => window.removeEventListener("markpt:goto-line-confirm", handler);
  }, []);

  // 编辑操作（菜单触发）
  useEffect(() => {
    const handler = (e: Event) => {
      const action = (e as CustomEvent).detail?.action;
      const editor = editorRef.current;
      const monaco = monacoRef.current;
      if (!editor || !monaco || !action) return;
      switch (action) {
        case "delete-line": EditOperations.deleteCurrentLine(editor, monaco); break;
        case "duplicate-line": EditOperations.duplicateCurrentLine(editor); break;
        case "move-up": EditOperations.moveLineUp(editor); break;
        case "move-down": EditOperations.moveLineDown(editor); break;
        case "delete-blank": EditOperations.deleteBlankLines(editor); break;
        case "trim-trailing": EditOperations.trimTrailingWhitespace(editor); break;
        case "trim-leading": EditOperations.trimLeadingWhitespace(editor); break;
        case "upper": EditOperations.toUpperCase(editor); break;
        case "lower": EditOperations.toLowerCase(editor); break;
        case "title": EditOperations.toTitleCase(editor); break;
        case "invert": EditOperations.invertCase(editor); break;
        case "sentence-case": EditOperations.toSentenceCase(editor); break;
        case "random-case": EditOperations.toRandomCase(editor); break;
        case "sort-asc": EditOperations.sortLinesAscending(editor); break;
        case "sort-desc": EditOperations.sortLinesDescending(editor); break;
        case "toggle-comment": EditOperations.toggleLineComment(editor, monaco); break;
        case "remove-duplicates": EditOperations.removeDuplicateLines(editor); break;
        case "sort-length-asc": EditOperations.sortLinesByLength(editor, false); break;
        case "sort-length-desc": EditOperations.sortLinesByLength(editor, true); break;
        case "sort-random": EditOperations.sortLinesRandom(editor); break;
        case "reverse-lines": EditOperations.reverseLineOrder(editor); break;
        case "filter-lines": {
          const pattern = prompt(t("editor.filterPrompt"));
          if (pattern) EditOperations.filterLines(editor, pattern, true, false);
          break;
        }
        case "filter-lines-remove": {
          const pattern = prompt(t("editor.filterRemovePrompt"));
          if (pattern) EditOperations.filterLines(editor, pattern, false, false);
          break;
        }
        case "merge-lines": EditOperations.mergeLines(editor, " "); break;
        case "merge-lines-comma": EditOperations.mergeLines(editor, ", "); break;
        case "split-line": EditOperations.splitLine(editor, " "); break;
        case "indent": EditOperations.indent(editor); break;
        case "outdent": EditOperations.outdent(editor); break;
      }
      editor.focus();
    };
    window.addEventListener("markpt:edit-action", handler);
    return () => window.removeEventListener("markpt:edit-action", handler);
  }, []);

  // 撤销/重做
  useEffect(() => {
    const undoHandler = () => { editorRef.current?.trigger("markpt", "undo", null); editorRef.current?.focus(); };
    const redoHandler = () => { editorRef.current?.trigger("markpt", "redo", null); editorRef.current?.focus(); };
    window.addEventListener("markpt:edit-undo", undoHandler);
    window.addEventListener("markpt:edit-redo", redoHandler);
    return () => {
      window.removeEventListener("markpt:edit-undo", undoHandler);
      window.removeEventListener("markpt:edit-redo", redoHandler);
    };
  }, []);

  // 插入文本（日期时间、特殊字符、颜色等）
  useEffect(() => {
    const handler = (e: Event) => {
      const text = (e as CustomEvent).detail?.text;
      if (!editorRef.current || !text) return;
      const editor = editorRef.current;
      const position = editor.getPosition();
      if (!position) return;
      editor.executeEdits("insert-text", [{
        range: new monacoRef.current!.Range(position.lineNumber, position.column, position.lineNumber, position.column),
        text,
      }]);
      editor.focus();
    };
    window.addEventListener("markpt:insert-text", handler);
    return () => window.removeEventListener("markpt:insert-text", handler);
  }, []);

  // 剪贴板操作（工具栏/菜单触发）
  useEffect(() => {
    const copyHandler = async () => {
      const editor = editorRef.current;
      if (!editor) return;
      const sel = editor.getSelection();
      if (!sel) return;
      const text = editor.getModel()?.getValueInRange(sel) || "";
      if (text) await clipboardWrite(text);
    };
    const cutHandler = async () => {
      const editor = editorRef.current;
      if (!editor) return;
      const sel = editor.getSelection();
      if (!sel) return;
      const model = editor.getModel();
      if (!model) return;
      const text = model.getValueInRange(sel);
      if (text) {
        await clipboardWrite(text);
        editor.executeEdits("cut", [{ range: sel, text: "" }]);
      }
    };
    const pasteHandler = async () => {
      const editor = editorRef.current;
      if (!editor) return;
      const text = await clipboardRead();
      if (!text) return;
      const sel = editor.getSelection();
      if (!sel) return;
      editor.executeEdits("paste", [{ range: sel, text, forceMoveMarkers: true }]);
      editor.focus();
    };
    window.addEventListener("markpt:editor-copy", copyHandler);
    window.addEventListener("markpt:editor-cut", cutHandler);
    window.addEventListener("markpt:editor-paste", pasteHandler);
    return () => {
      window.removeEventListener("markpt:editor-copy", copyHandler);
      window.removeEventListener("markpt:editor-cut", cutHandler);
      window.removeEventListener("markpt:editor-paste", pasteHandler);
    };
  }, []);

  // 代码格式化
  useEffect(() => {
    const handler = () => {
      if (!editorRef.current) return;
      editorRef.current.getAction("editor.action.formatDocument")?.run();
      editorRef.current.focus();
    };
    window.addEventListener("markpt:format-code", handler);
    return () => window.removeEventListener("markpt:format-code", handler);
  }, []);

  // 缩放
  useEffect(() => {
    const zoomIn = () => { const ed = editorRef.current; if (ed) { const opts = ed.getOptions(); const size = (opts.get(monacoRef.current!.editor.EditorOption.fontSize) as unknown as number) || 14; ed.updateOptions({ fontSize: Math.min(size + 1, 32) }); } };
    const zoomOut = () => { const ed = editorRef.current; if (ed) { const opts = ed.getOptions(); const size = (opts.get(monacoRef.current!.editor.EditorOption.fontSize) as unknown as number) || 14; ed.updateOptions({ fontSize: Math.max(size - 1, 8) }); } };
    const zoomReset = () => { editorRef.current?.updateOptions({ fontSize }); };
    window.addEventListener("markpt:zoom-in", zoomIn);
    window.addEventListener("markpt:zoom-out", zoomOut);
    window.addEventListener("markpt:zoom-reset", zoomReset);
    return () => {
      window.removeEventListener("markpt:zoom-in", zoomIn);
      window.removeEventListener("markpt:zoom-out", zoomOut);
      window.removeEventListener("markpt:zoom-reset", zoomReset);
    };
  }, [fontSize]);

  // 查找下一个/上一个
  useEffect(() => {
    const findNext = () => { editorRef.current?.getAction("editor.action.nextMatchFindAction")?.run(); };
    const findPrev = () => { editorRef.current?.getAction("editor.action.previousMatchFindAction")?.run(); };
    window.addEventListener("markpt:find-next", findNext);
    window.addEventListener("markpt:find-prev", findPrev);
    return () => {
      window.removeEventListener("markpt:find-next", findNext);
      window.removeEventListener("markpt:find-prev", findPrev);
    };
  }, []);

  // 书签导航
  useEffect(() => {
    const nextBookmark = () => {
      const bookmarks = useEditorStore.getState().getBookmarks(tabId).sort((a, b) => a - b);
      const pos = editorRef.current?.getPosition();
      if (!pos || bookmarks.length === 0) return;
      const next = bookmarks.find((b) => b > pos.lineNumber) || bookmarks[0];
      editorRef.current?.revealLineInCenter(next);
      editorRef.current?.setPosition({ lineNumber: next, column: 1 });
    };
    const prevBookmark = () => {
      const bookmarks = useEditorStore.getState().getBookmarks(tabId).sort((a, b) => b - a);
      const pos = editorRef.current?.getPosition();
      if (!pos || bookmarks.length === 0) return;
      const prev = bookmarks.find((b) => b < pos.lineNumber) || bookmarks[0];
      editorRef.current?.revealLineInCenter(prev);
      editorRef.current?.setPosition({ lineNumber: prev, column: 1 });
    };
    const clearBookmarks = () => { useEditorStore.getState().clearBookmarks(tabId); };
    window.addEventListener("markpt:next-bookmark", nextBookmark);
    window.addEventListener("markpt:prev-bookmark", prevBookmark);
    window.addEventListener("markpt:clear-bookmarks", clearBookmarks);
    return () => {
      window.removeEventListener("markpt:next-bookmark", nextBookmark);
      window.removeEventListener("markpt:prev-bookmark", prevBookmark);
      window.removeEventListener("markpt:clear-bookmarks", clearBookmarks);
    };
  }, [tabId]);

  // 语言切换
  useEffect(() => {
    const handler = (e: Event) => {
      const language = (e as CustomEvent).detail?.language;
      const model = editorRef.current?.getModel();
      if (model && language && monacoRef.current) {
        monacoRef.current.editor.setModelLanguage(model, language);
      }
    };
    window.addEventListener("markpt:set-language", handler);
    return () => window.removeEventListener("markpt:set-language", handler);
  }, []);

  // 跳转到匹配括号
  useEffect(() => {
    const handler = () => { editorRef.current?.getAction("editor.action.jumpToBracket")?.run(); };
    window.addEventListener("markpt:jump-to-bracket", handler);
    return () => window.removeEventListener("markpt:jump-to-bracket", handler);
  }, []);

  // 选中到匹配括号
  useEffect(() => {
    const handler = () => { editorRef.current?.getAction("editor.action.selectToBracket")?.run(); };
    window.addEventListener("markpt:select-to-bracket", handler);
    return () => window.removeEventListener("markpt:select-to-bracket", handler);
  }, []);

  // 环绕选中文本
  useEffect(() => {
    const handler = (e: Event) => {
      const detail = (e as CustomEvent).detail;
      if (!editorRef.current || !monacoRef.current || !detail) return;
      const editor = editorRef.current;
      const monaco = monacoRef.current;
      const selection = editor.getSelection();
      if (!selection) return;
      const model = editor.getModel();
      if (!model) return;
      const selectedText = model.getValueInRange(selection);
      const newText = `${detail.open}${selectedText}${detail.close}`;
      editor.executeEdits("surround", [{
        range: new monaco.Range(
          selection.startLineNumber, selection.startColumn,
          selection.endLineNumber, selection.endColumn
        ),
        text: newText,
      }]);
      const newEndCol = selection.startColumn + newText.length;
      editor.setSelection(new monaco.Range(
        selection.startLineNumber, selection.startColumn + detail.open.length,
        selection.endLineNumber, newEndCol - detail.close.length
      ));
      editor.focus();
    };
    window.addEventListener("markpt:surround-selection", handler);
    return () => window.removeEventListener("markpt:surround-selection", handler);
  }, []);

  // 查找替换
  useEffect(() => {
    const replaceHandler = (e: Event) => {
      const detail = (e as CustomEvent).detail;
      if (!editorRef.current || !monacoRef.current || !detail) return;
      const editor = editorRef.current;
      const model = editor.getModel();
      if (!model) return;

      const flags = detail.caseSensitive ? "g" : "gi";
      let regex: RegExp;
      try {
        regex = detail.isRegex
          ? new RegExp(detail.search, flags)
          : new RegExp(detail.search.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"), flags);
      } catch {
        return;
      }

      const selection = editor.getSelection();
      if (!selection) return;

      const lineContent = model.getLineContent(selection.startLineNumber);
      const match = regex.exec(lineContent);
      if (match && match.index !== undefined) {
        const startCol = match.index + 1;
        const endCol = match.index + match[0].length + 1;
        editor.setSelection(new monacoRef.current.Range(
          selection.startLineNumber, startCol,
          selection.startLineNumber, endCol
        ));
        editor.executeEdits("replace", [{
          range: new monacoRef.current.Range(
            selection.startLineNumber, startCol,
            selection.startLineNumber, endCol
          ),
          text: detail.replace,
        }]);
      }
    };

    const replaceAllHandler = (e: Event) => {
      const detail = (e as CustomEvent).detail;
      if (!editorRef.current || !monacoRef.current || !detail) return;
      const editor = editorRef.current;
      const model = editor.getModel();
      if (!model) return;

      const flags = detail.caseSensitive ? "g" : "gi";
      let regex: RegExp;
      try {
        regex = detail.isRegex
          ? new RegExp(detail.search, flags)
          : new RegExp(detail.search.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"), flags);
      } catch {
        return;
      }

      const selection = editor.getSelection();
      const searchInSelection = useSearchStore.getState().searchInSelection;
      if (searchInSelection && selection && !selection.isEmpty()) {
        const selectedText = model.getValueInRange(selection);
        const newText = selectedText.replace(regex, detail.replace);
        editor.executeEdits("replace-all-in-selection", [{
          range: new monacoRef.current.Range(
            selection.startLineNumber, selection.startColumn,
            selection.endLineNumber, selection.endColumn
          ),
          text: newText,
        }]);
      } else {
        const fullText = model.getValue();
        const newText = fullText.replace(regex, detail.replace);
        model.setValue(newText);
      }
    };

    window.addEventListener("markpt:execute-replace", replaceHandler);
    window.addEventListener("markpt:execute-replace-all", replaceAllHandler);
    return () => {
      window.removeEventListener("markpt:execute-replace", replaceHandler);
      window.removeEventListener("markpt:execute-replace-all", replaceAllHandler);
    };
  }, []);

  const resolvedLanguage = language || getLanguageFromPath(path);

  // 智能高亮（光标处单词全文档高亮，带节流避免大文件卡顿）
  useEffect(() => {
    const editor = editorRef.current;
    const monaco = monacoRef.current;
    if (!editor || !monaco) return;

    let smartDecorations: string[] = [];
    let pendingCleanup: (() => void) | null = null;
    const THROTTLE_MS = 150;
    let lastRun = 0;

    const runHighlight = () => {
      const model = editor.getModel();
      if (!model) return;
      const pos = editor.getPosition();
      if (!pos) return;
      const word = model.getWordAtPosition(pos);
      if (!word || word.word.length < 2) {
        smartDecorations = editor.deltaDecorations(smartDecorations, []);
        return;
      }
      const matches: { range: Monaco.IRange; options: Monaco.editor.IModelDecorationOptions }[] = [];
      const flags = "gi";
      let regex: RegExp;
      try { regex = new RegExp(`\\b${word.word.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}\\b`, flags); } catch { return; }
      const lineCount = model.getLineCount();
      for (let i = 1; i <= lineCount && matches.length < 500; i++) {
        const line = model.getLineContent(i);
        let m;
        while ((m = regex.exec(line)) !== null && matches.length < 500) {
          matches.push({
            range: new monaco.Range(i, m.index + 1, i, m.index + m[0].length + 1),
            options: { inlineClassName: "markpt-smart-highlight", stickiness: 1 },
          });
          if (m.index === regex.lastIndex) regex.lastIndex++;
        }
      }
      smartDecorations = editor.deltaDecorations(smartDecorations, matches);
    };

    const handler = editor.onDidChangeCursorPosition((e) => {
      const now = performance.now();
      const elapsed = now - lastRun;
      if (pendingCleanup) { pendingCleanup(); pendingCleanup = null; }
      if (elapsed < THROTTLE_MS) {
        pendingCleanup = setTimeout(runHighlight, THROTTLE_MS - elapsed) as unknown as () => void;
      } else {
        lastRun = now;
        runHighlight();
      }
    });

    return () => {
      if (pendingCleanup) clearTimeout(pendingCleanup as unknown as number);
      handler.dispose();
    };
  }, []);

  // 代码片段 Tab 展开
  useEffect(() => {
    const editor = editorRef.current;
    const monaco = monacoRef.current;
    if (!editor || !monaco) return;

    const handler = editor.onKeyDown((e) => {
      if (e.keyCode !== Monaco.KeyCode.Tab) return;
      const model = editor.getModel();
      const position = editor.getPosition();
      if (!model || !position) return;
      const lineContent = model.getLineContent(position.lineNumber);
      const beforeCursor = lineContent.substring(0, position.column - 1);
      const match = beforeCursor.match(/(\w+)$/);
      if (!match) return;
      const trigger = match[1];
      const snippet = useSnippetStore.getState().findSnippet(trigger, resolvedLanguage);
      if (!snippet) return;
      e.preventDefault();
      e.stopPropagation();
      const startCol = position.column - trigger.length;
      editor.executeEdits("snippet", [{
        range: new monaco.Range(position.lineNumber, startCol, position.lineNumber, position.column),
        text: snippet.body.replace(/\$\{\d+:?([^}]*)\}/g, "$1"),
      }]);
    });

    return () => handler.dispose();
  }, [resolvedLanguage]);

  // 隐藏行
  useEffect(() => {
    const handler = (e: Event) => {
      const detail = (e as CustomEvent).detail;
      if (!editorRef.current || !monacoRef.current || !detail) return;
      const editor = editorRef.current;
      const monaco = monacoRef.current;
      const model = editor.getModel();
      if (!model) return;
      const { startLine, endLine, hide } = detail;
      if (hide) {
        const decorations = [{
          range: new monaco.Range(startLine, 1, endLine, model.getLineContent(endLine).length + 1),
          options: { inlineClassName: "markpt-hidden-line", stickiness: 1 },
        }];
        (editor as any).__hiddenDecorations = editor.deltaDecorations((editor as any).__hiddenDecorations || [], decorations);
      } else {
        (editor as any).__hiddenDecorations = editor.deltaDecorations((editor as any).__hiddenDecorations || [], []);
      }
    };
    window.addEventListener("markpt:toggle-hide-lines", handler);
    return () => window.removeEventListener("markpt:toggle-hide-lines", handler);
  }, []);

  // 书签装饰
  useEffect(() => {
    const editor = editorRef.current;
    const monaco = monacoRef.current;
    if (!editor || !monaco) return;

    const bookmarks = getBookmarks(tabId);
    const decorations = bookmarks.map((line) => ({
      range: new monaco.Range(line, 1, line, 1),
      options: {
        isWholeLine: true,
        glyphMarginClassName: "markpt-bookmark-glyph",
        glyphMarginHoverMessage: { value: "书签" },
        stickiness: 1,
        overviewRuler: {
          color: isDark ? "#0a84ff" : "#007aff",
          position: monaco.editor.OverviewRulerLane.Right,
        },
      },
    }));

    decorationIdsRef.current = editor.deltaDecorations(decorationIdsRef.current, decorations);
  }, [tabId, getBookmarks, isDark]);

  // 主题切换
  useEffect(() => {
    if (editorRef.current && monacoRef.current) {
      monacoRef.current.editor.setTheme(getThemeName(isDark));
    }
  }, [isDark]);

  // 搜索高亮
  useEffect(() => {
    const editor = editorRef.current;
    const monaco = monacoRef.current;
    if (!editor || !monaco) return;

    if (!searchQuery) {
      monaco.editor.setModelMarkers(editor.getModel()!, "search", []);
      return;
    }

    const model = editor.getModel();
    if (!model) return;

    const flags = caseSensitive ? "g" : "gi";
    let regex: RegExp;
    try {
      regex = isRegex
        ? new RegExp(searchQuery, flags)
        : new RegExp(searchQuery.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"), flags);
    } catch {
      return;
    }

    const matches: Monaco.editor.IMarkerData[] = [];
    const lineCount = model.getLineCount();
    for (let i = 1; i <= lineCount && matches.length < 1000; i++) {
      const line = model.getLineContent(i);
      let match;
      while ((match = regex.exec(line)) !== null && matches.length < 1000) {
        matches.push({
          startLineNumber: i,
          startColumn: match.index + 1,
          endLineNumber: i,
          endColumn: match.index + match[0].length + 1,
          message: "匹配",
          severity: monaco.MarkerSeverity.Info,
        });
        if (match.index === regex.lastIndex) regex.lastIndex++;
      }
    }
    monaco.editor.setModelMarkers(model, "search", matches);
  }, [searchQuery, isRegex, caseSensitive]);

  const handleChange: OnChange = useCallback((value) => {
    onContentChange?.(value || "");
  }, [onContentChange]);

  const options: Monaco.editor.IStandaloneEditorConstructionOptions = {
    readOnly: readonly,
    fontSize, fontFamily,
    lineHeight: Math.round(fontSize * 1.4),
    tabSize, insertSpaces,
    wordWrap: wordWrap ? "on" : wrapLongLines ? "bounded" : "off",
    lineNumbers: showLineNumbers ? "on" : "off",
    renderWhitespace: showWhitespace ? "all" : "boundary",
    minimap: { enabled: showMinimap },
    folding,
    bracketPairColorization: { enabled: bracketPairColorization },
    guides: { bracketPairs: bracketPairColorization, indentation: showIndentGuides },
    autoIndent: autoIndent ? "advanced" : "none",
    cursorBlinking: "blink",
    cursorSmoothCaretAnimation: "on",
    selectOnLineNumbers: true,
    roundedSelection: true,
    scrollBeyondLastLine: false,
    automaticLayout: true,
    smoothScrolling: true,
    mouseWheelZoom: true,
    multiCursorModifier: "ctrlCmd",
    columnSelection: true,
    linkedEditing: true,
    trimAutoWhitespace: true,
    renderLineHighlight: "all",
    glyphMargin: true,
    fixedOverflowWidgets: true,
    contextmenu: true,
    quickSuggestions: { other: true, comments: false, strings: false },
    suggestOnTriggerCharacters: true,
    acceptSuggestionOnEnter: "on",
    tabCompletion: "on",
    wordBasedSuggestions: "allDocuments",
    suggest: { showWords: true, showSnippets: true, showClasses: true, showFunctions: true, showVariables: true, showModules: true, showIcons: true },
    autoClosingBrackets: "always",
    autoClosingQuotes: "always",
    autoSurround: "languageDefined",
    matchBrackets: "always",
    formatOnPaste: true,
    maxTokenizationLineLength: 20000,
    find: {
      addExtraSpaceOnTop: false,
      autoFindInSelection: "never",
      seedSearchStringFromSelection: "always",
    },
  };

  return (
    <div className="monaco-editor-wrapper" data-tab-id={tabId}>
      <Editor
        height="100%"
        width="100%"
        language={resolvedLanguage}
        value={content}
        theme={getThemeName(isDark)}
        options={options}
        onMount={handleMount}
        onChange={handleChange}
        loading={
          <div className="editor-loading">
            <span>{t("editor.loading")}</span>
          </div>
        }
      />
    </div>
  );
}
