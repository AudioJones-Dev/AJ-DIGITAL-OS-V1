/**
 * Filesystem Tool — safe, read-only filesystem operations.
 *
 * Allowed operations:
 *   - list_files   : list entries in an allowed directory
 *   - read_file    : read a text file under an allowed path root
 */

import { readdir, readFile, stat } from "node:fs/promises";
import path from "node:path";

const ALLOWED_ROOTS = ["c:\\dev"];

export interface FilesystemListParams {
  op: "list_files";
  dirPath: string;
}

export interface FilesystemReadParams {
  op: "read_file";
  filePath: string;
}

export type FilesystemParams = FilesystemListParams | FilesystemReadParams;

export interface FilesystemResult {
  ok: boolean;
  output?: unknown;
  error?: string;
}

function isAllowedPath(target: string): boolean {
  const normalised = path.resolve(target).toLowerCase();
  return ALLOWED_ROOTS.some((root) => normalised.startsWith(root.toLowerCase()));
}

function blocklistCheck(target: string): boolean {
  const lower = target.toLowerCase();
  const blocked = [".env", "secret", "token", "credential", "key", "appdata", "\\windows\\"];
  return blocked.some((b) => lower.includes(b));
}

export async function runFilesystemTool(params: FilesystemParams): Promise<FilesystemResult> {
  if (!isAllowedPath(params.op === "list_files" ? params.dirPath : params.filePath)) {
    return { ok: false, error: "Path is outside allowed roots." };
  }

  const target = params.op === "list_files" ? params.dirPath : params.filePath;
  if (blocklistCheck(target)) {
    return { ok: false, error: "Path contains a blocked segment." };
  }

  if (params.op === "list_files") {
    const entries = await readdir(params.dirPath, { withFileTypes: true });
    const output = entries.map((e) => ({
      name: e.name,
      type: e.isDirectory() ? "directory" : "file",
    }));
    return { ok: true, output };
  }

  if (params.op === "read_file") {
    const info = await stat(params.filePath);
    const MAX_BYTES = 512 * 1024; // 512 KB guard
    if (info.size > MAX_BYTES) {
      return { ok: false, error: `File too large (${info.size} bytes). Max 512 KB.` };
    }
    const content = await readFile(params.filePath, "utf-8");
    return { ok: true, output: content };
  }

  return { ok: false, error: "Unknown filesystem operation." };
}
