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

import {NgComponentOutlet} from '@angular/common';
import {ChangeDetectionStrategy, Component, computed, inject, input, signal, Type} from '@angular/core';
import {MatIconModule} from '@angular/material/icon';

import {toMarkdownCodeBlock} from '../../core/models/CodeExecution';
import {collapseUnchangedLines, diffLines, DiffRow, getFileEdit, getFileRead, getFileReadRequest, getFileToolError} from '../../core/models/FileEdit';
import {getResourceLanguage} from '../../core/models/SkillTool';
import type {FunctionCall, FunctionResponse} from '../../core/models/types';
import {MARKDOWN_COMPONENT, MarkdownComponentInterface} from '../markdown/markdown.component.interface';
import {TerminalOutputComponent} from '../terminal-output/terminal-output.component';

const DIFF_MARKERS = {context: ' ', added: '+', removed: '-'} as const;

/**
 * Renders file tool calls and responses. Under a call, an edit or write shows
 * as a diff of the change. Under a response, a read shows the file content and
 * a failed call shows its error. Successful edits and writes add nothing under
 * the response, since the call already shows the change.
 */
@Component({
  changeDetection: ChangeDetectionStrategy.OnPush,
  selector: 'app-file-edit',
  templateUrl: './file-edit.component.html',
  styleUrl: './file-edit.component.scss',
  standalone: true,
  imports: [MatIconModule, NgComponentOutlet, TerminalOutputComponent],
})
export class FileEditComponent {
  /**
   * The call to render. Given with a `functionResponse`, the call that
   * response answers, which gives a read its path.
   */
  readonly functionCall = input<FunctionCall>();
  readonly functionResponse = input<FunctionResponse>();

  protected readonly markdownComponent: Type<MarkdownComponentInterface> =
      inject(MARKDOWN_COMPONENT);

  protected readonly markers = DIFF_MARKERS;
  /** The change to show; only when rendering a call, not its response. */
  protected readonly edit = computed(
      () => this.functionResponse() ? null : getFileEdit(this.functionCall()));
  protected readonly lines = computed(() => {
    const edit = this.edit();
    return edit ? diffLines(edit.oldText, edit.newText) : [];
  });
  protected readonly addedCount =
      computed(() => this.lines().filter(line => line.type === 'added').length);
  protected readonly removedCount = computed(
      () => this.lines().filter(line => line.type === 'removed').length);
  protected readonly error =
      computed(() => getFileToolError(this.functionResponse()));

  private readonly rows = computed(() => collapseUnchangedLines(this.lines()));
  private readonly expandedRows = signal<ReadonlySet<number>>(new Set());
  /** Rows to render, with collapsed runs the user opened shown as lines. */
  protected readonly displayRows = computed(() => {
    const expanded = this.expandedRows();
    return this.rows().flatMap(
        (row, index): Array<{row: DiffRow, index: number}> =>
            row.type === 'collapsed' && expanded.has(index) ?
            row.lines.map(line => ({row: line, index})) :
            [{row, index}]);
  });

  protected readonly read =
      computed(() => getFileRead(this.functionResponse()));
  protected readonly readPath =
      computed(() => getFileReadRequest(this.functionCall())?.path ?? '');
  /** "Lines 4-6 of 10" for part of a file, or "10 lines" for all of it. */
  protected readonly readRange = computed(() => {
    const read = this.read();
    const numbers = (read?.lines ?? [])
                        .map(line => line.number)
                        .filter((number): number is number => number !== null);
    if (read?.totalLines != null && numbers.length) {
      return `Lines ${numbers[0]}-${numbers[numbers.length - 1]} of ${
          read.totalLines}`;
    }
    return `${numbers.length} ${numbers.length === 1 ? 'line' : 'lines'}`;
  });
  /** The content read, as a fenced code block for syntax highlighting. */
  protected readonly readMarkdown = computed(
      () => toMarkdownCodeBlock(
          (this.read()?.lines ?? []).map(line => line.text).join('\n'),
          getResourceLanguage(this.readPath())));

  protected expandRow(index: number) {
    this.expandedRows.update(rows => new Set([...rows, index]));
  }
}
