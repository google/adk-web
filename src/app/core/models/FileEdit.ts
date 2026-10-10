/**
 * @license
 * Copyright 2026 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *     http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */

import {FunctionCall, FunctionResponse} from './types';

/** EnvironmentToolset tools that read and change files. */
export enum FileTool {
  /** Replaces one exact substring in a file. */
  EDIT = 'EditFile',
  /** Creates a file or replaces its whole content. */
  WRITE = 'WriteFile',
  /** Returns a file's content, optionally a range of lines. */
  READ = 'ReadFile',
}

/**
 * A change a file tool call makes. A write is shown as a diff from empty text,
 * since the tool does not say what the file held before.
 */
export interface FileEdit {
  kind: 'edit'|'write';
  path: string;
  oldText: string;
  newText: string;
}

/** One line of a file as returned by `ReadFile`. */
export interface FileReadLine {
  /** Line number in the file, or null for a note such as truncation. */
  number: number|null;
  text: string;
}

/** The content a `ReadFile` call returned. */
export interface FileRead {
  lines: FileReadLine[];
  /** Total lines in the file, reported only when part of it was read. */
  totalLines: number|null;
}

/** The file and line range a `ReadFile` call asks for. */
export interface FileReadRequest {
  path: string;
  startLine: number|null;
  endLine: number|null;
}

// ReadFile prefixes each line with its number, right-aligned, and a tab.
const NUMBERED_LINE_PATTERN = /^\s*(\d+)\t(.*)$/;

/** One line of a line-based diff. */
export interface DiffLine {
  type: 'context'|'added'|'removed';
  text: string;
}

/** A run of unchanged lines hidden from a diff, shown on request. */
export interface CollapsedLines {
  type: 'collapsed';
  lines: DiffLine[];
}

/** A row of a displayed diff: a line, or unchanged lines folded into one row. */
export type DiffRow = DiffLine|CollapsedLines;

/**
 * Above this many line pairs the diff skips the line matching and shows every
 * old line as removed and every new line as added, to keep rendering cheap.
 */
const MAX_DIFF_CELLS = 1_000_000;

/** Unchanged lines kept next to each change when the rest are collapsed. */
const CONTEXT_LINES = 3;

function isFileTool(name: string|undefined): boolean {
  return Object.values(FileTool).includes(name as FileTool);
}

/**
 * Returns the change a function call makes to a file, or null when the call is
 * not a file edit or write.
 */
export function getFileEdit(fc: FunctionCall|undefined): FileEdit|null {
  const args = fc?.args ?? {};
  const path = args['path'];
  if (typeof path !== 'string') return null;
  if (fc?.name === FileTool.EDIT) {
    const oldText = args['old_string'];
    const newText = args['new_string'];
    if (typeof oldText !== 'string' || typeof newText !== 'string') return null;
    return {kind: 'edit', path, oldText, newText};
  }
  if (fc?.name === FileTool.WRITE) {
    const content = args['content'];
    if (typeof content !== 'string') return null;
    return {kind: 'write', path, oldText: '', newText: content};
  }
  return null;
}

/** Whether a function call edits or writes a file. */
export function isFileEditCall(fc: FunctionCall|undefined): boolean {
  return getFileEdit(fc) !== null;
}

/**
 * Returns the error a file tool reported, such as a missing file, or null when
 * the call succeeded or did not come from a file tool.
 */
export function getFileToolError(fr: FunctionResponse|undefined): string|null {
  if (!fr || !isFileTool(fr.name)) return null;
  const response = fr.response;
  if (response?.['status'] !== 'error') return null;
  const error = response['error'];
  return typeof error === 'string' && error ? error : 'The file operation failed.';
}

/** Returns the file and line range a `ReadFile` call asks for. */
export function getFileReadRequest(fc: FunctionCall|undefined):
    FileReadRequest|null {
  if (fc?.name !== FileTool.READ) return null;
  const args = fc.args ?? {};
  const path = args['path'];
  if (typeof path !== 'string') return null;
  const lineNumber = (value: unknown) =>
      typeof value === 'number' && Number.isInteger(value) ? value : null;
  return {
    path,
    startLine: lineNumber(args['start_line']),
    endLine: lineNumber(args['end_line']),
  };
}

function parseReadLine(line: string): FileReadLine {
  const match = NUMBERED_LINE_PATTERN.exec(line);
  return match ? {number: Number(match[1]), text: match[2]} :
                 {number: null, text: line};
}

/**
 * Returns the content of a successful `ReadFile` response, split into numbered
 * lines, or null for other responses.
 */
export function getFileRead(fr: FunctionResponse|undefined): FileRead|null {
  if (fr?.name !== FileTool.READ) return null;
  const response = fr.response;
  const content = response?.['content'];
  if (response?.['status'] !== 'ok' || typeof content !== 'string') return null;
  const body = content.replace(/\n$/, '');
  const lines = body ? body.split('\n').map(parseReadLine) : [];
  const totalLines = response['total_lines'];
  return {
    lines,
    totalLines: typeof totalLines === 'number' ? totalLines : null,
  };
}

function splitLines(text: string): string[] {
  const normalized = text.replace(/\r\n/g, '\n').replace(/\n$/, '');
  return normalized ? normalized.split('\n') : [];
}

/**
 * Diffs two texts line by line, keeping the lines they share as context. Uses
 * the longest common subsequence, which gives the smallest set of changed lines.
 */
export function diffLines(oldText: string, newText: string): DiffLine[] {
  const oldLines = splitLines(oldText);
  const newLines = splitLines(newText);
  const removed = (text: string): DiffLine => ({type: 'removed', text});
  const added = (text: string): DiffLine => ({type: 'added', text});

  // Lines shared at the start and end need no matching.
  let start = 0;
  while (start < oldLines.length && start < newLines.length &&
         oldLines[start] === newLines[start]) {
    start++;
  }
  let oldEnd = oldLines.length;
  let newEnd = newLines.length;
  while (oldEnd > start && newEnd > start &&
         oldLines[oldEnd - 1] === newLines[newEnd - 1]) {
    oldEnd--;
    newEnd--;
  }
  const head = oldLines.slice(0, start).map(
      (text): DiffLine => ({type: 'context', text}));
  const tail = oldLines.slice(oldEnd).map(
      (text): DiffLine => ({type: 'context', text}));
  const oldMiddle = oldLines.slice(start, oldEnd);
  const newMiddle = newLines.slice(start, newEnd);

  if (oldMiddle.length * newMiddle.length > MAX_DIFF_CELLS) {
    return [
      ...head, ...oldMiddle.map(removed), ...newMiddle.map(added), ...tail
    ];
  }

  // lcs[i][j] is the length of the longest common subsequence of
  // oldMiddle[i:] and newMiddle[j:].
  const rows = oldMiddle.length;
  const cols = newMiddle.length;
  const lcs = Array.from({length: rows + 1}, () => new Array<number>(cols + 1).fill(0));
  for (let i = rows - 1; i >= 0; i--) {
    for (let j = cols - 1; j >= 0; j--) {
      lcs[i][j] = oldMiddle[i] === newMiddle[j] ?
          lcs[i + 1][j + 1] + 1 :
          Math.max(lcs[i + 1][j], lcs[i][j + 1]);
    }
  }

  const middle: DiffLine[] = [];
  let i = 0;
  let j = 0;
  while (i < rows && j < cols) {
    if (oldMiddle[i] === newMiddle[j]) {
      middle.push({type: 'context', text: oldMiddle[i]});
      i++;
      j++;
    } else if (lcs[i + 1][j] >= lcs[i][j + 1]) {
      middle.push(removed(oldMiddle[i++]));
    } else {
      middle.push(added(newMiddle[j++]));
    }
  }
  middle.push(...oldMiddle.slice(i).map(removed), ...newMiddle.slice(j).map(added));
  return [...head, ...middle, ...tail];
}

/**
 * Folds runs of unchanged lines that are more than `context` lines away from
 * any change into a single collapsed row. A diff without changes is returned
 * as is.
 */
export function collapseUnchangedLines(
    lines: readonly DiffLine[], context = CONTEXT_LINES): DiffRow[] {
  const changed = lines.map(line => line.type !== 'context');
  if (!changed.includes(true)) return [...lines];

  const keep = lines.map((_, index) => {
    const from = Math.max(0, index - context);
    const to = Math.min(lines.length - 1, index + context);
    for (let i = from; i <= to; i++) {
      if (changed[i]) return true;
    }
    return false;
  });

  const rows: DiffRow[] = [];
  lines.forEach((line, index) => {
    if (keep[index]) {
      rows.push(line);
      return;
    }
    const last = rows[rows.length - 1];
    if (last?.type === 'collapsed') {
      last.lines.push(line);
    } else {
      rows.push({type: 'collapsed', lines: [line]});
    }
  });
  // Folding a single line saves no space, so show it instead.
  return rows.flatMap(row => row.type === 'collapsed' && row.lines.length === 1 ?
                          row.lines :
                          [row]);
}
