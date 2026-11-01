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
import {MatDialog} from '@angular/material/dialog';
import {By} from '@angular/platform-browser';
import {NoopAnimationsModule} from '@angular/platform-browser/animations';
// 1p-ONLY-IMPORTS: import {beforeEach, describe, expect, it}

import type {Event as AdkEvent} from '../../core/models/types';
import {UiEvent} from '../../core/models/UiEvent';
import {initTestBed} from '../../testing/utils';
import {ChatPanelMessagesInjectionToken, CHAT_PANEL_MESSAGES} from '../chat-panel/chat-panel.component.i18n';
import {MARKDOWN_COMPONENT} from '../markdown/markdown.component.interface';
import {MockMarkdownComponent} from '../markdown/testing/mock-markdown.component';
import {EventContentComponent} from './event-content.component';

describe('EventContentComponent', () => {
  let component: EventContentComponent;
  let fixture: ComponentFixture<EventContentComponent>;

  beforeEach(async () => {
    initTestBed();

    await TestBed.configureTestingModule({
      imports: [EventContentComponent, NoopAnimationsModule],
      providers: [
        {
          provide: ChatPanelMessagesInjectionToken,
          useValue: CHAT_PANEL_MESSAGES,
        },
        {
          provide: MatDialog,
          useValue: {open: () => ({afterClosed: () => ({subscribe: () => {}})})},
        },
        {provide: MARKDOWN_COMPONENT, useValue: MockMarkdownComponent},
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(EventContentComponent);
    component = fixture.componentInstance;
  });

  describe('Voice Activity Events', () => {
    it('renders Voice Activity Start chip with mic icon and tooltip', () => {
      component.uiEvent = new UiEvent({
        role: 'bot',
        event: {
          id: 'vad-start-1',
          voiceActivity: {
            voiceActivityType: 'ACTIVITY_START',
            audioOffset: '1.5s',
          },
        } as any,
      });
      component.index = 0;
      fixture.detectChanges();

      const buttons = fixture.debugElement.queryAll(By.css('app-hover-info-button'));
      const startBtn = buttons.find(b => b.componentInstance.text === 'Voice Activity Start');
      expect(startBtn).toBeTruthy();
      expect(startBtn?.componentInstance.icon).toBe('mic');
      expect(startBtn?.componentInstance.tooltipContent).toBe('Started at 1.5s');
    });

    it('renders Voice Activity End chip with mic_off icon and tooltip', () => {
      component.uiEvent = new UiEvent({
        role: 'bot',
        event: {
          id: 'vad-end-1',
          voiceActivity: {
            voiceActivityType: 'ACTIVITY_END',
            audioOffset: '3.2s',
          },
        } as any,
      });
      component.index = 1;
      fixture.detectChanges();

      const buttons = fixture.debugElement.queryAll(By.css('app-hover-info-button'));
      const endBtn = buttons.find(b => b.componentInstance.text === 'Voice Activity End');
      expect(endBtn).toBeTruthy();
      expect(endBtn?.componentInstance.icon).toBe('mic_off');
      expect(endBtn?.componentInstance.tooltipContent).toBe('Ended at 3.2s');
    });

    it('renders default tooltip when audio offset is missing', () => {
      component.uiEvent = new UiEvent({
        role: 'bot',
        event: {
          id: 'vad-start-2',
          voiceActivity: {
            voiceActivityType: 'ACTIVITY_START',
          },
        } as any,
      });
      component.index = 0;
      fixture.detectChanges();

      const buttons = fixture.debugElement.queryAll(By.css('app-hover-info-button'));
      const startBtn = buttons.find(b => b.componentInstance.text === 'Voice Activity Start');
      expect(startBtn?.componentInstance.tooltipContent).toBe('Started');
    });
  });

  describe('Shell commands', () => {
    it('renders a shell command call under its function call chip', () => {
      component.uiEvent = new UiEvent({
        role: 'bot',
        event: {id: 'call-1'} as AdkEvent,
        functionCalls: [
          {id: 'fc-1', name: 'Execute', args: {command: 'echo hi'}},
          {id: 'fc-2', name: 'get_weather', args: {city: 'Paris'}},
        ],
      });
      component.index = 0;
      fixture.detectChanges();

      const shellCommands = fixture.debugElement.queryAll(By.css('app-shell-command'));
      expect(shellCommands.length).toBe(1);
      expect(shellCommands[0].nativeElement.textContent).toContain('$ echo hi');

      const chipTexts = fixture.debugElement.queryAll(By.css('app-hover-info-button'))
                            .map(b => b.componentInstance.text);
      expect(chipTexts).toEqual(['Execute("echo hi")', 'get_weather("Paris")']);
    });

    it('renders a shell command response as output under its chip', () => {
      component.uiEvent = new UiEvent({
        role: 'bot',
        event: {id: 'response-1'} as AdkEvent,
        functionResponses: [
          {id: 'fc-1', name: 'Execute', response: {status: 'ok', stdout: 'hi\n'}},
        ],
      });
      component.index = 1;
      fixture.detectChanges();

      const chip = fixture.debugElement.query(By.css('.function-response-chip-container'));
      expect(chip.query(By.css('app-hover-info-button')).componentInstance.text)
          .toBe('Execute');
      expect(chip.query(By.css('.menu-trigger-btn'))).toBeTruthy();

      const output = fixture.debugElement.query(By.css('app-shell-command'));
      expect(output.nativeElement.textContent).toContain('hi');
      // The output comes right after the chip, so it renders underneath it.
      expect(chip.nativeElement.nextElementSibling).toBe(output.nativeElement);
    });
  });

  describe('Code execution', () => {
    it('renders a result sent in its own event under the chips', () => {
      const codeExecutionResult = {outcome: 'OUTCOME_OK' as const, output: '42\n'};
      component.uiEvent = new UiEvent({
        role: 'bot',
        event: {
          id: 'result-1',
          actions: {stateDelta: {'_code_execution_context': {}}},
        } as AdkEvent,
        codeExecutionResult,
        codeExecutionSegments: [{kind: 'result', codeExecutionResult}],
      });
      component.index = 0;
      fixture.detectChanges();

      expect(fixture.debugElement.query(By.css('app-content-bubble'))).toBeNull();
      const chips = fixture.debugElement.query(By.css('.event-chips-container'));
      expect(chips.query(By.css('app-hover-info-button')).componentInstance.text)
          .toBe('State: _code_execution_context');
      const result = fixture.debugElement.query(By.css('app-code-execution'));
      expect(result.nativeElement.textContent).toContain('42');
      expect(chips.nativeElement.nextElementSibling).toBe(result.nativeElement);
    });

    it('keeps code and results that follow it in the message card', () => {
      const uiEvent = new UiEvent({
        role: 'bot',
        event: {id: 'code-1'} as AdkEvent,
        executableCode: {code: 'print(42)', language: 'PYTHON'},
        codeExecutionResult: {outcome: 'OUTCOME_OK', output: '42\n'},
        codeExecutionSegments: [
          {kind: 'code', executableCode: {code: 'print(42)', language: 'PYTHON'}},
          {
            kind: 'result',
            codeExecutionResult: {outcome: 'OUTCOME_OK', output: '42\n'},
          },
        ],
      });

      expect(component.shouldShowMessageCard(uiEvent)).toBeTrue();
      expect(component.getStandaloneCodeResults(uiEvent)).toEqual([]);
    });
  });

  describe('File edits', () => {
    it('renders an EditFile call as a diff under its chip', () => {
      component.uiEvent = new UiEvent({
        role: 'bot',
        event: {id: 'edit-call'} as AdkEvent,
        functionCalls: [{
          id: 'fc-1',
          name: 'EditFile',
          args: {path: 'app.py', old_string: 'a = 1\n', new_string: 'a = 2\n'},
        }],
      });
      component.index = 0;
      fixture.detectChanges();

      const edit = fixture.debugElement.query(By.css('app-file-edit'));
      expect(edit.query(By.css('.file-edit-path')).nativeElement.textContent)
          .toBe('app.py');
      expect(edit.queryAll(By.css('.diff-line')).length).toBe(2);
    });

    it('renders a failed edit as an error under its response chip', () => {
      component.uiEvent = new UiEvent({
        role: 'bot',
        event: {id: 'edit-response'} as AdkEvent,
        functionResponses: [{
          id: 'fc-1',
          name: 'EditFile',
          response: {status: 'error', error: 'File not found: app.py'},
        }],
      });
      component.index = 1;
      fixture.detectChanges();

      const chip = fixture.debugElement.query(By.css('.function-response-chip-container'));
      const edit = fixture.debugElement.query(By.css('app-file-edit'));
      expect(edit.nativeElement.textContent).toContain('File not found: app.py');
      expect(chip.nativeElement.nextElementSibling).toBe(edit.nativeElement);
    });

    it('renders a read under its response chip, with the path from its call', () => {
      const readCall = new UiEvent({
        role: 'bot',
        event: {id: 'read-call'} as AdkEvent,
        functionCalls: [{
          id: 'fc-read',
          name: 'ReadFile',
          args: {path: 'app.py', start_line: 4, end_line: 4},
        }],
      });
      component.uiEvent = new UiEvent({
        role: 'bot',
        event: {id: 'read-response'} as AdkEvent,
        functionResponses: [{
          id: 'fc-read',
          name: 'ReadFile',
          response: {status: 'ok', content: '     4\tx = 1\n', total_lines: 9},
        }],
      });
      component.uiEvents = [readCall, component.uiEvent];
      component.index = 1;
      fixture.detectChanges();

      const chip = fixture.debugElement.query(By.css('.function-response-chip-container'));
      const read = fixture.debugElement.query(By.css('app-file-edit'));
      expect(chip.nativeElement.nextElementSibling).toBe(read.nativeElement);
      expect(read.query(By.css('.file-edit-path')).nativeElement.textContent)
          .toBe('app.py');
      expect(read.query(By.css('.file-read-range')).nativeElement.textContent)
          .toBe('Lines 4-4 of 9');
    });

    it('shows the path in the ReadFile chip when a range is passed', () => {
      expect(component.getFunctionCallButtonText({
        name: 'ReadFile',
        args: {path: 'app.py', start_line: 4, end_line: 6},
      })).toBe('ReadFile("app.py", …)');
    });

    it('renders nothing extra for a successful edit response', () => {
      component.uiEvent = new UiEvent({
        role: 'bot',
        event: {id: 'edit-ok'} as AdkEvent,
        functionResponses: [{
          id: 'fc-1',
          name: 'EditFile',
          response: {status: 'ok', message: 'Edited app.py'},
        }],
      });
      component.index = 1;
      fixture.detectChanges();

      expect(fixture.debugElement.query(By.css('app-file-edit'))).toBeNull();
    });
  });

  describe('Skills', () => {
    it('renders a skill tool response under its chip', () => {
      component.uiEvent = new UiEvent({
        role: 'bot',
        event: {id: 'skill-response'} as AdkEvent,
        functionResponses: [{
          id: 'fc-1',
          name: 'load_skill',
          response: {
            skill_name: 'text-skill',
            instructions: 'Use format.sh.',
            frontmatter: {description: 'Formats text.'},
          },
        }],
      });
      component.index = 1;
      fixture.detectChanges();

      const chip = fixture.debugElement.query(By.css('.function-response-chip-container'));
      const skill = fixture.debugElement.query(By.css('app-skill-tool'));
      expect(skill.nativeElement.textContent).toContain('Loaded skill');
      expect(chip.nativeElement.nextElementSibling).toBe(skill.nativeElement);
    });

    it('shows the resource path in the load_skill_resource chip', () => {
      expect(component.getFunctionCallButtonText({
        name: 'load_skill_resource',
        args: {skill_name: 'text-skill', file_path: 'scripts/format.sh'},
      })).toBe('load_skill_resource("scripts/format.sh", …)');
    });
  });

  describe('Web and search', () => {
    it('renders the sources of a grounded response', () => {
      component.uiEvent = new UiEvent({
        role: 'bot',
        event: {
          id: 'grounded',
          groundingMetadata: {
            webSearchQueries: ['what is ADK'],
            groundingChunks: [{web: {uri: 'https://example.com/', title: 'Example'}}],
          },
        } as AdkEvent,
      });
      component.index = 0;
      fixture.detectChanges();

      const sources = fixture.debugElement.query(By.css('app-grounding-sources'));
      expect(sources.nativeElement.textContent).toContain('what is ADK');
      expect(sources.nativeElement.textContent).toContain('Example');
    });

    it('renders nothing for a response without grounding', () => {
      component.uiEvent = new UiEvent({
        role: 'bot',
        event: {id: 'plain'} as AdkEvent,
      });
      component.index = 0;
      fixture.detectChanges();

      expect(fixture.debugElement.query(By.css('app-grounding-sources'))).toBeNull();
    });

    it('renders a fetched page under its response chip, with the URL from its call', () => {
      const call = new UiEvent({
        role: 'bot',
        event: {id: 'fetch-call'} as AdkEvent,
        functionCalls: [{id: 'fc-web', name: 'load_web_page', args: {url: 'https://example.com'}}],
      });
      component.uiEvent = new UiEvent({
        role: 'bot',
        event: {id: 'fetch-response'} as AdkEvent,
        functionResponses: [{
          id: 'fc-web',
          name: 'load_web_page',
          response: {result: 'Example text.'},
        }],
      });
      component.uiEvents = [call, component.uiEvent];
      component.index = 1;
      fixture.detectChanges();

      const chip = fixture.debugElement.query(By.css('.function-response-chip-container'));
      const page = fixture.debugElement.query(By.css('app-web-page'));
      expect(chip.nativeElement.nextElementSibling).toBe(page.nativeElement);
      expect(page.nativeElement.textContent).toContain('https://example.com');
    });
  });

  describe('Tool confirmation', () => {
    it('renders an approval card for a confirmation request', () => {
      component.uiEvent = new UiEvent({
        role: 'bot',
        event: {id: 'confirm-request'} as AdkEvent,
        functionCalls: [{
          id: 'confirm-1',
          name: 'adk_request_confirmation',
          args: {
            originalFunctionCall: {id: 'fc-1', name: 'execute_bash', args: {command: 'ls'}},
            toolConfirmation: {hint: 'Run ls?', confirmed: false},
          },
          needsResponse: true,
        }],
      });
      component.index = 0;
      fixture.detectChanges();

      expect(fixture.debugElement.query(By.css('app-tool-confirmation .confirmation-card')))
          .toBeTruthy();
      expect(fixture.debugElement.query(By.css('app-long-running-response'))).toBeNull();
    });

    it('shows a tool\'s approval placeholder as a status, not as shell output', () => {
      component.uiEvent = new UiEvent({
        role: 'bot',
        event: {id: 'placeholder'} as AdkEvent,
        functionResponses: [{
          id: 'fc-1',
          name: 'execute_bash',
          response: {error: 'This tool call requires confirmation, please approve or reject.'},
        }],
      });
      component.index = 1;
      fixture.detectChanges();

      expect(fixture.debugElement.query(By.css('app-tool-confirmation')).nativeElement.textContent)
          .toContain('Approval requested');
      expect(fixture.debugElement.query(By.css('app-shell-command'))).toBeNull();
    });
  });
});
