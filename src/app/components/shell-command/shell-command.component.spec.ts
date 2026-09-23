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
import {ShellCommandComponent} from './shell-command.component';

describe('ShellCommandComponent', () => {
  let fixture: ComponentFixture<ShellCommandComponent>;

  beforeEach(async () => {
    initTestBed();
    await TestBed.configureTestingModule({
      imports: [ShellCommandComponent],
    }).compileComponents();
    fixture = TestBed.createComponent(ShellCommandComponent);
  });

  function query(selector: string): HTMLElement|null {
    return fixture.nativeElement.querySelector(selector);
  }

  it('renders a function call as a prompt line', () => {
    fixture.componentRef.setInput(
        'functionCall', {name: 'Execute', args: {command: 'echo hi'}});
    fixture.detectChanges();

    expect(query('.shell-command-line')?.textContent).toBe('$ echo hi');
    expect(query('.shell-token-command')?.textContent).toBe('echo');
    expect(query('.shell-token-arg')?.textContent).toBe('hi');
    expect(query('.shell-output')).toBeNull();
  });

  it('renders a function response as the command output', () => {
    fixture.componentRef.setInput('functionResponse', {
      name: 'Execute',
      response: {status: 'ok', stdout: 'hi\n'},
    });
    fixture.detectChanges();

    expect(query('.shell-stdout')?.textContent).toBe('hi');
    expect(query('.shell-stderr')).toBeNull();
    expect(query('.shell-status')).toBeNull();
    expect(query('.shell-command')).toBeNull();
  });

  it('shows stderr, tool errors, and a non-zero exit code', () => {
    fixture.componentRef.setInput('functionResponse', {
      name: 'execute_bash',
      response: {
        stdout: '<no stdout captured>',
        stderr: 'ls: cannot access',
        returncode: 2,
      },
    });
    fixture.detectChanges();

    expect(query('.shell-stdout')).toBeNull();
    expect(query('.shell-stderr')?.textContent).toBe('ls: cannot access');
    expect(query('.shell-status')?.textContent).toBe('Exit code 2');
  });

  it('shows the tool error when the command did not run', () => {
    fixture.componentRef.setInput('functionResponse', {
      name: 'execute_bash',
      response: {error: 'This tool call is rejected.'},
    });
    fixture.detectChanges();

    expect(query('.shell-error')?.textContent)
        .toBe('This tool call is rejected.');
    expect(query('.shell-empty')).toBeNull();
  });

  it('shows a placeholder when the command printed nothing', () => {
    fixture.componentRef.setInput('functionResponse', {
      name: 'Execute',
      response: {status: 'ok'},
    });
    fixture.detectChanges();

    expect(query('.shell-empty')?.textContent).toBe('(no output)');
  });

  it('marks timed out commands', () => {
    fixture.componentRef.setInput('functionResponse', {
      name: 'run_skill_script',
      response: {stdout: 'partial', stderr: '', exit_code: -1, timed_out: true},
    });
    fixture.detectChanges();

    expect(query('.shell-status')?.textContent).toBe('Timed out');
  });
});
