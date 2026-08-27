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

import {MessageProcessor} from '@a2ui/angular/v0_8';
import {A2uiRendererService} from '@a2ui/angular/v0_9';
import {HttpClientTestingModule} from '@angular/common/http/testing';
import {Component} from '@angular/core';
import {ComponentFixture, TestBed} from '@angular/core/testing';
import {NoopAnimationsModule} from '@angular/platform-browser/animations';
// 1p-ONLY-IMPORTS: import {beforeEach, describe, expect, it}

import {UiEvent} from '../../core/models/UiEvent';
import {ARTIFACT_SERVICE} from '../../core/services/interfaces/artifact';
import {SAFE_VALUES_SERVICE} from '../../core/services/interfaces/safevalues';
import {MockArtifactService} from '../../core/services/testing/mock-artifact.service';
import {initTestBed} from '../../testing/utils';
import {CHAT_PANEL_MESSAGES, ChatPanelMessagesInjectionToken} from '../chat-panel/chat-panel.component.i18n';
import {MARKDOWN_COMPONENT} from '../markdown/markdown.component.interface';

import {ContentBubbleComponent} from './content-bubble.component';

@Component({selector: 'app-markdown', standalone: true, template: ''})
class MockMarkdownComponent {
  data = '';
}

describe('ContentBubbleComponent', () => {
  let component: ContentBubbleComponent;
  let fixture: ComponentFixture<ContentBubbleComponent>;

  beforeEach(async () => {
    initTestBed();

    // The two renderers are stubbed: this spec is about which canvas is
    // dispatched to, not what it draws. `getSurfaces` still needs a real Map --
    // the v0.8 canvas calls `.has()` on it during ngOnChanges.
    const mockMessageProcessor = jasmine.createSpyObj<MessageProcessor>(
        'MessageProcessor', ['processMessages', 'getSurfaces']);
    mockMessageProcessor.getSurfaces.and.returnValue(new Map());
    const mockRenderer = jasmine.createSpyObj<A2uiRendererService>(
        'A2uiRendererService', ['processMessages'],
        {surfaceGroup: {getSurface: () => undefined} as any});

    await TestBed
        .configureTestingModule({
          imports: [
            ContentBubbleComponent, NoopAnimationsModule, HttpClientTestingModule
          ],
          providers: [
            {
              provide: ChatPanelMessagesInjectionToken,
              useValue: CHAT_PANEL_MESSAGES
            },
            {provide: MARKDOWN_COMPONENT, useValue: MockMarkdownComponent},
            {
              provide: SAFE_VALUES_SERVICE,
              useValue: {bypassSecurityTrustHtml: (v: string) => v}
            },
            {provide: ARTIFACT_SERVICE, useValue: new MockArtifactService()},
            {provide: MessageProcessor, useValue: mockMessageProcessor},
            {provide: A2uiRendererService, useValue: mockRenderer},
          ],
        })
        .compileComponents();

    fixture = TestBed.createComponent(ContentBubbleComponent);
    component = fixture.componentInstance;
  });

  /** Renders a bot bubble carrying the given a2uiData. */
  const renderWith = (a2uiData: unknown) => {
    component.uiEvent =
        new UiEvent({role: 'bot', a2uiData, event: {id: 'e1'} as any});
    component.role = 'bot';
    fixture.detectChanges();
  };

  const canvasV08 = () =>
      fixture.nativeElement.querySelector('app-a2ui-canvas');
  const canvasV09 = () =>
      fixture.nativeElement.querySelector('app-a2ui-canvas-v09');

  it('should render only the v0.8 canvas for a v0.8 payload', () => {
    const beginRendering = {beginRendering: {surfaceId: 's1', root: 'root'}};
    renderWith({
      version: 'v0.8',
      messages: [beginRendering],
      surfaceId: 's1',
      beginRendering,
    });

    expect(canvasV08()).not.toBeNull();
    expect(canvasV09()).toBeNull();
  });

  it('should render only the v0.9 canvas for a v0.9 payload', () => {
    renderWith({
      version: 'v0.9',
      messages: [{version: 'v0.9', createSurface: {surfaceId: 's9'}}],
      surfaceId: 's9',
    });

    expect(canvasV09()).not.toBeNull();
    expect(canvasV08()).toBeNull();
  });

  it('should render neither canvas when there is no a2uiData', () => {
    renderWith(undefined);

    expect(canvasV08()).toBeNull();
    expect(canvasV09()).toBeNull();
  });

  it('should fall back to the v0.8 canvas for an untagged payload', () => {
    // Defensive: anything that is not explicitly v0.9 keeps the historical
    // rendering path.
    renderWith({beginRendering: {beginRendering: {surfaceId: 's1'}}});

    expect(canvasV08()).not.toBeNull();
    expect(canvasV09()).toBeNull();
  });
});
