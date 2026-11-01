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
import {ChangeDetectionStrategy, Component, computed, inject, input, Type} from '@angular/core';
import {MatIconModule} from '@angular/material/icon';

import {CodeExecutionStatus, getCodeExecutionOutput, getCodeLanguage, toMarkdownCodeBlock} from '../../core/models/CodeExecution';
import type {CodeExecutionResult, ExecutableCode} from '../../core/models/types';
import {MARKDOWN_COMPONENT, MarkdownComponentInterface} from '../markdown/markdown.component.interface';
import {TerminalOutputComponent} from '../terminal-output/terminal-output.component';

/** Label and icon for the status badge on the output panel. */
const STATUS_BADGES: Partial<
    Record<CodeExecutionStatus, {label: string, icon: string}>> = {
  'ok': {label: 'Succeeded', icon: 'check_circle'},
  'failed': {label: 'Failed', icon: 'error'},
  'timeout': {label: 'Timed out', icon: 'schedule'},
};

/**
 * Renders a code run like an IDE: the executed code in an editor with a
 * language tab and line numbers, and its result in an output panel with a
 * status badge. Either part may be absent, since client-side executors send the
 * code and its result in separate events.
 */
@Component({
  changeDetection: ChangeDetectionStrategy.OnPush,
  selector: 'app-code-execution',
  templateUrl: './code-execution.component.html',
  styleUrl: './code-execution.component.scss',
  standalone: true,
  imports: [MatIconModule, NgComponentOutlet, TerminalOutputComponent],
})
export class CodeExecutionComponent {
  readonly executableCode = input<ExecutableCode>();
  readonly codeExecutionResult = input<CodeExecutionResult>();

  protected readonly markdownComponent: Type<MarkdownComponentInterface> =
      inject(MARKDOWN_COMPONENT);

  protected readonly language =
      computed(() => getCodeLanguage(this.executableCode()?.language));
  protected readonly code =
      computed(() => (this.executableCode()?.code ?? '').replace(/\n+$/, ''));
  protected readonly codeMarkdown =
      computed(() => toMarkdownCodeBlock(this.code(), this.language().fence));
  protected readonly lineNumbers = computed(
      () => this.code().split('\n').map((_, index) => index + 1));

  protected readonly result =
      computed(() => getCodeExecutionOutput(this.codeExecutionResult()));
  protected readonly badge = computed(() => {
    const status = this.result()?.status;
    return status ? STATUS_BADGES[status] : undefined;
  });
}
