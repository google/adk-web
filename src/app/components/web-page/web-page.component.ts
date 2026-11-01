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
import {MatIconModule} from '@angular/material/icon';

import type {FunctionCall, FunctionResponse} from '../../core/models/types';
import {getWebPageResult, getWebPageUrl} from '../../core/models/WebTool';
import {TerminalOutputComponent} from '../terminal-output/terminal-output.component';

/**
 * Renders a `load_web_page` response under its chip: the page text, collapsed
 * to a header with the page's URL and length, or the error when the fetch
 * failed.
 */
@Component({
  changeDetection: ChangeDetectionStrategy.OnPush,
  selector: 'app-web-page',
  templateUrl: './web-page.component.html',
  styleUrl: './web-page.component.scss',
  standalone: true,
  imports: [MatIconModule, TerminalOutputComponent],
})
export class WebPageComponent {
  readonly functionResponse = input<FunctionResponse>();
  /** The call the response answers, which gives the page's URL. */
  readonly functionCall = input<FunctionCall>();

  protected readonly result =
      computed(() => getWebPageResult(this.functionResponse()));
  protected readonly url =
      computed(() => getWebPageUrl(this.functionCall()) ?? '');
  protected readonly lineCount = computed(() => {
    const result = this.result();
    return result?.kind === 'page' && result.text ?
        result.text.split('\n').length :
        0;
  });
}
