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

import {ChangeDetectionStrategy, Component, computed, input, signal} from '@angular/core';

import {stripAnsi} from '../../core/models/ShellCommand';

/** Lines shown per stream before the rest are hidden behind a button. */
const DEFAULT_MAX_LINES = 200;

/**
 * Renders the output of a command or program as terminal text: stdout, stderr,
 * an error from the tool itself, and a short status line.
 */
@Component({
  changeDetection: ChangeDetectionStrategy.OnPush,
  selector: 'app-terminal-output',
  templateUrl: './terminal-output.component.html',
  styleUrl: './terminal-output.component.scss',
  standalone: true,
})
export class TerminalOutputComponent {
  readonly stdout = input<string>('');
  readonly stderr = input<string>('');
  /** An error reported by the tool, as opposed to the program's stderr. */
  readonly error = input<string>('');
  /** Shown below the output, e.g. `Exit code 1`. Empty for none. */
  readonly status = input<string>('');
  /** Whether to draw the border and background. Off inside another panel. */
  readonly boxed = input<boolean>(true);
  /**
   * How many lines of stdout and of stderr to show until the user asks for
   * all of them. The last lines are kept, since errors and results come last.
   */
  readonly maxLines = input<number>(DEFAULT_MAX_LINES);

  protected readonly expanded = signal(false);

  private readonly stdoutLines = computed(() => toLines(this.stdout()));
  private readonly stderrLines = computed(() => toLines(this.stderr()));

  protected readonly stdoutText = computed(
      () => this.visibleLines(this.stdoutLines()).join('\n'));
  protected readonly stderrText = computed(
      () => this.visibleLines(this.stderrLines()).join('\n'));
  protected readonly hasOutput = computed(
      () => !!(this.stdoutText() || this.stderrText() || this.error()));
  protected readonly totalLineCount = computed(
      () => this.stdoutLines().length + this.stderrLines().length);
  /** Lines left out of the display, 0 when everything is shown. */
  protected readonly hiddenLineCount = computed(
      () => this.expanded() ?
          0 :
          Math.max(0, this.stdoutLines().length - this.maxLines()) +
              Math.max(0, this.stderrLines().length - this.maxLines()));

  private visibleLines(lines: string[]): string[] {
    return this.expanded() ? lines : lines.slice(-this.maxLines());
  }
}

/** Splits output into lines, without color codes or trailing whitespace. */
function toLines(text: string): string[] {
  const trimmed = text ? stripAnsi(text).replace(/\s+$/, '') : '';
  return trimmed ? trimmed.split('\n') : [];
}
