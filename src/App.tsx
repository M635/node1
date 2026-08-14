import { useState, useCallback, useEffect, type DragEvent } from "react";
import { open, save } from "@tauri-apps/plugin-dialog";
import { getCurrentWindow } from "@tauri-apps/api/window";
import { MainLayout } from "./components/layout/MainLayout";
import { SideBar } from "./components/layout/SideBar";
import { MonacoEditor } from "./components/editor/MonacoEditor";
import { DiffEditorView } from "./components/editor/DiffEditor";
import { SplitEditor } from "./components/editor/SplitEditor";
import { HexViewer } from "./components/editor/HexViewer";
import { EncodingDialog } from "./components/dialog/EncodingDialog";
import { SettingsDialog } from "./components/dialog/SettingsDialog";
import { GoToLineDialog } from "./components/dialog/GoToLineDialog";
import { ReloadConfirmDialog } from "./components/dialog/ReloadConfirmDialog";
import { MacroPanel } from "./components/macro/MacroPanel";
import { CommandPalette } from "./components/dialog/CommandPalette";
import { ShortcutsHelp } from "./components/dialog/ShortcutsHelp";
import { CharacterStatsDialog } from "./components/dialog/CharacterStatsDialog";
import { FunctionListPanel } from "./components/dialog/FunctionListPanel";
import { MultiDocSearch } from "./components/search/MultiDocSearch";
import { TextTransformDialog } from "./components/dialog/TextTransformDialog";
import { InsertDateTimeDialog } from "./components/dialog/InsertDateTimeDialog";
import { SpecialCharPanel } from "./components/dialog/SpecialCharPanel";
import { ColorPickerDialog } from "./components/dialog/ColorPickerDialog";
import { DocumentSwitcher } from "./components/dialog/DocumentSwitcher";
import { BatchFindReplace } from "./components/dialog/BatchFindReplaceDialog";
import { FilePropertiesDialog } from "./components/dialog/FilePropertiesDialog";
import { ShortcutMapper } from "./components/dialog/ShortcutMapper";
import { MarkdownPreview } from "./components/editor/MarkdownPreview";
import { RegexTester } from "./components/dialog/RegexTester";
import { CsvViewer } from "./components/dialog/CsvViewer";
import { LanguageSelector } from "./components/dialog/LanguageSelector";
import { ClipboardHistoryPanel } from "./components/dialog/ClipboardHistoryPanel";
import { SnippetsPanel } from "./components/dialog/SnippetsPanel";
import { PluginManager } from "./components/dialog/PluginManager";
import { RunCommandDialog } from "./components/dialog/RunCommandDialog";
import { RunMacroDialog } from "./components/dialog/RunMacroDialog";
import { TextTransform } from "./services/text/textTransform";
import { FormatService } from "./services/text/formatService";
import { CharConvert } from "./services/text/charConvert";
import { useFileStore, generateId } from "./stores/fileStore";
import { useEditorStore } from "./stores/editorStore";
import { useSearchStore } from "./stores/searchStore";
import { useSettingStore } from "./stores/settingStore";
import { useI18n } from "./stores/i18nStore";
import { useTheme } from "./hooks/useTheme";
import { useKeyboardShortcuts } from "./hooks/useKeyboardShortcuts";
import { useFileWatcher } from "./hooks/useFileWatcher";
import {
  openFile as openFileService,
  saveFile as saveFileService,
  reloadWithEncoding,
} from "./services/tauri/fileService";
import { exportAsTxt, exportAsHtml, exportAsRtf } from "./services/tauri/exportService";
import { getLanguageFromPath } from "./services/monaco/languages";
import { getFileName } from "./utils/fileUtils";
import { detectIndent } from "./utils/indentDetect";
import { saveSession, loadSession, type SessionData } from "./services/session/sessionService";
import type { EncodingType } from "./types/file";

export default function App() {
  const {
    tabs, activeTabId, openTab, closeTab, updateTab, updateContent, markClean, getActiveTab, addRecentFile,
  } = useFileStore();
  const { recentFiles } = useSettingStore();
  const { isDark, setIsDark, toggleBookmark } = useEditorStore();
  const { toggleSearchPanel, toggleReplacePanel, toggleFindInFiles } = useSearchStore();
  const { themeMode } = useSettingStore();
  const { t } = useI18n();

  const [showEncodingDialog, setShowEncodingDialog] = useState(false);
  const [showSettingsDialog, setShowSettingsDialog] = useState(false);
  const [showGoToLineDialog, setShowGoToLineDialog] = useState(false);
  const [showMacroPanel, setShowMacroPanel] = useState(false);
  const [showCommandPalette, setShowCommandPalette] = useState(false);
  const [showShortcutsHelp, setShowShortcutsHelp] = useState(false);
  const [showDiffView, setShowDiffView] = useState(false);
  const [showSidebar, setShowSidebar] = useState(true);
  const [sessionRestored, setSessionRestored] = useState(false);
  const [diffContent, setDiffContent] = useState({ original: "", modified: "" });
  const [reloadDialog, setReloadDialog] = useState<string | null>(null);
  const [selectionInfo, setSelectionInfo] = useState<{ chars: number; lines: number } | null>(null);
  const [showCharStats, setShowCharStats] = useState(false);
  const [showFunctionList, setShowFunctionList] = useState(false);
  const [showHexViewer, setShowHexViewer] = useState(false);
  const [showMultiDocSearch, setShowMultiDocSearch] = useState(false);
  const [splitMode, setSplitMode] = useState<"horizontal" | "vertical" | null>(null);
  const [showTextTransform, setShowTextTransform] = useState(false);
  const [showInsertDateTime, setShowInsertDateTime] = useState(false);
  const [showSpecialChar, setShowSpecialChar] = useState(false);
  const [showColorPicker, setShowColorPicker] = useState(false);
  const [showDocSwitcher, setShowDocSwitcher] = useState(false);
  const [showBatchFindReplace, setShowBatchFindReplace] = useState(false);
  const [showFileProps, setShowFileProps] = useState(false);
  const [showShortcutMapper, setShowShortcutMapper] = useState(false);
  const [showMarkdownPreview, setShowMarkdownPreview] = useState(false);
  const [showRegexTester, setShowRegexTester] = useState(false);
  const [showCsvViewer, setShowCsvViewer] = useState(false);
  const [showLanguageSelector, setShowLanguageSelector] = useState(false);
  const [showClipboardHistory, setShowClipboardHistory] = useState(false);
  const [showSnippets, setShowSnippets] = useState(false);
  const [showPluginManager, setShowPluginManager] = useState(false);
  const [showRunCommand, setShowRunCommand] = useState(false);
  const [showRunMacro, setShowRunMacro] = useState(false);
  const [postItMode, setPostItMode] = useState(false);
  const [showAbout, setShowAbout] = useState(false);

  const themeResult = useTheme(themeMode);
  useEffect(() => { setIsDark(themeResult.isDark); }, [themeResult.isDark, setIsDark]);

  const activeTab = getActiveTab();

  const openFileByPath = useCallback(async (path: string) => {
    try {
      const result = await openFileService(path);
      openTab({
        id: generateId(), path, name: getFileName(path), content: result.content,
        meta: result.meta, is_dirty: false, is_large_file: result.is_large_file,
        readonly: result.meta.readonly, encoding: result.meta.encoding,
        language: getLanguageFromPath(path),
        cursor_position: { line: 1, column: 1 }, scroll_position: 0, is_new: false,
      });
      addRecentFile(path);
      if (useSettingStore.getState().autoDetectIndent) {
        const indent = detectIndent(result.content);
        useSettingStore.getState().setTabSize(indent.tabSize);
        useSettingStore.getState().setInsertSpaces(indent.insertSpaces);
      }
    } catch (err) {
      alert(`打开文件失败: ${err}`);
    }
  }, [openTab, addRecentFile]);

  const handleNewFile = useCallback(() => {
    openTab({
      id: generateId(), path: "", name: t("common.unnamed"), content: "", meta: null,
      is_dirty: false, is_large_file: false, readonly: false,
      encoding: "UTF-8", language: "plaintext",
      cursor_position: { line: 1, column: 1 }, scroll_position: 0, is_new: true,
    });
  }, [openTab, t]);

  const handleOpenFile = useCallback(async () => {
    const selected = await open({ multiple: true, filters: [{ name: "所有文件", extensions: ["*"] }] });
    if (!selected) return;
    const paths = Array.isArray(selected) ? selected : [selected];
    for (const p of paths) {
      await openFileByPath(p as string);
    }
  }, [openFileByPath]);

  const handleSave = useCallback(async () => {
    const tab = getActiveTab();
    if (!tab) return;
    let savePath = tab.path;
    if (!savePath || tab.is_new) {
      const selected = await save({ filters: [{ name: "所有文件", extensions: ["*"] }] });
      if (!selected) return;
      savePath = selected as string;
    }
    try {
      let content = tab.content;
      const settings = useSettingStore.getState();
      if (settings.trimTrailingWhitespaceOnSave) {
        content = content.replace(/\s+\n/g, "\n");
      }
      if (settings.ensureFinalNewline && !content.endsWith("\n")) {
        content += "\n";
      }
      await saveFileService(savePath, content, tab.encoding);
      if (content !== tab.content) updateContent(tab.id, content);
      updateTab(tab.id, { path: savePath, name: getFileName(savePath), is_new: false, is_dirty: false });
      markClean(tab.id);
    } catch (err) {
      alert(`保存失败: ${err}`);
    }
  }, [getActiveTab, updateTab, markClean, updateContent]);

  const handleSaveCopy = useCallback(async () => {
    const tab = getActiveTab();
    if (!tab) return;
    const selected = await save({ filters: [{ name: "所有文件", extensions: ["*"] }] });
    if (!selected) return;
    try {
      await saveFileService(selected as string, tab.content, tab.encoding);
    } catch (err) {
      alert(`保存副本失败: ${err}`);
    }
  }, [getActiveTab]);

  const handleOpenWithEncoding = useCallback(async () => {
    const selected = await open({ multiple: false, filters: [{ name: "所有文件", extensions: ["*"] }] });
    if (!selected) return;
    const path = selected as string;
    const encodings = ["UTF-8", "UTF-8-BOM", "GBK", "GB2312", "UTF-16LE", "UTF-16BE", "ASCII"];
    const encoding = window.prompt(`选择编码:\n${encodings.map((e, i) => `${i + 1}. ${e}`).join("\n")}`, "1");
    if (!encoding) return;
    const encIdx = parseInt(encoding) - 1;
    if (encIdx < 0 || encIdx >= encodings.length) return;
    try {
      const newContent = await reloadWithEncoding(path, encodings[encIdx]);
      openTab({
        id: generateId(), path, name: getFileName(path), content: newContent,
        meta: null, is_dirty: false, is_large_file: false, readonly: false,
        encoding: encodings[encIdx] as EncodingType,
        language: getLanguageFromPath(path),
        cursor_position: { line: 1, column: 1 }, scroll_position: 0, is_new: false,
      });
      addRecentFile(path);
    } catch (err) {
      alert(`按编码打开失败: ${err}`);
    }
  }, [openTab, addRecentFile]);

  const handleToggleBom = useCallback(() => {
    const tab = getActiveTab();
    if (!tab) return;
    const newEncoding = tab.encoding === "UTF-8" ? "UTF-8-BOM" : tab.encoding === "UTF-8-BOM" ? "UTF-8" : tab.encoding;
    if (newEncoding !== tab.encoding) {
      updateTab(tab.id, { encoding: newEncoding as EncodingType, is_dirty: true });
    }
  }, [getActiveTab, updateTab]);

  const handleSaveAll = useCallback(async () => {
    for (const tab of tabs) {
      if (!tab.is_dirty) continue;
      let savePath = tab.path;
      if (!savePath || tab.is_new) continue;
      try {
        let content = tab.content;
        const settings = useSettingStore.getState();
        if (settings.trimTrailingWhitespaceOnSave) {
          content = content.replace(/\s+\n/g, "\n");
        }
        if (settings.ensureFinalNewline && !content.endsWith("\n")) {
          content += "\n";
        }
        await saveFileService(savePath, content, tab.encoding);
        if (content !== tab.content) updateContent(tab.id, content);
        markClean(tab.id);
      } catch { /* ignore */ }
    }
  }, [tabs, markClean, updateContent]);

  const handleCopyDirectory = useCallback(() => {
    const tab = getActiveTab();
    if (!tab?.path) return;
    const parts = tab.path.split(/[/\\]/);
    parts.pop();
    navigator.clipboard.writeText(parts.join("/")).catch(() => {});
  }, [getActiveTab]);

  const handleCopyFileName = useCallback(() => {
    const tab = getActiveTab();
    if (!tab?.path) return;
    navigator.clipboard.writeText(tab.name).catch(() => {});
  }, [getActiveTab]);

  const handleRunCommand = useCallback((command: string) => {
    window.dispatchEvent(new CustomEvent("markpt:run-command", { detail: { command } }));
  }, []);

  const handleOpenInDefault = useCallback(async () => {
    const tab = getActiveTab();
    if (!tab?.path) return;
    window.dispatchEvent(new CustomEvent("markpt:open-in-default", { detail: { path: tab.path } }));
  }, [getActiveTab]);

  const handleRunMacro = useCallback((times: number) => {
    window.dispatchEvent(new CustomEvent("markpt:run-macro-multiple", { detail: { times } }));
  }, []);

  const handlePasteFromHistory = useCallback((text: string) => {
    window.dispatchEvent(new CustomEvent("markpt:insert-text", { detail: { text } }));
  }, []);

  const handleSaveAs = useCallback(async () => {
    const tab = getActiveTab();
    if (!tab) return;
    const selected = await save({ filters: [{ name: "所有文件", extensions: ["*"] }] });
    if (!selected) return;
    try {
      let content = tab.content;
      const settings = useSettingStore.getState();
      if (settings.trimTrailingWhitespaceOnSave) {
        content = content.replace(/\s+\n/g, "\n");
      }
      if (settings.ensureFinalNewline && !content.endsWith("\n")) {
        content += "\n";
      }
      await saveFileService(selected as string, content, tab.encoding);
      updateTab(tab.id, { path: selected as string, name: getFileName(selected as string), is_new: false, is_dirty: false });
      markClean(tab.id);
    } catch (err) {
      alert(`另存为失败: ${err}`);
    }
  }, [getActiveTab, updateTab, markClean]);

  const saveSessionNow = useCallback(async () => {
    const sessionData: SessionData = {
      tabs: tabs.map((t) => ({
        path: t.path,
        name: t.name,
        content: t.content,
        is_new: t.is_new,
        is_dirty: t.is_dirty,
        cursor_line: t.cursor_position.line,
        cursor_column: t.cursor_position.column,
        scroll_position: t.scroll_position,
        encoding: t.encoding,
        language: t.language || "plaintext",
      })),
      active_tab_path: activeTab?.path || null,
      active_tab_id: activeTabId,
      sidebar_visible: showSidebar,
      window_width: window.innerWidth,
      window_height: window.innerHeight,
      saved_at: Date.now(),
    };
    await saveSession(sessionData);
  }, [tabs, activeTab, activeTabId, showSidebar]);

  const handleQuit = useCallback(() => {
    saveSessionNow().catch(() => {});
    getCurrentWindow().close();
  }, [saveSessionNow]);

  const handleMarkAll = useCallback(() => {
    window.dispatchEvent(new CustomEvent("markpt:mark-all-matches"));
  }, []);

  const handleUnmarkAll = useCallback(() => {
    window.dispatchEvent(new CustomEvent("markpt:unmark-all"));
  }, []);

  const handleEncodeWith = useCallback(async (encoding: string) => {
    const tab = getActiveTab();
    if (!tab?.path) return;
    try {
      const newContent = await reloadWithEncoding(tab.path, encoding);
      updateTab(tab.id, { encoding: encoding as EncodingType, content: newContent, is_dirty: false });
    } catch (err) {
      alert(`用 ${encoding} 编码打开失败: ${err}`);
    }
  }, [getActiveTab, updateTab]);

  const handleConvertEncoding = useCallback(async (encoding: string) => {
    const tab = getActiveTab();
    if (!tab) return;
    updateTab(tab.id, { encoding: encoding as EncodingType, is_dirty: true });
  }, [getActiveTab, updateTab]);

  const handleMacroStartStop = useCallback(() => {
    window.dispatchEvent(new CustomEvent("markpt:toggle-macro"));
  }, []);

  const handleMacroPlayback = useCallback(() => {
    window.dispatchEvent(new CustomEvent("markpt:play-macro"));
  }, []);

  const handleMacroSave = useCallback(() => {
    window.dispatchEvent(new CustomEvent("markpt:save-macro"));
  }, []);

  const handleAbout = useCallback(() => {
    setShowAbout(true);
  }, []);

  useEffect(() => {
    const settings = useSettingStore.getState();
    const intervalMs = Math.max(10000, (settings.autoSaveInterval || 60) * 1000);
    const interval = setInterval(() => {
      const state = useFileStore.getState();
      let savedAny = false;
      for (const tab of state.tabs) {
        if (!tab.is_dirty || !tab.path || tab.is_new || tab.readonly) continue;
        saveFileService(tab.path, tab.content, tab.encoding).then(() => {
          useFileStore.getState().markClean(tab.id);
        }).catch(() => {});
        savedAny = true;
      }
      // Also save session if any tab was dirty
      if (savedAny) {
        saveSessionNow().catch(() => {});
      }
    }, intervalMs);
    return () => clearInterval(interval);
  }, [saveSessionNow]);

  const handleCloseTab = useCallback(async (id: string) => {
    const tab = tabs.find((t) => t.id === id);
    if (tab?.is_dirty) {
      const shouldSave = window.confirm(`"${tab.name}" 已修改，是否保存？`);
      if (shouldSave) {
        let savePath = tab.path;
        if (!savePath || tab.is_new) {
          const selected = await save({ filters: [{ name: "所有文件", extensions: ["*"] }] });
          if (!selected) { closeTab(id); return; }
          savePath = selected as string;
        }
        try { await saveFileService(savePath, tab.content, tab.encoding); } catch { /* ignore */ }
      }
    }
    closeTab(id);
  }, [tabs, closeTab]);

  const handleCloseAll = useCallback(async () => {
    const allTabs = [...useFileStore.getState().tabs];
    for (const tab of allTabs) {
      await handleCloseTab(tab.id);
    }
  }, [handleCloseTab]);

  const handleCloseAllButCurrent = useCallback(async () => {
    const allTabs = [...useFileStore.getState().tabs];
    for (const tab of allTabs) {
      if (tab.id === activeTabId) continue;
      await handleCloseTab(tab.id);
    }
  }, [activeTabId, handleCloseTab]);

  const handleGotoLine = useCallback(() => setShowGoToLineDialog(true), []);

  const handleInsertText = useCallback((text: string) => {
    window.dispatchEvent(new CustomEvent("markpt:insert-text", { detail: { text } }));
  }, []);

  const handleApplyTransform = useCallback((result: string) => {
    if (activeTabId) updateContent(activeTabId, result);
    setShowTextTransform(false);
  }, [activeTabId, updateContent]);

  const handleEolConvert = useCallback((target: "lf" | "crlf" | "cr") => {
    if (!activeTab) return;
    const converted = TextTransform.eolConvert(activeTab.content, target);
    updateContent(activeTab.id, converted);
  }, [activeTab, updateContent]);

  const handleTabSpaceConvert = useCallback((direction: "tab-to-space" | "space-to-tab") => {
    if (!activeTab) return;
    const tabSize = useSettingStore.getState().tabSize;
    const converted = direction === "tab-to-space"
      ? TextTransform.tabsToSpaces(activeTab.content, tabSize)
      : TextTransform.spacesToTabs(activeTab.content, tabSize);
    updateContent(activeTab.id, converted);
  }, [activeTab, updateContent]);

  const applyFormat = useCallback((lang: string) => {
    if (!activeTab) return;
    const { result, error } = FormatService.formatByLanguage(lang, activeTab.content);
    if (error) { alert(error); return; }
    updateContent(activeTab.id, result);
  }, [activeTab, updateContent]);

  const applyCharConvert = useCallback((action: string) => {
    if (!activeTab) return;
    let result = activeTab.content;
    switch (action) {
      case "to-full-width": result = CharConvert.toFullWidth(result); break;
      case "to-half-width": result = CharConvert.toHalfWidth(result); break;
      case "remove-non-printable": result = CharConvert.removeNonPrintable(result); break;
      case "normalize-nfc": result = CharConvert.normalizeNFC(result); break;
      case "normalize-nfd": result = CharConvert.normalizeNFD(result); break;
      case "normalize-nfkc": result = CharConvert.normalizeNFKC(result); break;
      case "normalize-nfkd": result = CharConvert.normalizeNFKD(result); break;
      case "to-snake": result = CharConvert.toSnakeCase(result); break;
      case "to-camel": result = CharConvert.toCamelCase(result); break;
      case "to-pascal": result = CharConvert.toPascalCase(result); break;
      case "to-kebab": result = CharConvert.toKebabCase(result); break;
      case "to-constant": result = CharConvert.toConstantCase(result); break;
    }
    updateContent(activeTab.id, result);
  }, [activeTab, updateContent]);

  const handleSetLanguage = useCallback((language: string) => {
    if (activeTabId) updateTab(activeTabId, { language });
    window.dispatchEvent(new CustomEvent("markpt:set-language", { detail: { language } }));
  }, [activeTabId, updateTab]);

  const handleContentChange = useCallback((content: string) => {
    if (activeTabId) updateContent(activeTabId, content);
  }, [activeTabId, updateContent]);

  const handleCursorChange = useCallback((line: number, column: number) => {
    if (activeTabId) updateTab(activeTabId, { cursor_position: { line, column } });
  }, [activeTabId, updateTab]);

  const handleSelectionChange = useCallback((chars: number, lines: number) => {
    setSelectionInfo(chars > 0 ? { chars, lines } : null);
  }, []);

  const handleEncodingChange = useCallback(async (encoding: EncodingType) => {
    const tab = getActiveTab();
    if (!tab || !tab.path) { setShowEncodingDialog(false); return; }
    try {
      const newContent = await reloadWithEncoding(tab.path, encoding);
      updateTab(tab.id, { encoding, content: newContent, is_dirty: false });
    } catch (err) {
      alert(`编码转换失败: ${err}`);
    }
    setShowEncodingDialog(false);
  }, [getActiveTab, updateTab]);

  const handleGotoLineConfirm = useCallback((line: number) => {
    window.dispatchEvent(new CustomEvent("markpt:goto-line-confirm", { detail: { line } }));
    setShowGoToLineDialog(false);
  }, []);

  const handleExport = useCallback(async (format: "txt" | "html" | "rtf") => {
    const tab = getActiveTab();
    if (!tab) return;
    const ext = format === "txt" ? "txt" : format === "html" ? "html" : "rtf";
    const selected = await save({ defaultPath: `${tab.name}.${ext}`, filters: [{ name: format.toUpperCase(), extensions: [ext] }] });
    if (!selected) return;
    try {
      if (format === "txt") await exportAsTxt(selected as string, tab.content);
      else if (format === "html") await exportAsHtml(selected as string, tab.content, tab.name);
      else await exportAsRtf(selected as string, tab.content);
    } catch (err) {
      alert(`导出失败: ${err}`);
    }
  }, [getActiveTab]);

  const handleToggleDiff = useCallback(async () => {
    if (showDiffView) { setShowDiffView(false); return; }
    const selected = await open({ multiple: false, filters: [{ name: "所有文件", extensions: ["*"] }] });
    if (!selected) return;
    try {
      const result = await openFileService(selected as string);
      setDiffContent({ original: getActiveTab()?.content || "", modified: result.content });
      setShowDiffView(true);
    } catch (err) {
      alert(`打开对比文件失败: ${err}`);
    }
  }, [showDiffView, getActiveTab]);

  const handleFileChanged = useCallback((path: string) => {
    const tab = useFileStore.getState().getTabByPath(path);
    if (tab && !tab.is_dirty) setReloadDialog(path);
  }, []);

  useFileWatcher(activeTab?.path || null, handleFileChanged);

  const handleReload = useCallback(async () => {
    if (!reloadDialog) return;
    const tab = useFileStore.getState().getTabByPath(reloadDialog);
    if (tab) {
      try {
        const result = await openFileService(reloadDialog);
        updateTab(tab.id, { content: result.content, meta: result.meta, is_dirty: false });
      } catch { /* ignore */ }
    }
    setReloadDialog(null);
  }, [reloadDialog, updateTab]);

  const handleDrop = useCallback((e: DragEvent) => {
    e.preventDefault();
    const files = e.dataTransfer?.files;
    if (files) {
      for (let i = 0; i < files.length; i++) {
        const file = files[i] as File & { path?: string };
        if (file.path) {
          openFileByPath(file.path);
        }
      }
    }
  }, [openFileByPath]);

  const handleDragOver = useCallback((e: DragEvent) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = "copy";
  }, []);

  useEffect(() => {
    const handler = (e: Event) => {
      const detail = (e as CustomEvent).detail;
      if (detail?.path && detail?.line) {
        const tab = useFileStore.getState().getTabByPath(detail.path);
        if (tab) {
          useFileStore.getState().setActiveTab(tab.id);
          setTimeout(() => {
            window.dispatchEvent(new CustomEvent("markpt:goto-line-confirm", { detail: { line: detail.line } }));
          }, 100);
        } else {
          openFileByPath(detail.path).then(() => {
            setTimeout(() => {
              window.dispatchEvent(new CustomEvent("markpt:goto-line-confirm", { detail: { line: detail.line } }));
            }, 200);
          });
        }
      }
    };
    window.addEventListener("markpt:open-search-result", handler);
    return () => window.removeEventListener("markpt:open-search-result", handler);
  }, [openFileByPath]);

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === "p") {
        e.preventDefault();
        setShowCommandPalette((v) => !v);
      }
      if ((e.metaKey || e.ctrlKey) && e.key === "\\") {
        e.preventDefault();
        setShowSidebar((v) => !v);
      }
      if ((e.metaKey || e.ctrlKey) && e.key === "/") {
        e.preventDefault();
        setShowShortcutsHelp(true);
      }
      if ((e.metaKey || e.ctrlKey) && e.shiftKey && e.key === "F") {
        e.preventDefault();
        setShowMultiDocSearch(true);
      }
      if ((e.metaKey || e.ctrlKey) && e.shiftKey && e.key === "H") {
        e.preventDefault();
        setShowHexViewer(true);
      }
      if ((e.metaKey || e.ctrlKey) && e.shiftKey && e.key === "C") {
        e.preventDefault();
        setShowCharStats(true);
      }
      if ((e.metaKey || e.ctrlKey) && e.shiftKey && e.key === "O") {
        e.preventDefault();
        setShowFunctionList(true);
      }
      if ((e.metaKey || e.ctrlKey) && e.key === "Tab") {
        e.preventDefault();
        setShowDocSwitcher(true);
      }
      if ((e.metaKey || e.ctrlKey) && e.shiftKey && e.key === "R") {
        e.preventDefault();
        setShowTextTransform(true);
      }
      if ((e.metaKey || e.ctrlKey) && (e.key === "=" || e.key === "+")) {
        e.preventDefault();
        window.dispatchEvent(new CustomEvent("markpt:zoom-in"));
      }
      if ((e.metaKey || e.ctrlKey) && e.key === "-") {
        e.preventDefault();
        window.dispatchEvent(new CustomEvent("markpt:zoom-out"));
      }
      if ((e.metaKey || e.ctrlKey) && e.key === "0") {
        e.preventDefault();
        window.dispatchEvent(new CustomEvent("markpt:zoom-reset"));
      }
      if (e.key === "F3" && !e.shiftKey) {
        e.preventDefault();
        window.dispatchEvent(new CustomEvent("markpt:find-next"));
      }
      if (e.key === "F3" && e.shiftKey) {
        e.preventDefault();
        window.dispatchEvent(new CustomEvent("markpt:find-prev"));
      }
      if (e.key === "F2" && !e.shiftKey) {
        e.preventDefault();
        window.dispatchEvent(new CustomEvent("markpt:next-bookmark"));
      }
      if (e.key === "F2" && e.shiftKey) {
        e.preventDefault();
        window.dispatchEvent(new CustomEvent("markpt:prev-bookmark"));
      }
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, []);

  useKeyboardShortcuts({
    onSave: handleSave,
    onFind: toggleSearchPanel,
    onReplace: toggleReplacePanel,
    onGotoLine: handleGotoLine,
    onNewFile: handleNewFile,
    onOpenFile: handleOpenFile,
    onCloseTab: () => activeTabId && handleCloseTab(activeTabId),
    onFindInFiles: toggleFindInFiles,
    onToggleBookmark: () => {
      if (activeTabId && activeTab) toggleBookmark(activeTabId, activeTab.cursor_position.line);
    },
    onToggleMacro: () => setShowMacroPanel((v) => !v),
    onToggleDiff: handleToggleDiff,
    onEncoding: () => setShowEncodingDialog(true),
    onSettings: () => setShowSettingsDialog(true),
    onCopy: () => window.dispatchEvent(new CustomEvent("markpt:editor-copy")),
    onPaste: () => window.dispatchEvent(new CustomEvent("markpt:editor-paste")),
    onCut: () => window.dispatchEvent(new CustomEvent("markpt:editor-cut")),
    onToggleSidebar: () => setShowSidebar((v) => !v),
    onCommandPalette: () => setShowCommandPalette(true),
    onShortcutsHelp: () => setShowShortcutsHelp(true),
    onEditAction: (action: string) => {
      if (action === "undo") { window.dispatchEvent(new CustomEvent("markpt:edit-undo")); return; }
      if (action === "redo") { window.dispatchEvent(new CustomEvent("markpt:edit-redo")); return; }
      window.dispatchEvent(new CustomEvent("markpt:edit-action", { detail: { action } }));
    },
    onSplitHorizontal: () => setSplitMode(splitMode === "horizontal" ? null : "horizontal"),
    onSplitVertical: () => setSplitMode(splitMode === "vertical" ? null : "vertical"),
    onSplitClose: () => setSplitMode(null),
    onFunctionList: () => setShowFunctionList((v) => !v),
    onToggleWordWrap: () => useSettingStore.getState().setWordWrap(!useSettingStore.getState().wordWrap),
    onCharStats: () => setShowCharStats(true),
    onHexViewer: () => setShowHexViewer(true),
    onMultiDocSearch: () => setShowMultiDocSearch(true),
    onTextTransform: () => setShowTextTransform(true),
    onInsertDateTime: () => setShowInsertDateTime(true),
    onSpecialChar: () => setShowSpecialChar(true),
    onColorPicker: () => setShowColorPicker(true),
    onDocSwitcher: () => setShowDocSwitcher(true),
    onBatchFindReplace: () => setShowBatchFindReplace(true),
    onFileProps: () => setShowFileProps(true),
    onShortcutMapper: () => setShowShortcutMapper(true),
    onEolConvert: (target) => handleEolConvert(target),
    onTabSpaceConvert: (direction) => handleTabSpaceConvert(direction),
    onFormatCode: () => window.dispatchEvent(new CustomEvent("markpt:format-code")),
    onMarkdownPreview: () => setShowMarkdownPreview(true),
    onRegexTester: () => setShowRegexTester(true),
    onCsvViewer: () => setShowCsvViewer(true),
    onLanguageSelector: () => setShowLanguageSelector(true),
    onZoomIn: () => window.dispatchEvent(new CustomEvent("markpt:zoom-in")),
    onZoomOut: () => window.dispatchEvent(new CustomEvent("markpt:zoom-out")),
    onZoomReset: () => window.dispatchEvent(new CustomEvent("markpt:zoom-reset")),
    onFindNext: () => window.dispatchEvent(new CustomEvent("markpt:find-next")),
    onFindPrev: () => window.dispatchEvent(new CustomEvent("markpt:find-prev")),
    onNextBookmark: () => window.dispatchEvent(new CustomEvent("markpt:next-bookmark")),
    onPrevBookmark: () => window.dispatchEvent(new CustomEvent("markpt:prev-bookmark")),
    onClearBookmarks: () => window.dispatchEvent(new CustomEvent("markpt:clear-bookmarks")),
    onJumpToBracket: () => window.dispatchEvent(new CustomEvent("markpt:jump-to-bracket")),
    onSelectToBracket: () => window.dispatchEvent(new CustomEvent("markpt:select-to-bracket")),
    onCopyPath: () => { if (activeTab?.path) navigator.clipboard.writeText(activeTab.path).catch(() => {}); },
    onReloadFromDisk: async () => {
      if (!activeTab?.path) return;
      try {
        const result = await openFileService(activeTab.path);
        updateTab(activeTab.id, { content: result.content, meta: result.meta, is_dirty: false });
      } catch { /* ignore */ }
    },
    onInsertFile: async () => {
      const selected = await open({ multiple: false, filters: [{ name: "所有文件", extensions: ["*"] }] });
      if (!selected) return;
      try {
        const result = await openFileService(selected as string);
        handleInsertText(result.content);
      } catch { /* ignore */ }
    },
    onFullScreen: () => {
      if (!document.fullscreenElement) document.documentElement.requestFullscreen();
      else document.exitFullscreen();
    },
    onAlwaysOnTop: () => { /* Tauri window always on top - requires @tauri-apps/api/window */ },
    onFormatJson: () => applyFormat("json"),
    onFormatXml: () => applyFormat("xml"),
    onFormatHtml: () => applyFormat("html"),
    onFormatCss: () => applyFormat("css"),
    onFormatSql: () => applyFormat("sql"),
    onCharConvert: (action: string) => applyCharConvert(action),
    onSaveCopy: handleSaveCopy,
    onOpenWithEncoding: handleOpenWithEncoding,
    onToggleBom: handleToggleBom,
    onSaveAll: handleSaveAll,
    onCopyDirectory: handleCopyDirectory,
    onCopyFileName: handleCopyFileName,
    onClipboardHistory: () => setShowClipboardHistory(true),
    onSnippets: () => setShowSnippets(true),
    onPluginManager: () => setShowPluginManager(true),
    onRunCommand: () => setShowRunCommand(true),
    onOpenInDefault: handleOpenInDefault,
    onRunMacroMultiple: () => setShowRunMacro(true),
    onPostItMode: () => setPostItMode((v) => !v),
    onSentenceCase: () => window.dispatchEvent(new CustomEvent("markpt:edit-action", { detail: { action: "sentence-case" } })),
    onRandomCase: () => window.dispatchEvent(new CustomEvent("markpt:edit-action", { detail: { action: "random-case" } })),
    onSaveAs: handleSaveAs,
    onCloseAll: handleCloseAll,
    onCloseAllButCurrent: handleCloseAllButCurrent,
    onQuit: handleQuit,
    onMarkAll: handleMarkAll,
    onUnmarkAll: handleUnmarkAll,
    onEncodeWith: handleEncodeWith,
    onConvertEncoding: handleConvertEncoding,
    onMacroStartStop: handleMacroStartStop,
    onMacroPlayback: handleMacroPlayback,
    onMacroSave: handleMacroSave,
    onAbout: handleAbout,
    onSetLanguage: (lang: string) => handleSetLanguage(lang),
    onCompareStart: handleToggleDiff,
    onCompareClear: () => setShowDiffView(false),
    onCompareSyncScroll: () => window.dispatchEvent(new CustomEvent("markpt:compare-sync-scroll")),
    onCompareNextDiff: () => window.dispatchEvent(new CustomEvent("markpt:compare-next-diff")),
    onComparePrevDiff: () => window.dispatchEvent(new CustomEvent("markpt:compare-prev-diff")),
    onWindowSort: (by: "name" | "path" | "time") => {
      if (by === "name") useFileStore.getState().sortTabs("name");
      else if (by === "path") useFileStore.getState().sortTabs("path");
      else useFileStore.getState().sortTabs("type");
    },
    onWindowCascade: () => setSplitMode(null),
    onWindowTileHorizontal: () => setSplitMode("horizontal"),
    onWindowTileVertical: () => setSplitMode("vertical"),
    onWindowList: () => setShowDocSwitcher(true),
  });

  useEffect(() => {
    if (sessionRestored && tabs.length === 0) handleNewFile();
  }, [tabs.length, handleNewFile, sessionRestored]);

  // 会话保存（定时 + 退出时）
  useEffect(() => {
    const saveInterval = setInterval(() => {
      saveSessionNow().catch(() => {});
    }, 60000);
    return () => clearInterval(saveInterval);
  }, [saveSessionNow]);

  // 窗口关闭时保存会话
  useEffect(() => {
    const unlistenP = getCurrentWindow().onCloseRequested(() => {
      saveSessionNow().catch(() => {});
    });
    return () => { unlistenP.then((unlisten) => unlisten()); };
  }, [saveSessionNow]);

  // 会话恢复（启动时）
  useEffect(() => {
    (async () => {
      const session = await loadSession();
      if (session && session.tabs.length > 0) {
        for (const tab of session.tabs) {
          try {
            if (tab.is_new || !tab.path) {
              const id = generateId();
              openTab({
                id,
                path: "",
                name: tab.name || t("common.unnamed"),
                content: tab.content || "",
                meta: null,
                is_dirty: tab.is_dirty,
                is_large_file: false,
                readonly: false,
                encoding: (tab.encoding as EncodingType) || "UTF-8",
                language: tab.language || "plaintext",
                cursor_position: { line: tab.cursor_line || 1, column: tab.cursor_column || 1 },
                scroll_position: tab.scroll_position || 0,
                is_new: true,
              });
            } else {
              const result = await openFileService(tab.path);
              openTab({
                id: generateId(), path: tab.path, name: tab.name, content: result.content,
                meta: result.meta, is_dirty: false, is_large_file: result.is_large_file,
                readonly: result.meta.readonly, encoding: tab.encoding as EncodingType,
                language: tab.language,
                cursor_position: { line: tab.cursor_line, column: tab.cursor_column },
                scroll_position: tab.scroll_position, is_new: false,
              });
            }
          } catch { /* ignore */ }
        }
        if (session.active_tab_path) {
          const tab = useFileStore.getState().getTabByPath(session.active_tab_path);
          if (tab) useFileStore.getState().setActiveTab(tab.id);
        }
        setShowSidebar(session.sidebar_visible);
      }
      setSessionRestored(true);
    })();
  }, []);

  const platformClass = typeof navigator !== "undefined"
    ? (/Mac/.test(navigator.platform) ? "platform-mac" : /Win/.test(navigator.platform) || /Windows/.test(navigator.platform) ? "platform-win" : "platform-linux")
    : "platform-win";

  return (
    <div className={`app ${platformClass} ${isDark ? "dark" : "light"} ${postItMode ? "postit-mode" : ""}`} onDrop={handleDrop} onDragOver={handleDragOver}>
      <div className="app-body">
        {showSidebar && (
          <div className="sidebar-container">
            <SideBar onOpenFile={openFileByPath} />
            {recentFiles.length > 0 && (
              <div className="recent-files">
                <div className="recent-files-header">{t("sidebar.recentFiles")}</div>
                {recentFiles.slice(0, 10).map((path) => (
                  <div key={path} className="recent-file-item" onClick={() => openFileByPath(path)} title={path}>
                    {getFileName(path)}
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
        <MainLayout
          onNewTab={handleNewFile}
          onCloseTab={handleCloseTab}
          onSave={handleSave}
          onSaveAll={handleSaveAll}
          onOpenFile={handleOpenFile}
          onGotoLine={handleGotoLine}
          onExport={handleExport}
          onOpenEncoding={() => setShowEncodingDialog(true)}
          onOpenSettings={() => setShowSettingsDialog(true)}
          onFunctionList={() => setShowFunctionList((v) => !v)}
          onSplitHorizontal={() => setSplitMode(splitMode === "horizontal" ? null : "horizontal")}
          onSplitVertical={() => setSplitMode(splitMode === "vertical" ? null : "vertical")}
          onLanguageSelector={() => setShowLanguageSelector(true)}
          onCompareStart={handleToggleDiff}
          selectionInfo={selectionInfo}
        >
          {activeTab ? (
            showDiffView ? (
              <DiffEditorView original={diffContent.original} modified={diffContent.modified} language={activeTab.language} />
            ) : splitMode ? (
              <SplitEditor
                content={activeTab.content}
                path={activeTab.path}
                language={activeTab.language}
                orientation={splitMode}
                onContentChange={handleContentChange}
                onClose={() => setSplitMode(null)}
              />
            ) : (
              <MonacoEditor
                key={activeTab.id}
                tabId={activeTab.id}
                path={activeTab.path}
                content={activeTab.content}
                language={activeTab.language}
                readonly={activeTab.readonly}
                onContentChange={handleContentChange}
                onCursorChange={handleCursorChange}
                onSelectionChange={handleSelectionChange}
              />
            )
          ) : (
            <div className="no-tab">
              <div className="no-tab-content">
                <div className="no-tab-logo">MPT</div>
                <h2>MarkPT</h2>
                <p>{t("welcome.subtitle")} v2.0.0</p>
                <p className="hint">{t("welcome.desc")}</p>
                <div className="no-tab-actions">
                  <button className="btn btn-primary" onClick={handleNewFile}>{t("app.newFile")}</button>
                  <button className="btn btn-default" onClick={handleOpenFile}>{t("app.openFile")}</button>
                </div>
                <p className="hint">{t("welcome.hint")}</p>
              </div>
            </div>
          )}
        </MainLayout>
      </div>

      {showCommandPalette && (
        <CommandPalette
          onClose={() => setShowCommandPalette(false)}
          onSave={handleSave}
          onNewFile={handleNewFile}
          onOpenFile={handleOpenFile}
          onGotoLine={handleGotoLine}
          onFind={toggleSearchPanel}
          onReplace={toggleReplacePanel}
          onFindInFiles={toggleFindInFiles}
          onEncoding={() => setShowEncodingDialog(true)}
          onSettings={() => setShowSettingsDialog(true)}
          onToggleDiff={handleToggleDiff}
          onToggleMacro={() => setShowMacroPanel(true)}
        />
      )}
      {showEncodingDialog && activeTab && (
        <EncodingDialog currentEncoding={activeTab.encoding} onConfirm={handleEncodingChange} onClose={() => setShowEncodingDialog(false)} />
      )}
      {showSettingsDialog && <SettingsDialog onClose={() => setShowSettingsDialog(false)} />}
      {showGoToLineDialog && activeTab && (
        <GoToLineDialog maxLine={activeTab.meta?.line_count || 10000} onConfirm={handleGotoLineConfirm} onClose={() => setShowGoToLineDialog(false)} />
      )}
      {showMacroPanel && <MacroPanel onClose={() => setShowMacroPanel(false)} />}
      {showShortcutsHelp && <ShortcutsHelp onClose={() => setShowShortcutsHelp(false)} />}
      {showCharStats && activeTab && (
        <CharacterStatsDialog
          content={activeTab.content}
          selectedChars={selectionInfo?.chars || 0}
          selectedLines={selectionInfo?.lines || 0}
          onClose={() => setShowCharStats(false)}
        />
      )}
      {showFunctionList && (
        <FunctionListPanel
          editor={(window as any).monaco?.editor?.getEditors?.()[0] || null}
          onClose={() => setShowFunctionList(false)}
        />
      )}
      {showHexViewer && activeTab && (
        <HexViewer content={activeTab.content} onClose={() => setShowHexViewer(false)} />
      )}
      {showMultiDocSearch && (
        <MultiDocSearch onClose={() => setShowMultiDocSearch(false)} />
      )}
      {showTextTransform && activeTab && (
        <TextTransformDialog
          content={activeTab.content}
          onApply={handleApplyTransform}
          onClose={() => setShowTextTransform(false)}
        />
      )}
      {showInsertDateTime && (
        <InsertDateTimeDialog
          onInsert={handleInsertText}
          onClose={() => setShowInsertDateTime(false)}
        />
      )}
      {showSpecialChar && (
        <SpecialCharPanel
          onInsert={handleInsertText}
          onClose={() => setShowSpecialChar(false)}
        />
      )}
      {showColorPicker && (
        <ColorPickerDialog
          onInsert={handleInsertText}
          onClose={() => setShowColorPicker(false)}
        />
      )}
      {showDocSwitcher && (
        <DocumentSwitcher onClose={() => setShowDocSwitcher(false)} />
      )}
      {showBatchFindReplace && (
        <BatchFindReplace onClose={() => setShowBatchFindReplace(false)} />
      )}
      {showFileProps && activeTab && (
        <FilePropertiesDialog tab={activeTab} onClose={() => setShowFileProps(false)} />
      )}
      {showShortcutMapper && (
        <ShortcutMapper onClose={() => setShowShortcutMapper(false)} />
      )}
      {showMarkdownPreview && activeTab && (
        <MarkdownPreview content={activeTab.content} onClose={() => setShowMarkdownPreview(false)} />
      )}
      {showRegexTester && (
        <RegexTester onClose={() => setShowRegexTester(false)} />
      )}
      {showCsvViewer && activeTab && (
        <CsvViewer content={activeTab.content} onClose={() => setShowCsvViewer(false)} />
      )}
      {showLanguageSelector && activeTab && (
        <LanguageSelector
          currentLanguage={activeTab.language}
          onSelect={handleSetLanguage}
          onClose={() => setShowLanguageSelector(false)}
        />
      )}
      {reloadDialog && (
        <ReloadConfirmDialog fileName={getFileName(reloadDialog)} onReload={handleReload} onIgnore={() => setReloadDialog(null)} />
      )}
      {showClipboardHistory && (
        <ClipboardHistoryPanel onPaste={handlePasteFromHistory} onClose={() => setShowClipboardHistory(false)} />
      )}
      {showSnippets && (
        <SnippetsPanel onClose={() => setShowSnippets(false)} />
      )}
      {showPluginManager && (
        <PluginManager onClose={() => setShowPluginManager(false)} />
      )}
      {showRunCommand && (
        <RunCommandDialog onClose={() => setShowRunCommand(false)} onRun={handleRunCommand} />
      )}
      {showRunMacro && (
        <RunMacroDialog onClose={() => setShowRunMacro(false)} onRun={handleRunMacro} />
      )}
      {showAbout && (
        <div className="dialog-overlay" onClick={() => setShowAbout(false)}>
          <div className="dialog-content about-dialog" onClick={(e) => e.stopPropagation()}>
            <div className="about-logo">MPT</div>
            <h2>MarkPT</h2>
            <p className="about-version">{t("about.version")} 2.0.0</p>
            <p className="about-desc">{t("about.desc")}</p>
            <p className="about-tech">{t("about.tech")}</p>
            <p className="about-desc">{t("about.mission")}</p>
            <div className="about-actions">
              <button className="btn btn-primary" onClick={() => setShowAbout(false)}>{t("about.ok")}</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
