import type * as Monaco from "monaco-editor";

type Editor = Monaco.editor.ICodeEditor;

export class EditOperations {
  static deleteCurrentLine(editor: Editor, monaco: typeof Monaco): void {
    const position = editor.getPosition();
    const model = editor.getModel();
    if (!position || !model) return;
    const lineCount = model.getLineCount();
    const range = position.lineNumber < lineCount
      ? new monaco.Range(position.lineNumber, 1, position.lineNumber + 1, 1)
      : new monaco.Range(position.lineNumber - 1, model.getLineContent(position.lineNumber - 1).length + 1, position.lineNumber, model.getLineContent(position.lineNumber).length + 1);
    editor.executeEdits("delete-line", [{ range, text: "" }]);
  }

  static duplicateCurrentLine(editor: Editor): void {
    const position = editor.getPosition();
    const model = editor.getModel();
    if (!position || !model) return;
    const lineContent = model.getLineContent(position.lineNumber);
    editor.executeEdits("duplicate-line", [{
      range: { startLineNumber: position.lineNumber, startColumn: 1, endLineNumber: position.lineNumber, endColumn: 1 } as any,
      text: lineContent + "\n",
    }]);
  }

  static moveLineUp(editor: Editor): void {
    const position = editor.getPosition();
    const model = editor.getModel();
    if (!position || !model || position.lineNumber <= 1) return;
    const currentLine = model.getLineContent(position.lineNumber);
    const prevLine = model.getLineContent(position.lineNumber - 1);
    editor.executeEdits("move-up", [{
      range: { startLineNumber: position.lineNumber - 1, startColumn: 1, endLineNumber: position.lineNumber, endColumn: currentLine.length + 1 } as any,
      text: currentLine + "\n" + prevLine,
    }]);
    editor.setPosition({ lineNumber: position.lineNumber - 1, column: position.column });
  }

  static moveLineDown(editor: Editor): void {
    const position = editor.getPosition();
    const model = editor.getModel();
    if (!position || !model || position.lineNumber >= model.getLineCount()) return;
    const currentLine = model.getLineContent(position.lineNumber);
    const nextLine = model.getLineContent(position.lineNumber + 1);
    editor.executeEdits("move-down", [{
      range: { startLineNumber: position.lineNumber, startColumn: 1, endLineNumber: position.lineNumber + 1, endColumn: nextLine.length + 1 } as any,
      text: nextLine + "\n" + currentLine,
    }]);
    editor.setPosition({ lineNumber: position.lineNumber + 1, column: position.column });
  }

  static deleteBlankLines(editor: Editor): void {
    const model = editor.getModel();
    if (!model) return;
    const lineCount = model.getLineCount();
    if (lineCount <= 1) return;
    const text = model.getValue();
    const lines = text.split("\n");
    const keepIdx = new Set<number>();
    for (let i = 0; i < lines.length; i++) {
      if (!(lines[i].trim() === "" && (i === 0 || lines[i - 1].trim() === ""))) {
        keepIdx.add(i);
      }
    }
    // Build edits in reverse so line numbers stay valid
    const edits: Monaco.editor.IIdentifiedSingleEditOperation[] = [];
    for (let i = lineCount - 1; i >= 0; i--) {
      if (!keepIdx.has(i)) {
        edits.push({
          range: {
            startLineNumber: i + 1,
            startColumn: 1,
            endLineNumber: i + 1,
            endColumn: 1,
          } as Monaco.IRange,
          text: "",
        });
      }
    }
    if (edits.length > 0) editor.executeEdits("delete-blank-lines", edits);
  }

  static trimTrailingWhitespace(editor: Editor): void {
    const model = editor.getModel();
    if (!model) return;
    const lineCount = model.getLineCount();
    const edits: Monaco.editor.IIdentifiedSingleEditOperation[] = [];
    for (let i = 1; i <= lineCount; i++) {
      const line = model.getLineContent(i);
      const trimmed = line.replace(/\s+$/, "");
      if (trimmed !== line) {
        edits.push({
          range: {
            startLineNumber: i,
            startColumn: trimmed.length + 1,
            endLineNumber: i,
            endColumn: line.length + 1,
          } as Monaco.IRange,
          text: "",
        });
      }
    }
    if (edits.length > 0) editor.executeEdits("trim-trailing", edits);
  }

  static trimLeadingWhitespace(editor: Editor): void {
    const model = editor.getModel();
    if (!model) return;
    const lineCount = model.getLineCount();
    const edits: Monaco.editor.IIdentifiedSingleEditOperation[] = [];
    for (let i = 1; i <= lineCount; i++) {
      const line = model.getLineContent(i);
      const trimmed = line.replace(/^\s+/, "");
      if (trimmed !== line) {
        edits.push({
          range: {
            startLineNumber: i,
            startColumn: 1,
            endLineNumber: i,
            endColumn: line.length - trimmed.length + 1,
          } as Monaco.IRange,
          text: "",
        });
      }
    }
    if (edits.length > 0) editor.executeEdits("trim-leading", edits);
  }

  static toUpperCase(editor: Editor): void {
    const selection = editor.getSelection();
    const model = editor.getModel();
    if (!selection || !model) return;
    if (selection.isEmpty()) { model.setValue(model.getValue().toUpperCase()); return; }
    const text = model.getValueInRange(selection);
    editor.executeEdits("upper", [{ range: selection as any, text: text.toUpperCase() }]);
  }

  static toLowerCase(editor: Editor): void {
    const selection = editor.getSelection();
    const model = editor.getModel();
    if (!selection || !model) return;
    if (selection.isEmpty()) { model.setValue(model.getValue().toLowerCase()); return; }
    const text = model.getValueInRange(selection);
    editor.executeEdits("lower", [{ range: selection as any, text: text.toLowerCase() }]);
  }

  static toTitleCase(editor: Editor): void {
    const selection = editor.getSelection();
    const model = editor.getModel();
    if (!selection || !model) return;
    const text = model.getValueInRange(selection);
    const converted = text.replace(/\w\S*/g, (w) => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase());
    editor.executeEdits("title", [{ range: selection as any, text: converted }]);
  }

  static invertCase(editor: Editor): void {
    const selection = editor.getSelection();
    const model = editor.getModel();
    if (!selection || !model) return;
    const text = model.getValueInRange(selection);
    const inverted = text.split("").map((c) =>
      c === c.toUpperCase() ? c.toLowerCase() : c.toUpperCase()
    ).join("");
    editor.executeEdits("invert", [{ range: selection as any, text: inverted }]);
  }

  static toSentenceCase(editor: Editor): void {
    const selection = editor.getSelection();
    const model = editor.getModel();
    if (!selection || !model) return;
    const text = model.getValueInRange(selection);
    let result = "";
    let capNext = true;
    for (const ch of text) {
      if (/[.!?。！？]/.test(ch)) { result += ch; capNext = true; }
      else if (capNext && /\w/.test(ch)) { result += ch.toUpperCase(); capNext = false; }
      else { result += ch.toLowerCase(); if (/\w/.test(ch)) capNext = false; }
    }
    editor.executeEdits("sentence", [{ range: selection as any, text: result }]);
  }

  static toRandomCase(editor: Editor): void {
    const selection = editor.getSelection();
    const model = editor.getModel();
    if (!selection || !model) return;
    const text = model.getValueInRange(selection);
    const result = text.split("").map((c) =>
      Math.random() > 0.5 ? c.toUpperCase() : c.toLowerCase()
    ).join("");
    editor.executeEdits("random-case", [{ range: selection as any, text: result }]);
  }

  static sortLinesAscending(editor: Editor): void {
    this.sortLines(editor, false);
  }

  static sortLinesDescending(editor: Editor): void {
    this.sortLines(editor, true);
  }

  private static sortLines(editor: Editor, descending: boolean): void {
    const selection = editor.getSelection();
    const model = editor.getModel();
    if (!selection || !model) return;
    const startLine = Math.min(selection.startLineNumber, selection.endLineNumber);
    const endLine = Math.max(selection.startLineNumber, selection.endLineNumber);
    if (startLine === endLine) return;

    const lines: string[] = [];
    for (let i = startLine; i <= endLine; i++) {
      lines.push(model.getLineContent(i));
    }
    lines.sort((a, b) => {
      const result = a.localeCompare(b, undefined, { numeric: true });
      return descending ? -result : result;
    });

    editor.executeEdits("sort", [{
      range: { startLineNumber: startLine, startColumn: 1, endLineNumber: endLine, endColumn: model.getLineContent(endLine).length + 1 } as any,
      text: lines.join("\n"),
    }]);
  }

  static toggleLineComment(editor: Editor, monaco: typeof Monaco): void {
    const selection = editor.getSelection();
    const model = editor.getModel();
    if (!selection || !model) return;
    const language = model.getLanguageId();
    const commentToken = getLineCommentToken(language);

    const startLine = Math.min(selection.startLineNumber, selection.endLineNumber);
    const endLine = Math.max(selection.startLineNumber, selection.endLineNumber);

    let allCommented = true;
    for (let i = startLine; i <= endLine; i++) {
      const line = model.getLineContent(i);
      if (!line.trimStart().startsWith(commentToken)) { allCommented = false; break; }
    }

    const edits: Monaco.editor.IIdentifiedSingleEditOperation[] = [];
    for (let i = startLine; i <= endLine; i++) {
      const line = model.getLineContent(i);
      if (allCommented) {
        const idx = line.indexOf(commentToken);
        const newText = line.slice(0, idx) + line.slice(idx + commentToken.length).replace(/^\s/, "");
        edits.push({ range: new monaco.Range(i, 1, i, line.length + 1), text: newText });
      } else {
        edits.push({ range: new monaco.Range(i, 1, i, 1), text: commentToken + " " });
      }
    }
    editor.executeEdits("comment", edits);
  }

  static indent(editor: Editor): void {
    editor.trigger("indent", "editor.action.indentLines", null);
  }

  static outdent(editor: Editor): void {
    editor.trigger("outdent", "editor.action.outdentLines", null);
  }

  static removeDuplicateLines(editor: Editor): void {
    const model = editor.getModel();
    if (!model) return;
    const lineCount = model.getLineCount();
    const seen = new Set<string>();
    const removeIdx = new Set<number>();
    for (let i = 0; i < lineCount; i++) {
      const line = model.getLineContent(i + 1);
      if (seen.has(line)) removeIdx.add(i);
      else seen.add(line);
    }
    if (removeIdx.size === 0) return;
    const edits: Monaco.editor.IIdentifiedSingleEditOperation[] = [];
    for (let i = lineCount - 1; i >= 0; i--) {
      if (removeIdx.has(i)) {
        edits.push({
          range: {
            startLineNumber: i + 1,
            startColumn: 1,
            endLineNumber: i + 1,
            endColumn: 1,
          } as Monaco.IRange,
          text: "",
        });
      }
    }
    editor.executeEdits("remove-duplicates", edits);
  }

  static sortLinesByLength(editor: Editor, descending: boolean = false): void {
    const selection = editor.getSelection();
    const model = editor.getModel();
    if (!selection || !model) return;
    const startLine = Math.min(selection.startLineNumber, selection.endLineNumber);
    const endLine = Math.max(selection.startLineNumber, selection.endLineNumber);
    if (startLine === endLine) return;

    const lines: string[] = [];
    for (let i = startLine; i <= endLine; i++) {
      lines.push(model.getLineContent(i));
    }
    lines.sort((a, b) => {
      const result = a.length - b.length;
      return descending ? -result : result;
    });

    editor.executeEdits("sort-length", [{
      range: { startLineNumber: startLine, startColumn: 1, endLineNumber: endLine, endColumn: model.getLineContent(endLine).length + 1 } as any,
      text: lines.join("\n"),
    }]);
  }

  static sortLinesRandom(editor: Editor): void {
    const selection = editor.getSelection();
    const model = editor.getModel();
    if (!selection || !model) return;
    const startLine = Math.min(selection.startLineNumber, selection.endLineNumber);
    const endLine = Math.max(selection.startLineNumber, selection.endLineNumber);
    if (startLine === endLine) return;

    const lines: string[] = [];
    for (let i = startLine; i <= endLine; i++) {
      lines.push(model.getLineContent(i));
    }
    for (let i = lines.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [lines[i], lines[j]] = [lines[j], lines[i]];
    }

    editor.executeEdits("sort-random", [{
      range: { startLineNumber: startLine, startColumn: 1, endLineNumber: endLine, endColumn: model.getLineContent(endLine).length + 1 } as any,
      text: lines.join("\n"),
    }]);
  }

  static filterLines(editor: Editor, pattern: string, keepMatching: boolean = true, useRegex: boolean = false): void {
    const model = editor.getModel();
    if (!model || !pattern) return;
    let regex: RegExp;
    try {
      regex = useRegex
        ? new RegExp(pattern, "i")
        : new RegExp(pattern.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"), "i");
    } catch { return; }

    const lineCount = model.getLineCount();
    const keepIdx = new Set<number>();
    for (let i = 0; i < lineCount; i++) {
      const line = model.getLineContent(i + 1);
      const matches = regex.test(line);
      if (keepMatching ? matches : !matches) keepIdx.add(i);
    }
    if (keepIdx.size === lineCount) return;
    const edits: Monaco.editor.IIdentifiedSingleEditOperation[] = [];
    for (let i = lineCount - 1; i >= 0; i--) {
      if (!keepIdx.has(i)) {
        edits.push({
          range: {
            startLineNumber: i + 1,
            startColumn: 1,
            endLineNumber: i + 1,
            endColumn: 1,
          } as Monaco.IRange,
          text: "",
        });
      }
    }
    if (edits.length > 0) editor.executeEdits("filter-lines", edits);
  }

  static mergeLines(editor: Editor, separator: string = " "): void {
    const selection = editor.getSelection();
    const model = editor.getModel();
    if (!selection || !model) return;
    const startLine = Math.min(selection.startLineNumber, selection.endLineNumber);
    const endLine = Math.max(selection.startLineNumber, selection.endLineNumber);
    if (startLine === endLine) return;

    const lines: string[] = [];
    for (let i = startLine; i <= endLine; i++) {
      lines.push(model.getLineContent(i));
    }
    const merged = lines.join(separator);

    editor.executeEdits("merge-lines", [{
      range: { startLineNumber: startLine, startColumn: 1, endLineNumber: endLine, endColumn: model.getLineContent(endLine).length + 1 } as any,
      text: merged,
    }]);
  }

  static splitLine(editor: Editor, separator: string = " "): void {
    const position = editor.getPosition();
    const model = editor.getModel();
    if (!position || !model) return;
    const lineContent = model.getLineContent(position.lineNumber);
    const parts = lineContent.split(separator);
    if (parts.length <= 1) return;

    editor.executeEdits("split-line", [{
      range: { startLineNumber: position.lineNumber, startColumn: 1, endLineNumber: position.lineNumber, endColumn: lineContent.length + 1 } as any,
      text: parts.join("\n"),
    }]);
  }

  static reverseLineOrder(editor: Editor): void {
    const selection = editor.getSelection();
    const model = editor.getModel();
    if (!selection || !model) return;
    const startLine = Math.min(selection.startLineNumber, selection.endLineNumber);
    const endLine = Math.max(selection.startLineNumber, selection.endLineNumber);
    if (startLine === endLine) return;

    const lines: string[] = [];
    for (let i = startLine; i <= endLine; i++) {
      lines.push(model.getLineContent(i));
    }
    lines.reverse();

    editor.executeEdits("reverse-lines", [{
      range: { startLineNumber: startLine, startColumn: 1, endLineNumber: endLine, endColumn: model.getLineContent(endLine).length + 1 } as any,
      text: lines.join("\n"),
    }]);
  }

  static markAllMatches(editor: Editor, monaco: typeof Monaco, pattern: string, useRegex: boolean = false, caseSensitive: boolean = false): void {
    const model = editor.getModel();
    if (!model || !pattern) return;
    let regex: RegExp;
    try {
      const flags = caseSensitive ? "g" : "gi";
      regex = useRegex
        ? new RegExp(pattern, flags)
        : new RegExp(pattern.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"), flags);
    } catch { return; }

    const decorations: { range: Monaco.IRange; options: Monaco.editor.IModelDecorationOptions }[] = [];
    const lineCount = model.getLineCount();
    for (let i = 1; i <= lineCount; i++) {
      const line = model.getLineContent(i);
      let match;
      while ((match = regex.exec(line)) !== null) {
        decorations.push({
          range: new monaco.Range(i, match.index + 1, i, match.index + match[0].length + 1),
          options: {
            inlineClassName: "markpt-match-highlight",
            stickiness: 1,
          },
        });
        if (match.index === regex.lastIndex) regex.lastIndex++;
      }
    }
    (editor as any).__markDecorations = editor.deltaDecorations((editor as any).__markDecorations || [], decorations);
  }

  static clearMarkDecorations(editor: Editor): void {
    (editor as any).__markDecorations = editor.deltaDecorations((editor as any).__markDecorations || [], []);
  }

  static getWordCount(editor: Editor): { chars: number; words: number; lines: number; selected: number } {
    const model = editor.getModel();
    if (!model) return { chars: 0, words: 0, lines: 0, selected: 0 };
    const text = model.getValue();
    const chars = text.length;
    const words = (text.match(/\S+/g) || []).length;
    const lines = model.getLineCount();
    const selection = editor.getSelection();
    const selected = selection && !selection.isEmpty() ? model.getValueInRange(selection).length : 0;
    return { chars, words, lines, selected };
  }
}

function getLineCommentToken(language: string): string {
  const tokens: Record<string, string> = {
    javascript: "//", typescript: "//", java: "//", c: "//", cpp: "//",
    csharp: "//", go: "//", rust: "//", swift: "//", kotlin: "//",
    scala: "//", dart: "//", php: "//", css: "/*", scss: "//",
    python: "#", ruby: "#", shell: "#", yaml: "#", dockerfile: "#",
    makefile: "#", perl: "#", r: "#", powershell: "#",
    html: "<!--", xml: "<!--", markdown: "<!--", sql: "--",
    lua: "--", vim: '"', plaintext: "#",
  };
  return tokens[language] || "//";
}
