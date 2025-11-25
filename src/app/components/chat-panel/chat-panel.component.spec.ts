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
import {SimpleChange} from '@angular/core';
import {ComponentFixture, TestBed} from '@angular/core/testing';
// 1p-ONLY-IMPORTS: import {beforeEach, describe, expect, it}
import {fakeAsync, initTestBed, tick} from '../../testing/utils';
import {MatDialogModule} from '@angular/material/dialog';
import {By} from '@angular/platform-browser';
import {NoopAnimationsModule} from '@angular/platform-browser/animations';
import {of} from 'rxjs';

import {FEATURE_FLAG_SERVICE} from '../../core/services/interfaces/feature-flag';
import {STRING_TO_COLOR_SERVICE} from '../../core/services/interfaces/string-to-color';
import {UI_STATE_SERVICE, UiStateService} from '../../core/services/interfaces/ui-state';
import {MockFeatureFlagService} from '../../core/services/testing/mock-feature-flag.service';
import {MockStringToColorService} from '../../core/services/testing/mock-string-to-color.service';
import {MockUiStateService} from '../../core/services/testing/mock-ui-state.service';
import {MARKDOWN_COMPONENT} from '../markdown/markdown.component.interface';
import {MockMarkdownComponent} from '../markdown/testing/mock-markdown.component';

import {ChatPanelComponent} from './chat-panel.component';

const USER_ID = 'user';
const FUNC1_NAME = 'func1';

describe('ChatPanelComponent', () => {
  let component: ChatPanelComponent;
  let fixture: ComponentFixture<ChatPanelComponent>;
  let mockFeatureFlagService: MockFeatureFlagService;
  let mockUiStateService: MockUiStateService;
  let mockStringToColorService: MockStringToColorService;

  beforeEach(async () => {
    mockFeatureFlagService = new MockFeatureFlagService();
    mockUiStateService = new MockUiStateService();

    mockFeatureFlagService.isMessageFileUploadEnabledResponse.next(true);
    mockFeatureFlagService.isManualStateUpdateEnabledResponse.next(true);
    mockFeatureFlagService.isBidiStreamingEnabledResponse.next(true);

    mockStringToColorService = new MockStringToColorService();
    mockStringToColorService.stc.and.returnValue('rgb(255, 0, 0)');

    initTestBed();  // required for 1p compat

    initTestBed();  // required for 1p compat
    await TestBed
        .configureTestingModule({
          imports: [
            ChatPanelComponent,
            MatDialogModule,
            NoopAnimationsModule,
            HttpClientTestingModule,
          ],
          providers: [
            {
              provide: STRING_TO_COLOR_SERVICE,
              useValue: mockStringToColorService,
            },
            {provide: MARKDOWN_COMPONENT, useValue: MockMarkdownComponent},
            {provide: FEATURE_FLAG_SERVICE, useValue: mockFeatureFlagService},
            {provide: UI_STATE_SERVICE, useValue: mockUiStateService},
          ],
        })
        .compileComponents();

    fixture = TestBed.createComponent(ChatPanelComponent);
    component = fixture.componentInstance;
    component.appName = 'test-app';
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  describe('Message Handling', () => {
    it('should emit sendMessage event on Enter in textarea', () => {
      spyOn(component.sendMessage, 'emit');
      component.userInput = 'Hello';
      fixture.detectChanges();

      const textarea = fixture.debugElement.query(By.css('textarea'));
      const mockEvent = new KeyboardEvent('keydown', {key: 'Enter'});
      textarea.triggerEventHandler('keydown.enter', mockEvent);

      expect(component.sendMessage.emit).toHaveBeenCalledWith(mockEvent);
    });

    it('should display user and bot messages', async () => {
      component.messages = [
        {role: 'user', text: 'User message'},
        {role: 'bot', text: 'Bot message'},
      ];
      fixture.detectChanges();
      await fixture.whenStable();
      fixture.detectChanges();
      const messages = fixture.debugElement.queryAll(By.css('.message-card'));
      expect(messages.length).toBe(2);
      expect(messages[0].nativeElement.textContent).toContain('User message');
      expect(messages[1].nativeElement.textContent).toContain('Bot message');
    });

    it('should display function call', () => {
      component.messages = [
        {role: 'bot', functionCall: {name: 'test_func', args: {}}},
      ];
      fixture.detectChanges();
      const button =
          fixture.debugElement.query(By.css('.function-event-button'));
      expect(button.nativeElement.textContent).toContain('test_func');
    });

    it('should display function response', () => {
      component.messages = [
        {role: 'bot', functionResponse: {name: 'test_func', response: {}}},
      ];
      fixture.detectChanges();
      const button =
          fixture.debugElement.query(By.css('.function-event-button'));
      expect(button.nativeElement.textContent).toContain('test_func');
    });

    it('should display file preview and emit removeFile event', () => {
      const mockFile = new File([''], 'test.png', {type: 'image/png'});
      component.selectedFiles = [{file: mockFile, url: 'blob:url'}];
      fixture.detectChanges();

      const img = fixture.debugElement.query(By.css('.image-preview'));
      expect(img).toBeTruthy();

      spyOn(component.removeFile, 'emit');
      const deleteButton = fixture.debugElement.query(By.css('.delete-button'));
      deleteButton.nativeElement.click();
      expect(component.removeFile.emit).toHaveBeenCalledWith(0);
    });
  });

  it('should display loading bar if message isLoading', async () => {
    component.messages = [{role: 'bot', isLoading: true}];
    fixture.detectChanges();
    await fixture.whenStable();
    fixture.detectChanges();
    const progressBar = fixture.debugElement.query(By.css('mat-progress-bar'));
    expect(progressBar).toBeTruthy();
  });

  it('should display thought chip for thought messages', async () => {
    component.messages = [{role: 'bot', text: 'Thinking...', thought: true}];
    fixture.detectChanges();
    await fixture.whenStable();
    fixture.detectChanges();
    const thoughtChip = fixture.debugElement.query(By.css('.thought-chip'));
    expect(thoughtChip).toBeTruthy();
    expect(thoughtChip.nativeElement.textContent).toContain('Thought');
  });

  describe('Eval Edit Mode', () => {
    it('should show edit/delete buttons for text messages', async () => {
      component.evalCase = {
        evalId: '1',
        conversation: [],
        sessionInput: {},
        creationTimestamp: 123,
      };
      component.isEvalEditMode = true;
      component.messages = [{role: 'bot', text: 'eval message', eventId: '1'}];
      fixture.detectChanges();
      await fixture.whenStable();
      fixture.detectChanges();
      const buttons =
          fixture.debugElement.queryAll(By.css('.eval-case-edit-button'));
      expect(buttons.length).toBe(2);
      expect(buttons[0].nativeElement.textContent).toContain('edit');
      expect(buttons[1].nativeElement.textContent).toContain('delete');
    });

    it('should show edit button for function calls', async () => {
      component.evalCase = {
        evalId: '1',
        conversation: [],
        sessionInput: {},
        creationTimestamp: 123,
      };
      component.isEvalEditMode = true;
      component.messages =
          [{role: 'bot', functionCall: {name: 'func1'}, eventId: '1'}];
      component.isEditFunctionArgsEnabled = true;
      fixture.detectChanges();
      await fixture.whenStable();
      fixture.detectChanges();
      const buttons =
          fixture.debugElement.queryAll(By.css('.eval-case-edit-button'));
      expect(buttons.length).toBe(1);
      expect(buttons[0].nativeElement.textContent).toContain('edit');
    });

    it('should emit editEvalCaseMessage when edit is clicked', async () => {
      component.evalCase = {
        evalId: '1',
        conversation: [],
        sessionInput: {},
        creationTimestamp: 123,
      };
      component.isEvalEditMode = true;
      const message = {role: 'bot', text: 'eval message', eventId: '1'};
      component.messages = [message];
      spyOn(component.editEvalCaseMessage, 'emit');
      fixture.detectChanges();
      await fixture.whenStable();
      fixture.detectChanges();
      const editButton =
          fixture.debugElement.queryAll(By.css('.eval-case-edit-button'))[0];
      editButton.nativeElement.click();
      expect(component.editEvalCaseMessage.emit).toHaveBeenCalledWith(message);
    });

    it('should emit deleteEvalCaseMessage when delete is clicked', async () => {
      component.evalCase = {
        evalId: '1',
        conversation: [],
        sessionInput: {},
        creationTimestamp: 123,
      };
      component.isEvalEditMode = true;
      const message = {role: 'bot', text: 'eval message', eventId: '1'};
      component.messages = [message];
      spyOn(component.deleteEvalCaseMessage, 'emit');
      fixture.detectChanges();
      await fixture.whenStable();
      fixture.detectChanges();
      const deleteButton =
          fixture.debugElement.queryAll(By.css('.eval-case-edit-button'))[1];
      deleteButton.nativeElement.click();
      expect(component.deleteEvalCaseMessage.emit)
          .toHaveBeenCalledWith({message, index: 0});
    });

    it('should emit editFunctionArgs when edit on function call is clicked',
       async () => {
         component.evalCase = {
           evalId: '1',
           conversation: [],
           sessionInput: {},
           creationTimestamp: 123,
         };
         component.isEvalEditMode = true;
         const message = {
           role: 'bot',
           functionCall: {name: 'func1'},
           eventId: '1'
         };
         component.messages = [message];
         component.isEditFunctionArgsEnabled = true;
         spyOn(component.editFunctionArgs, 'emit');
         fixture.detectChanges();
         await fixture.whenStable();
         fixture.detectChanges();
         const editButton =
             fixture.debugElement.query(By.css('.eval-case-edit-button'));
         editButton.nativeElement.click();
         expect(component.editFunctionArgs.emit).toHaveBeenCalledWith(message);
       });
  });

  describe('Events', () => {
    it('should emit clickEvent when bot icon is clicked', () => {
      component.messages = [{role: 'bot', text: 'message', eventId: '1'}];
      component.eventData = new Map([['1', {id: '1', author: 'bot'}]]);
      spyOn(component.clickEvent, 'emit');
      fixture.detectChanges();
      const botIcon =
          fixture.debugElement.query(By.css('button[mat-mini-fab]'));
      botIcon.nativeElement.click();
      expect(component.clickEvent.emit).toHaveBeenCalledWith(0);
    });

    it('should disable bot icon when eventId is not set', () => {
      component.messages = [{role: 'bot', text: 'message'}];
      fixture.detectChanges();
      const botIcon =
          fixture.debugElement.query(By.css('button[mat-mini-fab]'));
      expect(botIcon.nativeElement.disabled).toBeTrue();
    });

    it('should emit clickEvent when function call button is clicked', () => {
      component.messages =
          [{role: 'bot', functionCall: {name: 'func1'}, eventId: '1'}];
      component.eventData = new Map([['1', {id: '1', author: 'bot'}]]);
      spyOn(component.clickEvent, 'emit');
      fixture.detectChanges();
      const funcButton =
          fixture.debugElement.query(By.css('.function-event-button'));
      funcButton.nativeElement.click();
      expect(component.clickEvent.emit).toHaveBeenCalledWith(0);
    });
  });

  describe('State Updates', () => {
    it('should show updated state chip and emit removeStateUpdate',
       async () => {
         component.updatedSessionState = {key: 'value'};
         fixture.detectChanges();
         await fixture.whenStable();
         fixture.detectChanges();

         const chip = fixture.debugElement.query(By.css('.file-info span'));
         expect(chip.nativeElement.textContent)
             .toContain('Updated session state');

         spyOn(component.removeStateUpdate, 'emit');
         const deleteButton =
             fixture.debugElement.query(By.css('.delete-button'));
         deleteButton.nativeElement.click();
         expect(component.removeStateUpdate.emit).toHaveBeenCalled();
       });
  });

  describe('Scrolling', () => {
    it('should scroll to bottom when user sends a message, even if scroll was interrupted',
       fakeAsync(() => {
         // Given
         component.messages = [{role: 'bot', text: 'Bot message'}];
         fixture.detectChanges();
         const scrollContainerElement = component.scrollContainer.nativeElement;
         spyOn(scrollContainerElement, 'scrollTo');
         scrollContainerElement.dispatchEvent(new WheelEvent('wheel'));
         expect(component.scrollInterrupted).toBeTrue();

         // When
         const oldMessages = component.messages;
         component.messages = [...oldMessages, {role: 'user', text: 'User'}];
         component.ngOnChanges({
           'messages': new SimpleChange(oldMessages, component.messages, false)
         });
         fixture.detectChanges();
         tick(50);

         // Then
         expect(component.scrollInterrupted).toBeFalse();
         expect(scrollContainerElement.scrollTo).toHaveBeenCalled();
       }));
  });

  describe('disabled features', () => {
    it('should have the attach_file button disabled', () => {
      mockFeatureFlagService.isMessageFileUploadEnabledResponse.next(false);
      fixture.detectChanges();

      const allButtons =
          fixture.debugElement.queryAll(By.css('button[mat-icon-button]'));
      const button = allButtons.find(
          b =>
              b.nativeElement.querySelector('mat-icon')?.textContent?.trim() ===
              'attach_file');
      expect(button!.nativeElement.disabled).toBeTrue();
    });

    it('should have the more_vert button disabled', () => {
      mockFeatureFlagService.isManualStateUpdateEnabledResponse.next(false);
      fixture.detectChanges();

      const allButtons =
          fixture.debugElement.queryAll(By.css('button[mat-icon-button]'));
      const button = allButtons.find(
          b =>
              b.nativeElement.querySelector('mat-icon')?.textContent?.trim() ===
              'more_vert');
      expect(button!.nativeElement.disabled).toBeTrue();
    });

    it('should have the mic button disabled', () => {
      mockFeatureFlagService.isBidiStreamingEnabledResponse.next(false);
      fixture.detectChanges();

      const allButtons =
          fixture.debugElement.queryAll(By.css('button[mat-icon-button]'));
      const button = allButtons.find(
          b =>
              b.nativeElement.querySelector('mat-icon')?.textContent?.trim() ===
              'mic');
      expect(button!.nativeElement.disabled).toBeTrue();
    });

    it('should have the videocam button disabled', () => {
      mockFeatureFlagService.isBidiStreamingEnabledResponse.next(false);
      fixture.detectChanges();

      const allButtons =
          fixture.debugElement.queryAll(By.css('button[mat-icon-button]'));
      const button = allButtons.find(
          b =>
              b.nativeElement.querySelector('mat-icon')?.textContent?.trim() ===
              'videocam');
      expect(button!.nativeElement.disabled).toBeTrue();
    });

    describe('when canEditSession is false', () => {
      beforeEach(() => {
        fixture.componentRef.instance.canEditSession.set(false);
        fixture.detectChanges();
      });

      it('should not render the chat input', () => {
        const textarea = fixture.debugElement.query(By.css('textarea'));
        expect(textarea).toBeFalsy();
      });
    });

    describe('when canEditSession is true', () => {
      beforeEach(() => {
        fixture.componentRef.instance.canEditSession.set(true);
        fixture.detectChanges();
      });

      it('should render the chat input', () => {
        const textarea = fixture.debugElement.query(By.css('textarea'));
        expect(textarea).toBeTruthy();
      });
    });
  });

  describe('Loading state', () => {
    describe('when session is loading', () => {
      beforeEach(() => {
        mockUiStateService.isSessionLoadingResponse.next(true);
        fixture.detectChanges();
      });

      it('should show loading spinner', () => {
        const spinner =
            fixture.debugElement.query(By.css('mat-progress-spinner'));
        expect(spinner).toBeTruthy();
      });

      it('should not show chat content', () => {
        const chatMessages =
            fixture.debugElement.query(By.css('.chat-messages'));
        const chatInput = fixture.debugElement.query(By.css('.chat-input'));
        expect(chatMessages).toBeFalsy();
        expect(chatInput).toBeFalsy();
      });
    });

    describe('when session is not loading', () => {
      beforeEach(() => {
        mockUiStateService.isSessionLoadingResponse.next(false);
        fixture.detectChanges();
      });


    it('should show chat content', () => {
      const spinner =
          fixture.debugElement.query(By.css('mat-progress-spinner'));
      const chatMessages = fixture.debugElement.query(By.css('.chat-messages'));
      const chatInput = fixture.debugElement.query(By.css('.chat-input'));
      expect(spinner).toBeFalsy();
      expect(chatMessages).toBeTruthy();
      expect(chatInput).toBeTruthy();
    });
    });
  });
});
