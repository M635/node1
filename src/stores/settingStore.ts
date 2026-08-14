import { create } from "zustand";
import { defaultEditorConfig } from "../types/editor";
import type { ThemeMode } from "../types/theme";

interface SettingStore {
  fontSize: number;
  fontFamily: string;
  tabSize: number;
  insertSpaces: boolean;
  wordWrap: boolean;
  showLineNumbers: boolean;
  showWhitespace: boolean;
  showMinimap: boolean;
  themeMode: ThemeMode;
  autoIndent: boolean;
  bracketPairColorization: boolean;
  folding: boolean;
  recentFiles: string[];
  showStatusBar: boolean;
  trimTrailingWhitespaceOnSave: boolean;
  ensureFinalNewline: boolean;
  autoDetectIndent: boolean;
  showIndentGuides: boolean;
  autoSaveInterval: number;
  wrapLongLines: boolean;
  showPrintMargin: boolean;
  printMarginColumn: number;

  setFontSize: (size: number) => void;
  setFontFamily: (family: string) => void;
  setTabSize: (size: number) => void;
  setInsertSpaces: (insert: boolean) => void;
  setWordWrap: (wrap: boolean) => void;
  setShowLineNumbers: (show: boolean) => void;
  setShowWhitespace: (show: boolean) => void;
  setShowMinimap: (show: boolean) => void;
  setThemeMode: (mode: ThemeMode) => void;
  setAutoIndent: (auto: boolean) => void;
  setBracketPairColorization: (enable: boolean) => void;
  setFolding: (enable: boolean) => void;
  addRecentFile: (path: string) => void;
  setShowStatusBar: (show: boolean) => void;
  setTrimTrailingWhitespaceOnSave: (enable: boolean) => void;
  setEnsureFinalNewline: (enable: boolean) => void;
  setAutoDetectIndent: (enable: boolean) => void;
  setShowIndentGuides: (enable: boolean) => void;
  setAutoSaveInterval: (interval: number) => void;
  setWrapLongLines: (wrap: boolean) => void;
  setShowPrintMargin: (show: boolean) => void;
  setPrintMarginColumn: (col: number) => void;
  resetToDefaults: () => void;
}

export const useSettingStore = create<SettingStore>((set) => ({
  fontSize: defaultEditorConfig.fontSize,
  fontFamily: defaultEditorConfig.fontFamily,
  tabSize: defaultEditorConfig.tabSize,
  insertSpaces: defaultEditorConfig.insertSpaces,
  wordWrap: defaultEditorConfig.wordWrap,
  showLineNumbers: defaultEditorConfig.lineNumbers,
  showWhitespace: false,
  showMinimap: defaultEditorConfig.minimap,
  themeMode: "auto",
  autoIndent: defaultEditorConfig.autoIndent,
  bracketPairColorization: defaultEditorConfig.bracketPairColorization,
  folding: defaultEditorConfig.folding,
  recentFiles: [],
  showStatusBar: true,
  trimTrailingWhitespaceOnSave: false,
  ensureFinalNewline: true,
  autoDetectIndent: true,
  showIndentGuides: true,
  autoSaveInterval: 60,
  wrapLongLines: false,
  showPrintMargin: true,
  printMarginColumn: 80,

  setFontSize: (size) => set({ fontSize: size }),
  setFontFamily: (family) => set({ fontFamily: family }),
  setTabSize: (size) => set({ tabSize: size }),
  setInsertSpaces: (insert) => set({ insertSpaces: insert }),
  setWordWrap: (wrap) => set({ wordWrap: wrap }),
  setShowLineNumbers: (show) => set({ showLineNumbers: show }),
  setShowWhitespace: (show) => set({ showWhitespace: show }),
  setShowMinimap: (show) => set({ showMinimap: show }),
  setThemeMode: (mode) => set({ themeMode: mode }),
  setAutoIndent: (auto) => set({ autoIndent: auto }),
  setBracketPairColorization: (enable) =>
    set({ bracketPairColorization: enable }),
  setFolding: (enable) => set({ folding: enable }),
  addRecentFile: (path) =>
    set((state) => ({
      recentFiles: [
        path,
        ...state.recentFiles.filter((p) => p !== path),
      ].slice(0, 20),
    })),
  setShowStatusBar: (show) => set({ showStatusBar: show }),
  setTrimTrailingWhitespaceOnSave: (enable) => set({ trimTrailingWhitespaceOnSave: enable }),
  setEnsureFinalNewline: (enable) => set({ ensureFinalNewline: enable }),
  setAutoDetectIndent: (enable) => set({ autoDetectIndent: enable }),
  setShowIndentGuides: (enable) => set({ showIndentGuides: enable }),
  setAutoSaveInterval: (interval) => set({ autoSaveInterval: interval }),
  setWrapLongLines: (wrap) => set({ wrapLongLines: wrap }),
  setShowPrintMargin: (show) => set({ showPrintMargin: show }),
  setPrintMarginColumn: (col) => set({ printMarginColumn: col }),
  resetToDefaults: () =>
    set({
      fontSize: defaultEditorConfig.fontSize,
      fontFamily: defaultEditorConfig.fontFamily,
      tabSize: defaultEditorConfig.tabSize,
      insertSpaces: defaultEditorConfig.insertSpaces,
      wordWrap: defaultEditorConfig.wordWrap,
      showLineNumbers: defaultEditorConfig.lineNumbers,
      showMinimap: defaultEditorConfig.minimap,
      autoIndent: defaultEditorConfig.autoIndent,
      bracketPairColorization: defaultEditorConfig.bracketPairColorization,
      folding: defaultEditorConfig.folding,
    }),
}));
