/**
 * @license
 * Copyright 2025 Google LLC
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

import {MarkdownRenderer} from '@a2ui/angular/v0_8';
import {MarkdownRenderer as MarkdownRendererV09} from '@a2ui/angular/v0_9';
import {Provider} from '@angular/core';
import {MarkdownService} from 'ngx-markdown';

const ngxMarkdownRenderer = (markdownService: MarkdownService) => ({
  render: async (markdown: string) => {
    return (await markdownService.parse(markdown)) ?? '';
  },
});

/**
 * Providers that connect ngx-markdown's MarkdownService to A2UI's
 * MarkdownRenderer, for both the v0.8 and v0.9 renderers. Without the v0.9
 * one, v0.9 `Text` falls back to `DefaultMarkdownRenderer`, which tries to
 * load the optional `@a2ui/markdown-it` peer and renders raw markdown when
 * it is absent.
 */
export function provideA2uiMarkdown(): Provider[] {
  return [
    {
      provide: MarkdownRenderer,
      useFactory: ngxMarkdownRenderer,
      deps: [MarkdownService],
    },
    {
      provide: MarkdownRendererV09,
      useFactory: ngxMarkdownRenderer,
      deps: [MarkdownService],
    },
  ];
}
