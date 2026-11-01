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
import {TerminalOutputComponent} from './terminal-output.component';

describe('TerminalOutputComponent', () => {
  let fixture: ComponentFixture<TerminalOutputComponent>;

  beforeEach(async () => {
    initTestBed();
    await TestBed.configureTestingModule({
      imports: [TerminalOutputComponent],
    }).compileComponents();
    fixture = TestBed.createComponent(TerminalOutputComponent);
  });

  function query(selector: string): HTMLElement|null {
    return fixture.nativeElement.querySelector(selector);
  }

  it('shows stdout without trailing whitespace or color codes', () => {
    fixture.componentRef.setInput('stdout', '\x1b[32mok\x1b[0m\n\n');
    fixture.detectChanges();

    expect(query('.terminal-stdout')?.textContent).toBe('ok');
    expect(query('.terminal-empty')).toBeNull();
  });

  it('shows stderr, the tool error, and the status', () => {
    fixture.componentRef.setInput('stderr', 'warning');
    fixture.componentRef.setInput('error', 'Command timed out.');
    fixture.componentRef.setInput('status', 'Exit code 1');
    fixture.detectChanges();

    expect(query('.terminal-stdout')).toBeNull();
    expect(query('.terminal-stderr')?.textContent).toBe('warning');
    expect(query('.terminal-error')?.textContent).toBe('Command timed out.');
    expect(query('.terminal-status')?.textContent).toBe('Exit code 1');
  });

  it('shows a placeholder when there is no output', () => {
    fixture.componentRef.setInput('stdout', '\n');
    fixture.detectChanges();

    expect(query('.terminal-empty')?.textContent).toBe('(no output)');
    expect(query('.terminal-status')).toBeNull();
  });

  it('shows the last lines of long output until asked for all', () => {
    const lines = Array.from({length: 250}, (_, i) => `line ${i + 1}`);
    fixture.componentRef.setInput('stdout', lines.join('\n'));
    fixture.componentRef.setInput('stderr', 'warning');
    fixture.detectChanges();

    const stdout = query('.terminal-stdout')!.textContent!.split('\n');
    expect(stdout.length).toBe(200);
    expect(stdout[0]).toBe('line 51');
    expect(stdout[199]).toBe('line 250');
    expect(query('.terminal-stderr')?.textContent).toBe('warning');
    expect(query('.terminal-truncated')?.textContent)
        .toContain('50 earlier lines hidden.');
    expect(query('.terminal-show-all')?.textContent).toBe('Show all 251 lines');

    query('.terminal-show-all')!.click();
    fixture.detectChanges();

    expect(query('.terminal-stdout')!.textContent!.split('\n').length).toBe(250);
    expect(query('.terminal-truncated')).toBeNull();
  });

  it('applies the line limit to stdout and stderr separately', () => {
    fixture.componentRef.setInput('maxLines', 2);
    fixture.componentRef.setInput('stdout', 'a\nb');
    fixture.componentRef.setInput('stderr', 'x\ny\nz');
    fixture.detectChanges();

    expect(query('.terminal-stdout')?.textContent).toBe('a\nb');
    expect(query('.terminal-stderr')?.textContent).toBe('y\nz');
    expect(query('.terminal-truncated')?.textContent)
        .toContain('1 earlier line hidden.');
  });

  it('draws its own box unless boxed is false', () => {
    fixture.detectChanges();
    expect(query('.terminal-output-boxed')).not.toBeNull();

    fixture.componentRef.setInput('boxed', false);
    fixture.detectChanges();
    expect(query('.terminal-output')).not.toBeNull();
    expect(query('.terminal-output-boxed')).toBeNull();
  });
});
