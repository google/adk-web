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

// 1p-ONLY-IMPORTS: import {beforeEach, describe, expect, it}
import {initTestBed} from '../../testing/utils';
import {ComponentFixture, TestBed} from '@angular/core/testing';
import {HttpClient} from '@angular/common/http';
import {ContentBubbleComponent} from './content-bubble.component';
import {ARTIFACT_SERVICE} from '../../core/services/interfaces/artifact';
import {SAFE_VALUES_SERVICE} from '../../core/services/interfaces/safevalues';
import {MockSafeValuesService} from '../../core/services/testing/mock-safevalues.service';
import {MARKDOWN_COMPONENT} from '../markdown/markdown.component.interface';
import {ChatPanelMessagesInjectionToken} from '../chat-panel/chat-panel.component.i18n';

describe('ContentBubbleComponent', () => {
  let component: ContentBubbleComponent;

  beforeEach(async () => {
    initTestBed();  // required for 1p compat
    await TestBed.configureTestingModule({
      imports: [ContentBubbleComponent],
      providers: [
        {provide: HttpClient, useValue: {}},
        {
          provide: ARTIFACT_SERVICE,
          useValue: jasmine.createSpyObj('ArtifactService', ['loadArtifact']),
        },
        {provide: SAFE_VALUES_SERVICE, useClass: MockSafeValuesService},
        {
          provide: MARKDOWN_COMPONENT,
          useValue: class MockMarkdownComponent {},
        },
        {provide: ChatPanelMessagesInjectionToken, useValue: {}},
      ],
    }).compileComponents();

    const fixture = TestBed.createComponent(ContentBubbleComponent);
    component = fixture.componentInstance;
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  describe('getTextContent', () => {
    const toDataUrl = (text: string) => {
      const base64 = btoa(
        String.fromCharCode(...new TextEncoder().encode(text)),
      );
      return `data:text/plain;base64,${base64}`;
    };

    it('should decode multibyte UTF-8 content without garbling it', () => {
      const text = 'こんにちは 🌙 报告';
      expect(component['getTextContent'](toDataUrl(text))).toBe(text);
    });

    it('should still decode ASCII content', () => {
      const text = 'Hello, world!';
      expect(component['getTextContent'](toDataUrl(text))).toBe(text);
    });

    it('should return an empty string for a data URL without a comma', () => {
      expect(component['getTextContent']('no-comma-here')).toBe('');
    });

    it('should return an empty string for an empty data URL', () => {
      expect(component['getTextContent']('')).toBe('');
    });
  });
});
