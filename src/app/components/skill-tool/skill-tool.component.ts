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

import {toMarkdownCodeBlock} from '../../core/models/CodeExecution';
import {getResourceLanguage, getSkillResult} from '../../core/models/SkillTool';
import type {FunctionResponse} from '../../core/models/types';
import {MARKDOWN_COMPONENT, MarkdownComponentInterface} from '../markdown/markdown.component.interface';
import {TerminalOutputComponent} from '../terminal-output/terminal-output.component';

/**
 * Renders a SkillToolset response under its chip: the skills listed or found,
 * the skill that was loaded with its instructions, the resource file that was
 * read, the skill that was unloaded, or the error the tool reported.
 */
@Component({
  changeDetection: ChangeDetectionStrategy.OnPush,
  selector: 'app-skill-tool',
  templateUrl: './skill-tool.component.html',
  styleUrl: './skill-tool.component.scss',
  standalone: true,
  imports: [MatIconModule, NgComponentOutlet, TerminalOutputComponent],
})
export class SkillToolComponent {
  readonly functionResponse = input<FunctionResponse>();

  protected readonly markdownComponent: Type<MarkdownComponentInterface> =
      inject(MARKDOWN_COMPONENT);

  protected readonly result =
      computed(() => getSkillResult(this.functionResponse()));

  /** The resource file as a fenced code block, for syntax highlighting. */
  protected readonly resourceMarkdown = computed(() => {
    const result = this.result();
    if (result?.kind !== 'resource' || result.content === null) {
      return '';
    }
    return toMarkdownCodeBlock(
        result.content, getResourceLanguage(result.filePath));
  });

  protected readonly resourceLineCount = computed(() => {
    const result = this.result();
    if (result?.kind !== 'resource' || !result.content) {
      return 0;
    }
    return result.content.replace(/\n+$/, '').split('\n').length;
  });
}
