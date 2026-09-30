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

import {provideHttpClient} from '@angular/common/http';
import {ComponentFixture, TestBed} from '@angular/core/testing';

import {UiEvent} from '../../core/models/UiEvent';
import {MediaType} from '../../core/models/types';
import {ARTIFACT_SERVICE} from '../../core/services/interfaces/artifact';
import {SAFE_VALUES_SERVICE} from '../../core/services/interfaces/safevalues';
import {initTestBed} from '../../testing/utils';
import {MARKDOWN_COMPONENT} from '../markdown/markdown.component.interface';
import {ContentBubbleComponent} from './content-bubble.component';

describe('ContentBubbleComponent', () => {
  let fixture: ComponentFixture<ContentBubbleComponent>;

  beforeEach(async () => {
    initTestBed();
    await TestBed.configureTestingModule({
      imports: [ContentBubbleComponent],
      providers: [
        provideHttpClient(),
        {provide: ARTIFACT_SERVICE, useValue: {}},
        {provide: SAFE_VALUES_SERVICE, useValue: {}},
        {provide: MARKDOWN_COMPONENT, useValue: class {}},
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(ContentBubbleComponent);
  });

  it('renders every inline image in a multi-part event', () => {
    const inlineDataParts = ['first', 'second'].map(data => ({
      mediaType: MediaType.IMAGE,
      data: `data:image/png;base64,${data}`,
      mimeType: 'image/png',
    }));

    fixture.componentRef.setInput('uiEvent', new UiEvent({
      role: 'bot',
      event: {} as any,
      inlineData: inlineDataParts[1],
      inlineDataParts,
    }));
    fixture.detectChanges();

    const images = Array.from(
        fixture.nativeElement.querySelectorAll('img.generated-image')) as
        HTMLImageElement[];
    expect(images.map(image => image.src)).toEqual(
        inlineDataParts.map(part => part.data));
  });

  it('keeps rendering legacy events with a single inlineData value', () => {
    const inlineData = {
      mediaType: MediaType.IMAGE,
      data: 'data:image/png;base64,AQ==',
      mimeType: 'image/png',
    };
    fixture.componentRef.setInput('uiEvent', new UiEvent({
      role: 'bot',
      event: {} as any,
      inlineData,
    }));
    fixture.detectChanges();

    const images = fixture.nativeElement.querySelectorAll('img.generated-image');
    expect(images.length).toBe(1);
    expect(images[0].src).toBe(inlineData.data);
  });
});
