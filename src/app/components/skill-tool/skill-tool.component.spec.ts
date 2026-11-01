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

import type {FunctionResponse} from '../../core/models/types';
import {initTestBed} from '../../testing/utils';
import {MARKDOWN_COMPONENT} from '../markdown/markdown.component.interface';
import {MockMarkdownComponent} from '../markdown/testing/mock-markdown.component';
import {SkillToolComponent} from './skill-tool.component';

describe('SkillToolComponent', () => {
  let fixture: ComponentFixture<SkillToolComponent>;

  beforeEach(async () => {
    initTestBed();
    await TestBed.configureTestingModule({
      imports: [SkillToolComponent],
      providers: [{provide: MARKDOWN_COMPONENT, useValue: MockMarkdownComponent}],
    }).compileComponents();
    fixture = TestBed.createComponent(SkillToolComponent);
  });

  function render(functionResponse: FunctionResponse) {
    fixture.componentRef.setInput('functionResponse', functionResponse);
    fixture.detectChanges();
  }

  function text(selector: string): string|undefined {
    return fixture.nativeElement.querySelector(selector)
        ?.textContent.trim()
        .replace(/\s+/g, ' ');
  }

  it('lists the available skills', () => {
    render({
      name: 'list_skills',
      response: {
        result: '<available_skills>\n<skill>\n<name>\ncalc\n</name>\n' +
            '<description>\nDoes math.\n</description>\n</skill>\n</available_skills>',
      },
    });

    expect(text('.skill-title')).toBe('1 skill available');
    expect(text('.skill-list li')).toBe('calc Does math.');
  });

  it('shows the loaded skill with its instructions collapsed', () => {
    render({
      name: 'load_skill',
      response: {
        skill_name: 'text-skill',
        instructions: 'Use format.sh.',
        frontmatter: {description: 'Formats text.'},
      },
    });

    expect(text('.skill-title')).toBe('Loaded skill text-skill');
    expect(text('.skill-description')).toBe('Formats text.');
    const details = fixture.nativeElement.querySelector('details');
    expect(details.open).toBeFalse();
    expect(text('summary')).toBe('Instructions');
    expect(text('.skill-instructions')).toContain('Use format.sh.');
  });

  it('shows the resource that was read as a fenced code block', () => {
    render({
      name: 'load_skill_resource',
      response: {
        skill_name: 'text-skill',
        file_path: 'scripts/format.sh',
        content: 'echo hi\necho bye\n',
      },
    });

    expect(text('.skill-title')).toBe('Read scripts/format.sh from text-skill');
    expect(text('summary')).toBe('2 lines');
    expect(text('.skill-resource')).toContain('```bash');
  });

  it('says when a resource is binary', () => {
    render({
      name: 'load_skill_resource',
      response: {skill_name: 's', file_path: 'assets/a.png', status: 'binary'},
    });

    expect(text('.skill-description')).toBe('Binary file, not shown.');
    expect(fixture.nativeElement.querySelector('details')).toBeNull();
  });

  it('shows the unloaded skill and what stays active', () => {
    render({
      name: 'unload_skill',
      response: {skill_name: 'a', unloaded: true, active_skills: ['b', 'c']},
    });

    expect(text('.skill-title')).toBe('Unloaded skill a');
    expect(text('.skill-description')).toBe('Still active: b, c');
  });

  it('shows the error a skill tool reported', () => {
    render({
      name: 'load_skill',
      response: {error: 'Skill \'x\' not found.', error_code: 'SKILL_NOT_FOUND'},
    });

    expect(text('.terminal-error')).toBe('Skill \'x\' not found.');
    expect(fixture.nativeElement.querySelector('.skill-card')).toBeNull();
  });
});
