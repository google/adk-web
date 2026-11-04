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

import {HttpClientTestingModule} from '@angular/common/http/testing';
import {ComponentFixture, fakeAsync, TestBed, tick,} from '@angular/core/testing';
import {MarkdownModule} from 'ngx-markdown';

import {initTestBed} from '../../testing/utils';
import {MarkdownComponent} from './markdown.component';

describe('MarkdownComponent', () => {
  let component: MarkdownComponent;
  let fixture: ComponentFixture<MarkdownComponent>;

  beforeEach(async () => {
    initTestBed();
    await TestBed
        .configureTestingModule({
          imports: [
            MarkdownComponent,
            HttpClientTestingModule,
            MarkdownModule.forRoot(),
          ],
        })
        .compileComponents();

    fixture = TestBed.createComponent(MarkdownComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('should display markdown text', fakeAsync(() => {
       fixture.componentRef.setInput('text', '**bold**');
       fixture.detectChanges();
       tick();
       const element: HTMLElement = fixture.nativeElement;
       expect(element.querySelector('markdown')).toBeTruthy();
       expect(element.querySelector('strong')?.textContent).toBe('bold');
     }));

  it('opens HTTP and HTTPS links in a new tab safely', fakeAsync(() => {
    fixture.componentRef.setInput('text', [
      '[HTTP](http://example.com)',
      '[HTTPS](https://example.com "Example")',
      '<https://example.com/auto>',
      'https://example.com/bare',
      '<a href="https://example.com/html" rel="nofollow">HTML</a>',
    ].join('\n\n'));
    fixture.detectChanges();
    tick(100);

    const links = fixture.nativeElement.querySelectorAll('a');
    expect(links.length).toBe(5);
    links.forEach((link: HTMLAnchorElement) => {
      expect(link.target).toBe('_blank');
      expect(link.relList.contains('noopener')).toBeTrue();
      expect(link.relList.contains('noreferrer')).toBeTrue();
    });
    expect(links[1].title).toBe('Example');
    expect(links[4].relList.contains('nofollow')).toBeTrue();
  }));

  it('preserves relative, fragment and email link behavior', fakeAsync(() => {
    fixture.componentRef.setInput('text',
        '[Relative](./guide) [Fragment](#section) [Email](mailto:help@example.com)');
    fixture.detectChanges();
    tick(100);

    const links = fixture.nativeElement.querySelectorAll('a');
    expect(links.length).toBe(3);
    links.forEach((link: HTMLAnchorElement) => {
      expect(link.hasAttribute('target')).toBeFalse();
      expect(link.hasAttribute('rel')).toBeFalse();
    });
  }));

  it('opens links added by subsequent message updates in a new tab', fakeAsync(() => {
    fixture.componentRef.setInput('text', 'Streaming response');
    fixture.detectChanges();
    tick(100);
    fixture.componentRef.setInput('text', 'Streaming response [link](https://example.com)');
    fixture.detectChanges();
    tick(100);

    const link: HTMLAnchorElement = fixture.nativeElement.querySelector('a');
    expect(link.target).toBe('_blank');
    expect(link.rel).toBe('noopener noreferrer');
  }));

  it('does not make unsafe links executable', fakeAsync(() => {
    fixture.componentRef.setInput('text', '[Unsafe](javascript:alert%281%29)');
    fixture.detectChanges();
    tick(100);

    const link: HTMLAnchorElement = fixture.nativeElement.querySelector('a');
    expect(link.getAttribute('href')).not.toMatch(/^javascript:/i);
    expect(link.hasAttribute('target')).toBeFalse();
  }));

  // Skipped: Thought styling removed in UI refactor
  xit('should apply italic style when thought is true', () => {
    fixture.componentRef.setInput('thought', true);
    fixture.detectChanges();
    const markdownElement: HTMLElement|null =
        fixture.nativeElement.querySelector('markdown');
    expect(markdownElement?.style.fontStyle).toBe('italic');
    expect(markdownElement?.style.color).toBe('rgb(154, 160, 166)');
  });

  // Skipped: Thought styling removed in UI refactor
  xit('should apply normal style when thought is false', () => {
    fixture.componentRef.setInput('thought', false);
    fixture.detectChanges();
    const markdownElement: HTMLElement|null =
        fixture.nativeElement.querySelector('markdown');
    expect(markdownElement?.style.fontStyle).toBe('normal');
    expect(markdownElement?.style.color).toBe('inherit');
  });
});
