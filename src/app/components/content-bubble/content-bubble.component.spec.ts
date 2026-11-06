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

import {HttpClientTestingModule} from '@angular/common/http/testing';
import {
  ComponentFixture,
  fakeAsync,
  flushMicrotasks,
  TestBed,
  tick,
} from '@angular/core/testing';
import {By} from '@angular/platform-browser';
import {NoopAnimationsModule} from '@angular/platform-browser/animations';
// 1p-ONLY-IMPORTS: import {beforeEach, describe, expect, it}

import {UiEvent} from '../../core/models/UiEvent';
import type {Event as AdkEvent} from '../../core/models/types';
import {ARTIFACT_SERVICE} from '../../core/services/interfaces/artifact';
import {SAFE_VALUES_SERVICE} from '../../core/services/interfaces/safevalues';
import {MockArtifactService} from '../../core/services/testing/mock-artifact.service';
import {MockSafeValuesService} from '../../core/services/testing/mock-safevalues.service';
import {initTestBed} from '../../testing/utils';
import {
  CHAT_PANEL_MESSAGES,
  ChatPanelMessagesInjectionToken,
} from '../chat-panel/chat-panel.component.i18n';
import {MARKDOWN_COMPONENT} from '../markdown/markdown.component.interface';
import {MockMarkdownComponent} from '../markdown/testing/mock-markdown.component';
import {ContentBubbleComponent} from './content-bubble.component';

describe('ContentBubbleComponent', () => {
  let component: ContentBubbleComponent;
  let fixture: ComponentFixture<ContentBubbleComponent>;
  let clipboard: {writeText: jasmine.Spy};

  const copyButton = () =>
      fixture.debugElement.query(By.css('.copy-message-button'));

  const createUiEvent = (init: Partial<UiEvent>) => new UiEvent({
    role: 'bot',
    event: {id: 'event-1'} as AdkEvent,
    ...init,
  });

  beforeEach(async () => {
    initTestBed();

    clipboard = {writeText: jasmine.createSpy('writeText')};
    clipboard.writeText.and.returnValue(Promise.resolve());
    Object.defineProperty(navigator, 'clipboard', {
      value: clipboard,
      configurable: true,
    });

    await TestBed.configureTestingModule({
      imports: [
        ContentBubbleComponent,
        HttpClientTestingModule,
        NoopAnimationsModule,
      ],
      providers: [
        {
          provide: ChatPanelMessagesInjectionToken,
          useValue: CHAT_PANEL_MESSAGES,
        },
        {provide: MARKDOWN_COMPONENT, useValue: MockMarkdownComponent},
        {provide: SAFE_VALUES_SERVICE, useClass: MockSafeValuesService},
        {provide: ARTIFACT_SERVICE, useClass: MockArtifactService},
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(ContentBubbleComponent);
    component = fixture.componentInstance;
  });

  it('renders a copy button for a response with text', () => {
    component.uiEvent = createUiEvent({text: 'Hello world'});
    fixture.detectChanges();

    expect(copyButton()).toBeTruthy();
    expect(copyButton().nativeElement.getAttribute('aria-label'))
        .toBe(CHAT_PANEL_MESSAGES.copyMessageTooltip);
    expect(copyButton().query(By.css('mat-icon')).nativeElement.textContent)
        .toContain('content_copy');
  });

  it('copies the response text and shows a check while copied', fakeAsync(() => {
       component.uiEvent = createUiEvent({text: 'Hello world'});
       fixture.detectChanges();

       copyButton().nativeElement.click();
       flushMicrotasks();
       fixture.detectChanges();

       expect(clipboard.writeText).toHaveBeenCalledWith('Hello world');
       expect(copyButton().query(By.css('mat-icon')).nativeElement.textContent)
           .toContain('check');

       tick(2000);
       flushMicrotasks();
       fixture.detectChanges();

       expect(copyButton().query(By.css('mat-icon')).nativeElement.textContent)
           .toContain('content_copy');
     }));

  it('copies every text part of a multi-part response', fakeAsync(() => {
       component.uiEvent = createUiEvent({
         textParts: [{text: 'First'}, {text: '', thought: true}, {text: 'Second'}],
       });
       fixture.detectChanges();

       copyButton().nativeElement.click();
       flushMicrotasks();

       expect(clipboard.writeText).toHaveBeenCalledWith('First\n\nSecond');
     }));

  it('does not render a copy button when there is no text', () => {
    component.uiEvent = createUiEvent({
      inlineData: {
        mediaType: 'image',
        data: 'data:image/png;base64,AAAA',
        name: 'image.png',
        mimeType: 'image/png',
      },
    });
    fixture.detectChanges();

    expect(copyButton()).toBeNull();
  });

  it('does not render a copy button while the message is edited', () => {
    component.uiEvent = createUiEvent({text: 'Hello world', isEditing: true});
    fixture.detectChanges();

    expect(copyButton()).toBeNull();
  });
});
