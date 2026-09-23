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

import {ChangeDetectionStrategy, Component, computed, input} from '@angular/core';

import {getShellCommand, getShellResult, stripAnsi, tokenizeShellCommand} from '../../core/models/ShellCommand';
import type {FunctionCall, FunctionResponse} from '../../core/models/types';

/**
 * Renders a shell tool call as a terminal prompt line (`$ command`), or a shell
 * tool response as the command's output.
 */
@Component({
  changeDetection: ChangeDetectionStrategy.OnPush,
  selector: 'app-shell-command',
  templateUrl: './shell-command.component.html',
  styleUrl: './shell-command.component.scss',
  standalone: true,
})
export class ShellCommandComponent {
  readonly functionCall = input<FunctionCall>();
  readonly functionResponse = input<FunctionResponse>();

  protected readonly command = computed(() => getShellCommand(this.functionCall()));
  protected readonly tokens = computed(() => {
    const command = this.command();
    return command ? tokenizeShellCommand(command) : [];
  });

  protected readonly result = computed(() => getShellResult(this.functionResponse()));
  protected readonly stdout = computed(() => formatStream(this.result()?.stdout));
  protected readonly stderr = computed(() => formatStream(this.result()?.stderr));
  protected readonly hasOutput = computed(
      () => !!(this.stdout() || this.stderr() || this.result()?.error));
  protected readonly status = computed(() => {
    const result = this.result();
    if (!result) return '';
    if (result.timedOut) return 'Timed out';
    if (result.exitCode !== null && result.exitCode !== 0) {
      return `Exit code ${result.exitCode}`;
    }
    return '';
  });
}

function formatStream(text: string|undefined): string {
  return text ? stripAnsi(text).replace(/\s+$/, '') : '';
}
