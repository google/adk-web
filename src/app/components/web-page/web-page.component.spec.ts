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
import {WebPageComponent} from './web-page.component';

describe('WebPageComponent', () => {
  let fixture: ComponentFixture<WebPageComponent>;

  beforeEach(async () => {
    initTestBed();
    await TestBed.configureTestingModule({
      imports: [WebPageComponent],
    }).compileComponents();
    fixture = TestBed.createComponent(WebPageComponent);
  });

  function text(selector: string): string|undefined {
    return fixture.nativeElement.querySelector(selector)
        ?.textContent.trim()
        .replace(/\s+/g, ' ');
  }

  it('shows the fetched page collapsed, with its URL and length', () => {
    fixture.componentRef.setInput('functionCall', {
      name: 'load_web_page',
      args: {url: 'https://example.com'},
    });
    fixture.componentRef.setInput('functionResponse', {
      name: 'load_web_page',
      response: {result: 'First line of the page.\nSecond line of the page.'},
    });
    fixture.detectChanges();

    const details = fixture.nativeElement.querySelector('details');
    expect(details.open).toBeFalse();
    expect(text('.web-page-title')).toBe('Fetched https://example.com');
    expect(text('.web-page-length')).toBe('2 lines');
    expect(fixture.nativeElement.querySelector('.web-page-text').textContent)
        .toBe('First line of the page.\nSecond line of the page.');
  });

  it('shows a failed fetch as an error', () => {
    fixture.componentRef.setInput('functionResponse', {
      name: 'load_web_page',
      response: {result: 'Failed to fetch url: http://localhost:9'},
    });
    fixture.detectChanges();

    expect(text('.terminal-error')).toBe('Failed to fetch url: http://localhost:9');
    expect(fixture.nativeElement.querySelector('details')).toBeNull();
  });
});
