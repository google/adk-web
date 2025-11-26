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

import {MarkdownComponent} from './markdown.component';

describe('MarkdownComponent', () => {
  let component: MarkdownComponent;
  let fixture: ComponentFixture<MarkdownComponent>;

  beforeEach(async () => {
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

  it('should apply italic style when thought is true', () => {
    fixture.componentRef.setInput('thought', true);
    fixture.detectChanges();
    const markdownElement: HTMLElement|null =
        fixture.nativeElement.querySelector('markdown');
    expect(markdownElement?.style.fontStyle).toBe('italic');
    expect(markdownElement?.style.color).toBe('rgb(154, 160, 166)');
  });

  it('should apply normal style when thought is false', () => {
    fixture.componentRef.setInput('thought', false);
    fixture.detectChanges();
    const markdownElement: HTMLElement|null =
        fixture.nativeElement.querySelector('markdown');
    expect(markdownElement?.style.fontStyle).toBe('normal');
    expect(markdownElement?.style.color).toBe('inherit');
  });
});
