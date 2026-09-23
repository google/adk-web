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
});
