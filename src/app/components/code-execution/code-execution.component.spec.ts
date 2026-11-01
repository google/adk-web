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
import {CodeExecutionComponent} from './code-execution.component';

describe('CodeExecutionComponent', () => {
  let fixture: ComponentFixture<CodeExecutionComponent>;

  beforeEach(async () => {
    initTestBed();
    await TestBed.configureTestingModule({
      imports: [CodeExecutionComponent],
      providers: [{provide: MARKDOWN_COMPONENT, useValue: MockMarkdownComponent}],
    }).compileComponents();
    fixture = TestBed.createComponent(CodeExecutionComponent);
  });

  function query(selector: string): HTMLElement|null {
    return fixture.nativeElement.querySelector(selector);
  }

  function lineNumbers(): string[] {
    return Array.from(
        fixture.nativeElement.querySelectorAll('.code-editor-gutter div'),
        (line: Element) => line.textContent?.trim() ?? '');
  }

  it('renders code in an editor with a language tab and line numbers', () => {
    fixture.componentRef.setInput(
        'executableCode',
        {code: 'for v in values:\n    print(v)\n', language: 'PYTHON'});
    fixture.detectChanges();

    expect(query('.code-editor-language')?.textContent).toBe('Python');
    expect(lineNumbers()).toEqual(['1', '2']);
    expect(query('.mock-markdown-content')?.textContent?.trim())
        .toBe('```python\nfor v in values:\n    print(v)\n```');
    expect(query('.code-output')).toBeNull();
  });

  it('labels code without a language as plain code', () => {
    fixture.componentRef.setInput('executableCode', {code: 'x = 1'});
    fixture.detectChanges();

    expect(query('.code-editor-language')?.textContent).toBe('Code');
    expect(query('.mock-markdown-content')?.textContent?.trim())
        .toBe('```\nx = 1\n```');
  });

  it('renders a result in an output panel with a status badge', () => {
    fixture.componentRef.setInput('codeExecutionResult', {
      outcome: 'OUTCOME_OK',
      output: 'Code execution result:\ncount: 10\n',
    });
    fixture.detectChanges();

    expect(query('.code-editor')).toBeNull();
    expect(query('.code-output-status')?.textContent).toContain('Succeeded');
    expect(query('.terminal-stdout')?.textContent).toBe('count: 10');
  });

  it('attaches the output below the editor when both are given', () => {
    fixture.componentRef.setInput(
        'executableCode', {code: 'print(1)', language: 'PYTHON'});
    fixture.componentRef.setInput(
        'codeExecutionResult', {outcome: 'OUTCOME_OK', output: '1\n'});
    fixture.detectChanges();

    const run = query('.code-run');
    expect(run?.querySelector('.code-editor + .code-output')).toBeTruthy();
  });

  it('shows a failed run as stderr with a Failed badge', () => {
    fixture.componentRef.setInput('codeExecutionResult', {
      outcome: 'FAILED',
      output: 'ZeroDivisionError: division by zero',
    });
    fixture.detectChanges();

    expect(query('.terminal-stdout')).toBeNull();
    expect(query('.terminal-stderr')?.textContent)
        .toBe('ZeroDivisionError: division by zero');
    expect(query('.code-output-status.status-failed')?.textContent)
        .toContain('Failed');
  });

  it('marks runs that exceeded the deadline', () => {
    fixture.componentRef.setInput(
        'codeExecutionResult',
        {outcome: 'OUTCOME_DEADLINE_EXCEEDED', output: 'partial'});
    fixture.detectChanges();

    expect(query('.terminal-stdout')?.textContent).toBe('partial');
    expect(query('.code-output-status.status-timeout')?.textContent)
        .toContain('Timed out');
  });

  it('shows no badge when the outcome is unknown', () => {
    fixture.componentRef.setInput(
        'codeExecutionResult', {outcome: 'OUTCOME_UNSPECIFIED', output: 'x'});
    fixture.detectChanges();

    expect(query('.code-output-status')).toBeNull();
  });

  it('shows a placeholder when the code printed nothing', () => {
    fixture.componentRef.setInput(
        'codeExecutionResult',
        {outcome: 'OUTCOME_OK', output: 'Code execution result:\n\n'});
    fixture.detectChanges();

    expect(query('.terminal-empty')?.textContent).toBe('(no output)');
  });
});
