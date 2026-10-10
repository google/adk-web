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
import {MARKDOWN_COMPONENT} from '../markdown/markdown.component.interface';
import {MockMarkdownComponent} from '../markdown/testing/mock-markdown.component';
import {FileEditComponent} from './file-edit.component';

describe('FileEditComponent', () => {
  let fixture: ComponentFixture<FileEditComponent>;

  beforeEach(async () => {
    initTestBed();
    await TestBed.configureTestingModule({
      imports: [FileEditComponent],
      providers: [{provide: MARKDOWN_COMPONENT, useValue: MockMarkdownComponent}],
    }).compileComponents();
    fixture = TestBed.createComponent(FileEditComponent);
  });

  function query(selector: string): HTMLElement|null {
    return fixture.nativeElement.querySelector(selector);
  }

  function lineTexts(): string[] {
    return Array.from(
        fixture.nativeElement.querySelectorAll('.diff-line') as
            NodeListOf<HTMLElement>,
        line => line.textContent!);
  }

  it('renders an EditFile call as a diff with the path and counts', () => {
    fixture.componentRef.setInput('functionCall', {
      name: 'EditFile',
      args: {
        path: 'src/app.py',
        old_string: 'def f():\n    return 1\n',
        new_string: 'def f():\n    """Returns 2."""\n    return 2\n',
      },
    });
    fixture.detectChanges();

    expect(query('.file-edit-path')?.textContent).toBe('src/app.py');
    expect(query('.file-edit-added-count')?.textContent).toBe('+2');
    expect(query('.file-edit-removed-count')?.textContent).toBe('-1');
    expect(lineTexts()).toEqual([
      ' def f():',
      '-    return 1',
      '+    """Returns 2."""',
      '+    return 2',
    ]);
    expect(query('.diff-removed .diff-text')?.textContent).toBe('    return 1');
    expect(query('app-terminal-output')).toBeNull();
  });

  it('folds long unchanged runs until they are opened', () => {
    const unchanged = Array.from({length: 10}, (_, i) => `line ${i}`);
    fixture.componentRef.setInput('functionCall', {
      name: 'EditFile',
      args: {
        path: 'a.txt',
        old_string: ['old', ...unchanged].join('\n'),
        new_string: ['new', ...unchanged].join('\n'),
      },
    });
    fixture.detectChanges();

    expect(lineTexts().length).toBe(5);
    const collapsed = query('.diff-collapsed')!;
    expect(collapsed.textContent).toContain('7 unchanged lines');

    collapsed.click();
    fixture.detectChanges();

    expect(query('.diff-collapsed')).toBeNull();
    expect(lineTexts().length).toBe(12);
    expect(lineTexts()[11]).toBe(' line 9');
  });

  it('renders the error of a failed edit', () => {
    fixture.componentRef.setInput('functionResponse', {
      name: 'EditFile',
      response: {status: 'error', error: '`old_string` not found in file.'},
    });
    fixture.detectChanges();

    expect(query('.terminal-error')?.textContent)
        .toBe('`old_string` not found in file.');
    expect(query('.file-edit')).toBeNull();
  });

  it('renders nothing for a successful edit response', () => {
    fixture.componentRef.setInput('functionResponse', {
      name: 'EditFile',
      response: {status: 'ok', message: 'Edited a.py'},
    });
    fixture.detectChanges();

    expect(fixture.nativeElement.textContent.trim()).toBe('');
  });

  it('renders a WriteFile call as added lines', () => {
    fixture.componentRef.setInput('functionCall', {
      name: 'WriteFile',
      args: {path: 'utils.py', content: 'def add(a, b):\n    return a + b\n'},
    });
    fixture.detectChanges();

    expect(query('.file-edit-path')?.textContent).toBe('utils.py');
    expect(query('.file-edit-icon')?.textContent).toBe('note_add');
    expect(query('.file-edit-added-count')?.textContent).toBe('+2');
    expect(query('.file-edit-removed-count')).toBeNull();
    expect(lineTexts()).toEqual(['+def add(a, b):', '+    return a + b']);
  });

  it('renders a ReadFile response collapsed, with its path and range', () => {
    fixture.componentRef.setInput('functionCall', {
      name: 'ReadFile',
      args: {path: 'app.py', start_line: 4, end_line: 5},
    });
    fixture.componentRef.setInput('functionResponse', {
      name: 'ReadFile',
      response: {
        status: 'ok',
        content: '     4\tdef f():\n     5\t    return 1\n',
        total_lines: 10,
      },
    });
    fixture.detectChanges();

    const details = query('details.file-read') as HTMLDetailsElement;
    expect(details.open).toBeFalse();
    expect(query('.file-edit-path')?.textContent).toBe('app.py');
    expect(query('.file-read-range')?.textContent).toBe('Lines 4-5 of 10');
    const gutter = Array.from(
        fixture.nativeElement.querySelectorAll('.file-read-gutter div') as
            NodeListOf<HTMLElement>,
        line => line.textContent);
    expect(gutter).toEqual(['4', '5']);
    expect(query('.file-read-code')?.textContent)
        .toContain('```python\ndef f():\n    return 1\n```');
    // The call is there for the read's path; it does not render as a diff.
    expect(query('.diff-line')).toBeNull();
  });

  it('counts the lines of a whole-file read', () => {
    fixture.componentRef.setInput('functionResponse', {
      name: 'ReadFile',
      response: {status: 'ok', content: '     1\tx = 1\n'},
    });
    fixture.detectChanges();

    expect(query('.file-edit-path')).toBeNull();
    expect(query('.file-read-range')?.textContent).toBe('1 line');
  });

  it('renders the error of a failed read', () => {
    fixture.componentRef.setInput('functionResponse', {
      name: 'ReadFile',
      response: {status: 'error', error: 'File not found: missing.py'},
    });
    fixture.detectChanges();

    expect(query('.terminal-error')?.textContent)
        .toBe('File not found: missing.py');
    expect(query('.file-read')).toBeNull();
  });
});
