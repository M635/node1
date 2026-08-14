import { useState, useCallback, useEffect } from "react";
import { open } from "@tauri-apps/plugin-dialog";
import { invoke } from "@tauri-apps/api/core";
import { useFileStore } from "../../stores/fileStore";
import { useI18n } from "../../stores/i18nStore";
import { getFileName, getFileExtension, normalizePath } from "../../utils/fileUtils";
import { getLanguageFromPath } from "../../services/monaco/languages";

interface FileNode {
  name: string;
  path: string;
  is_dir: boolean;
  children?: FileNode[];
  expanded?: boolean;
}

interface SideBarProps {
  onOpenFile: (path: string) => void;
}

export function SideBar({ onOpenFile }: SideBarProps) {
  const [rootPath, setRootPath] = useState<string | null>(null);
  const [tree, setTree] = useState<FileNode[]>([]);
  const [loading, setLoading] = useState(false);
  const { tabs, activeTabId, setActiveTab } = useFileStore();
  const { t } = useI18n();

  const loadDirectory = useCallback(async (dirPath: string): Promise<FileNode[]> => {
    try {
      const entries = await invoke<[string, boolean][]>("list_directory", { path: dirPath });
      return entries
        .sort((a, b) => {
          if (a[1] !== b[1]) return a[1] ? -1 : 1;
          return a[0].localeCompare(b[0]);
        })
        .map(([name, isDir]) => ({
          name,
          path: normalizePath(dirPath + "/" + name),
          is_dir: isDir,
          children: isDir ? [] : undefined,
          expanded: false,
        }));
    } catch {
      return [];
    }
  }, []);

  const handleOpenFolder = useCallback(async () => {
    const selected = await open({ directory: true });
    if (selected) {
      setRootPath(selected as string);
      setLoading(true);
      const nodes = await loadDirectory(selected as string);
      setTree(nodes);
      setLoading(false);
    }
  }, [loadDirectory]);

  const findNode = (nodes: FileNode[], indexPath: number[]): FileNode | null => {
    let current: FileNode | null = null;
    let level = nodes;
    for (const idx of indexPath) {
      if (idx >= level.length) return null;
      current = level[idx];
      if (current.is_dir && current.children) {
        level = current.children;
      }
    }
    return current;
  };

  const updateNodeInTree = (nodes: FileNode[], indexPath: number[], updater: (node: FileNode) => FileNode): FileNode[] => {
    if (indexPath.length === 0) return nodes;
    const [idx, ...rest] = indexPath;
    return nodes.map((node, i) => {
      if (i !== idx) return node;
      if (rest.length === 0) return updater(node);
      return { ...node, children: updateNodeInTree(node.children || [], rest, updater) };
    });
  };

  const toggleNode = useCallback(async (node: FileNode, indexPath: number[]) => {
    if (!node.is_dir) {
      onOpenFile(node.path);
      return;
    }

    const target = findNode(tree, indexPath);
    if (!target) return;

    const newExpanded = !target.expanded;
    let newTree = updateNodeInTree(tree, indexPath, (n) => ({ ...n, expanded: newExpanded }));

    if (newExpanded && (!target.children || target.children.length === 0)) {
      const children = await loadDirectory(target.path);
      newTree = updateNodeInTree(newTree, indexPath, (n) => ({ ...n, children, expanded: true }));
    }

    setTree(newTree);
  }, [tree, loadDirectory, onOpenFile]);

  const renderTree = (nodes: FileNode[], indexPath: number[] = []): React.ReactNode => {
    return nodes.map((node, idx) => {
      const path = [...indexPath, idx];
      const isActive = tabs.some((t) => t.path === node.path && t.id === activeTabId);
      const isOpen = tabs.some((t) => t.path === node.path);

      return (
        <div key={node.path}>
          <div
            className={`file-tree-item ${node.is_dir ? "dir" : "file"} ${isActive ? "active" : ""} ${isOpen ? "open" : ""}`}
            onClick={() => toggleNode(node, path)}
          >
            <span className="tree-icon">
              {node.is_dir ? (node.expanded ? "📂" : "📁") : getFileIcon(node.name)}
            </span>
            <span className="tree-name">{node.name}</span>
          </div>
          {node.is_dir && node.expanded && node.children && (
            <div className="file-tree-children">
              {renderTree(node.children, path)}
            </div>
          )}
        </div>
      );
    });
  };

  return (
    <div className="sidebar">
      <div className="sidebar-header">
        <span className="sidebar-title">{t("sidebar.explorer")}</span>
        <button className="sidebar-btn" onClick={handleOpenFolder} title={t("sidebar.openFolder")}>
          📂+
        </button>
      </div>
      <div className="sidebar-content">
        {loading ? (
          <div className="sidebar-loading">{t("common.loading")}</div>
        ) : tree.length > 0 ? (
          <div className="file-tree">{renderTree(tree)}</div>
        ) : (
          <div className="sidebar-empty">
            <p>{t("sidebar.noFolder")}</p>
            <button className="btn btn-primary" onClick={handleOpenFolder}>
              {t("sidebar.openFolder")}
            </button>
          </div>
        )}
      </div>
      {rootPath && (
        <div className="sidebar-footer" title={rootPath}>
          {getFileName(rootPath)}
        </div>
      )}
    </div>
  );
}

function getFileIcon(name: string): string {
  const ext = getFileExtension(name);
  const iconMap: Record<string, string> = {
    ts: "📘", tsx: "📘", js: "📙", jsx: "📙",
    json: "📋", html: "🌐", css: "🎨", md: "📝",
    rs: "🦀", py: "🐍", go: "🐹", java: "☕",
    c: "🔧", cpp: "🔧", h: "🔧", txt: "📄",
    log: "📜", sh: "💻", sql: "🗄️", xml: "📄",
    yml: "⚙️", yaml: "⚙️", toml: "⚙️",
  };
  return iconMap[ext] || "📄";
}
