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


import {Catalog, DEFAULT_CATALOG, MessageProcessor, Theme} from '@a2ui/angular/v0_8';
import type {ServerToClientMessage} from '@a2ui/web_core/v0_8';
import {ComponentFixture, TestBed} from '@angular/core/testing';
import {provideMarkdown} from 'ngx-markdown';
// 1p-ONLY-IMPORTS: import {beforeEach, describe, expect, it}

import {A2UI_THEME} from '../../core/constants/a2ui-theme';
import {initTestBed} from '../../testing/utils';

import {A2uiCanvasComponent} from './a2ui-canvas.component';
import {provideA2uiMarkdown} from './a2ui-canvas.markdown';

describe('A2uiCanvas Markdown Rendering', () => {
  let component: A2uiCanvasComponent;
  let fixture: ComponentFixture<A2uiCanvasComponent>;

  beforeEach(async () => {
    initTestBed();

    await TestBed
        .configureTestingModule({
          imports: [A2uiCanvasComponent],
          providers: [
            MessageProcessor,
            {provide: Catalog, useValue: DEFAULT_CATALOG},
            {provide: Theme, useValue: A2UI_THEME},
            // This is the gist of the markdown integration!
            provideMarkdown(),
            provideA2uiMarkdown(),
          ],
        })
        .compileComponents();

    fixture = TestBed.createComponent(A2uiCanvasComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should render markdown "### Something" as an <h3> element', async () => {
    const surfaceId = 'markdown-heading-surface';
    const beginRendering = {
      beginRendering: {surfaceId, root: 'heading-comp'},
    } as unknown as ServerToClientMessage;

    const surfaceUpdate = {
      surfaceUpdate: {
        surfaceId,
        components: [
          {
            id: 'heading-comp',
            component: {
              Text: {
                text: {literalString: '### Something'},
              },
            },
          },
        ],
      },
    } as unknown as ServerToClientMessage;

    component.beginRendering = beginRendering;
    component.surfaceUpdate = surfaceUpdate;

    component.ngOnChanges({
      beginRendering: {
        currentValue: beginRendering,
        previousValue: null,
        firstChange: true,
        isFirstChange: () => true,
      },
      surfaceUpdate: {
        currentValue: surfaceUpdate,
        previousValue: null,
        firstChange: true,
        isFirstChange: () => true,
      },
    });

    fixture.detectChanges();
    await fixture.whenStable();
    fixture.detectChanges();

    const h3Element = fixture.nativeElement.querySelector('h3');
    expect(h3Element).toBeTruthy();
    expect(h3Element?.textContent?.trim()).toBe('Something');
  });
});
