export function getFileName(path: string): string {
  // Normalize all path separators to forward slash for consistent handling
  const normalized = path.replace(/\\/g, "/");
  const parts = normalized.split("/");
  return parts[parts.length - 1] || "untitled";
}

export function getFileExtension(path: string): string {
  const name = getFileName(path);
  const dotIndex = name.lastIndexOf(".");
  if (dotIndex <= 0) return "";
  return name.slice(dotIndex + 1).toLowerCase();
}

export function getDirectory(path: string): string {
  const normalized = path.replace(/\\/g, "/");
  const lastSlash = normalized.lastIndexOf("/");
  return lastSlash > 0 ? normalized.slice(0, lastSlash) : "";
}

export function normalizePath(path: string): string {
  // Normalize to forward slashes for cross-platform comparison
  return path.replace(/\\/g, "/");
}

export function joinPaths(...parts: string[]): string {
  // Cross-platform path joining using forward slashes
  return parts.filter(Boolean).join("/").replace(/\/+/g, "/");
}

export function formatPathForDisplay(path: string): string {
  // Use native separators for display on each platform
  return path.replace(/\\/g, "\\");
}

export function formatFileSize(bytes: number): string {
  if (bytes === 0) return "0 B";
  const units = ["B", "KB", "MB", "GB", "TB"];
  const i = Math.floor(Math.log(bytes) / Math.log(1024));
  const size = bytes / Math.pow(1024, i);
  return `${size.toFixed(i === 0 ? 0 : 1)} ${units[i]}`;
}

export function isPathEqual(a: string, b: string): boolean {
  return normalizePath(a) === normalizePath(b);
}

export function truncatePath(path: string, maxLen: number = 40): string {
  if (path.length <= maxLen) return path;
  const normalized = normalizePath(path);
  const parts = normalized.split("/");
  if (parts.length <= 2) return path;
  const fileName = parts[parts.length - 1];
  const prefix = parts[0];
  return `${prefix}/.../${fileName}`;
}

export function detectLanguageFromName(name: string): string {
  const lower = name.toLowerCase();
  if (lower === "makefile" || lower === "gnumakefile") return "makefile";
  if (lower === "dockerfile" || lower.startsWith("dockerfile.")) return "dockerfile";
  return "";
}

export function getParentPath(path: string): string {
  const normalized = normalizePath(path);
  const idx = normalized.lastIndexOf("/");
  return idx > 0 ? normalized.slice(0, idx) : "";
}
