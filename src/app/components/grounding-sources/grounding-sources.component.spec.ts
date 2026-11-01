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

import {ComponentFixture, TestBed} from '@angular/core/testing';
// 1p-ONLY-IMPORTS: import {beforeEach, describe, expect, it}

import {initTestBed} from '../../testing/utils';
import {GroundingSourcesComponent} from './grounding-sources.component';

describe('GroundingSourcesComponent', () => {
  let fixture: ComponentFixture<GroundingSourcesComponent>;

  beforeEach(async () => {
    initTestBed();
    await TestBed.configureTestingModule({
      imports: [GroundingSourcesComponent],
    }).compileComponents();
    fixture = TestBed.createComponent(GroundingSourcesComponent);
  });

  function texts(selector: string): string[] {
    return Array.from(
        fixture.nativeElement.querySelectorAll(selector) as
            NodeListOf<HTMLElement>,
        element => element.textContent!.trim().replace(/\s+/g, ' '));
  }

  it('lists the searches and the numbered sources with links', () => {
    fixture.componentRef.setInput('groundingMetadata', {
      webSearchQueries: ['what is ADK', 'ADK languages'],
      groundingChunks: [
        {web: {uri: 'https://google.github.io/adk-docs/', title: 'ADK docs', domain: 'google.github.io'}},
        {web: {uri: 'https://redirect.example/1', title: 'github.com', domain: 'github.com'}},
      ],
    });
    fixture.detectChanges();

    expect(texts('.grounding-query')).toEqual(['what is ADK', 'ADK languages']);
    expect(texts('.grounding-sources-header .grounding-label')).toEqual(['2 sources']);
    expect(texts('.grounding-sources li')).toEqual([
      'ADK docs google.github.io',
      'github.com',
    ]);
    const link = fixture.nativeElement.querySelector('.grounding-source-title');
    expect(link.getAttribute('href')).toBe('https://google.github.io/adk-docs/');
    expect(link.getAttribute('target')).toBe('_blank');
    expect(link.getAttribute('rel')).toBe('noopener noreferrer');
  });

  it('renders nothing without searches or sources', () => {
    fixture.componentRef.setInput('groundingMetadata', {
      searchEntryPoint: {renderedContent: '<div></div>'},
    });
    fixture.detectChanges();

    expect(fixture.nativeElement.querySelector('.grounding-card')).toBeNull();
  });
});
