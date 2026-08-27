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
import {MatDialogModule} from '@angular/material/dialog';
import {By} from '@angular/platform-browser';
import {NoopAnimationsModule} from '@angular/platform-browser/animations';
// 1p-ONLY-IMPORTS: import {beforeEach, describe, expect, it}
import {of, ReplaySubject} from 'rxjs';
import {ARTIFACT_SERVICE} from '../../core/services/interfaces/artifact';
import {MockArtifactService} from '../../core/services/testing/mock-artifact.service';

import {UiEvent} from '../../core/models/UiEvent';
import {isComputerUseResponse} from '../../core/models/ComputerUse';
import {AGENT_SERVICE} from '../../core/services/interfaces/agent';
import {FEATURE_FLAG_SERVICE} from '../../core/services/interfaces/feature-flag';
import {FEEDBACK_SERVICE} from '../../core/services/interfaces/feedback';
import {SAFE_VALUES_SERVICE, SafeValuesService} from '../../core/services/interfaces/safevalues';
import {SESSION_SERVICE} from '../../core/services/interfaces/session';
import {STRING_TO_COLOR_SERVICE} from '../../core/services/interfaces/string-to-color';
import {THEME_SERVICE} from '../../core/services/interfaces/theme';
import {UI_STATE_SERVICE} from '../../core/services/interfaces/ui-state';
import {MockAgentService} from '../../core/services/testing/mock-agent.service';
import {MockFeatureFlagService} from '../../core/services/testing/mock-feature-flag.service';
import {MockFeedbackService} from '../../core/services/testing/mock-feedback.service';
import {MockSessionService} from '../../core/services/testing/mock-session.service';
import {MockStringToColorService} from '../../core/services/testing/mock-string-to-color.service';
import {MockThemeService} from '../../core/services/testing/mock-theme.service';
import {MockUiStateService} from '../../core/services/testing/mock-ui-state.service';
import {fakeAsync, initTestBed, tick} from '../../testing/utils';
import {MARKDOWN_COMPONENT} from '../markdown/markdown.component.interface';
import {MockMarkdownComponent} from '../markdown/testing/mock-markdown.component';

import {ChatPanelComponent} from './chat-panel.component';

describe('ChatPanelComponent', () => {
  let component: ChatPanelComponent;
  let fixture: ComponentFixture<ChatPanelComponent>;
  let mockFeatureFlagService: MockFeatureFlagService;
  let mockUiStateService: MockUiStateService;
  let mockStringToColorService: MockStringToColorService;
  let mockAgentService: MockAgentService;
  let mockSessionService: MockSessionService;
  let mockFeedbackService: MockFeedbackService;

  beforeEach(async () => {
    mockFeatureFlagService = new MockFeatureFlagService();
    mockUiStateService = new MockUiStateService();
    mockAgentService = new MockAgentService();
    mockSessionService = new MockSessionService();
    mockFeedbackService = new MockFeedbackService();

    mockFeatureFlagService.isMessageFileUploadEnabledResponse.next(true);
    mockFeatureFlagService.isManualStateUpdateEnabledResponse.next(true);
    mockFeatureFlagService.isBidiStreamingEnabledResponse.next(true);
    mockFeatureFlagService.isFeedbackServiceEnabledResponse.next(true);
    mockFeatureFlagService.isInfinityMessageScrollingEnabledResponse.next(true);
    mockFeatureFlagService.isMoreOptionsButtonHiddenResponse.next(false);

    mockStringToColorService = new MockStringToColorService();
    mockStringToColorService.stc.and.returnValue('rgb(255, 0, 0)');

    mockAgentService.getLoadingStateResponse.next(false);

    const mockSafeValuesService = jasmine.createSpyObj<SafeValuesService>(
        'SafeValuesService', ['bypassSecurityTrustHtml']);
    mockSafeValuesService.bypassSecurityTrustHtml.and.callFake(
        (value: string) => value);

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
            {provide: AGENT_SERVICE, useValue: mockAgentService},
            {provide: SESSION_SERVICE, useValue: mockSessionService},
            {provide: FEEDBACK_SERVICE, useValue: mockFeedbackService},
            {provide: SAFE_VALUES_SERVICE, useValue: mockSafeValuesService},
            {provide: THEME_SERVICE, useClass: MockThemeService},
            {provide: ARTIFACT_SERVICE, useValue: new MockArtifactService()},
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

    xit('should display user and bot messages', async () => {
      component.uiEvents = [
        new UiEvent({role: 'user', text: 'User message', event: {} as any}),
        new UiEvent({role: 'bot', text: 'Bot message', event: {} as any}),
      ];
      fixture.detectChanges();
      await fixture.whenStable();
      fixture.detectChanges();
      const uiEvents = fixture.debugElement.queryAll(By.css('.content-bubble'));
      expect(uiEvents.length).toBe(2);
      expect(uiEvents[0].nativeElement.textContent).toContain('User message');
      expect(uiEvents[1].nativeElement.textContent).toContain('Bot message');
    });

    // Skipped: .function-event-button UI element removed in UI refactor
    xit('should display function call', () => {
      component.uiEvents = [
        new UiEvent({role: 'bot', functionCalls: [{name: 'test_func', args: {}}], event: {} as any}),
      ];
      fixture.detectChanges();
      const button =
          fixture.debugElement.query(By.css('.function-event-button'));
      expect(button.nativeElement.textContent).toContain('test_func');
    });

    // Skipped: .function-event-button UI element removed in UI refactor
    xit('should display function response', () => {
      component.uiEvents = [
        new UiEvent({role: 'bot', functionResponses: [{name: 'test_func', response: {}}], event: {} as any}),
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

    // Left disabled: chat-panel does not own the canvas (the chain is
    // chat-panel -> event-row -> event-content -> content-bubble ->
    // a2ui-canvas) and this TestBed provides none of the A2UI DI graph.
    // `content-bubble.component.spec.ts` covers the dispatch directly.
    xit('should display A2UI canvas', () => {
      component.uiEvents = [
        new UiEvent({
          role: 'bot',
          a2uiData:
              {beginRendering: true, surfaceUpdate: {}, dataModelUpdate: {}},
          event: {} as any
        }),
      ];
      fixture.detectChanges();
      const canvas = fixture.debugElement.query(By.css('app-a2ui-canvas'));
      expect(canvas).toBeTruthy();
    });
  });

  // Skipped: mat-progress-bar for loading messages removed in UI refactor
  xit('should display loading bar if message isLoading', async () => {
    component.uiEvents = [new UiEvent({role: 'bot', isLoading: true, event: {} as any})];
    fixture.detectChanges();
    await fixture.whenStable();
    fixture.detectChanges();
    const progressBar = fixture.debugElement.query(By.css('mat-progress-bar'));
    expect(progressBar).toBeTruthy();
  });

  // Skipped: .thought-chip UI element removed in UI refactor
  xit('should display thought chip for thought messages', async () => {
    component.uiEvents = [new UiEvent({role: 'bot', text: 'Thinking...', thought: true, event: {} as any})];
    fixture.detectChanges();
    await fixture.whenStable();
    fixture.detectChanges();
    const thoughtChip = fixture.debugElement.query(By.css('.thought-chip'));
    expect(thoughtChip).toBeTruthy();
    expect(thoughtChip.nativeElement.textContent).toContain('Thought');
  });

  describe('Eval Edit Mode', () => {
    beforeEach(() => {
      component.evalCase = {
        evalId: '1',
        conversation: [],
        sessionInput: {},
        creationTimestamp: 123,
      };
      component.isEvalEditMode = true;
    });

    xit(
        'should show edit/delete buttons for text messages', async () => {
          component.uiEvents =
              [new UiEvent({role: 'bot', text: 'eval message', event: { id: '1' } as any})];
          fixture.detectChanges();
          await fixture.whenStable();
          fixture.detectChanges();
          const buttons =
              fixture.debugElement.queryAll(By.css('.eval-case-edit-button'));
          expect(buttons.length).toBe(2);
          expect(buttons[0].nativeElement.textContent).toContain('edit');
          expect(buttons[1].nativeElement.textContent).toContain('delete');
        });

    xit('should show edit button for function calls', async () => {
      component.uiEvents =
          [new UiEvent({role: 'bot', functionCalls: [{name: 'func1', args: {}}], event: { id: '1' } as any})];
      component.isEditFunctionArgsEnabled = true;
      fixture.detectChanges();
      await fixture.whenStable();
      fixture.detectChanges();
      const buttons =
          fixture.debugElement.queryAll(By.css('.eval-case-edit-button'));
      expect(buttons.length).toBe(1);
      expect(buttons[0].nativeElement.textContent).toContain('edit');
    });

    xit(
        'should emit editEvalCaseMessage when edit is clicked', async () => {
          const message = new UiEvent({role: 'bot', text: 'eval message', event: { id: '1' } as any});
          component.uiEvents = [message];
          spyOn(component.editEvalCaseMessage, 'emit');
          fixture.detectChanges();
          await fixture.whenStable();
          fixture.detectChanges();
          const editButton = fixture.debugElement.queryAll(
              By.css('.eval-case-edit-button'))[0];
          editButton.nativeElement.click();
          expect(component.editEvalCaseMessage.emit)
              .toHaveBeenCalledWith(message);
        });

    xit(
        'should emit deleteEvalCaseMessage when delete is clicked',
        async () => {
          const message = new UiEvent({role: 'bot', text: 'eval message', event: { id: '1' } as any});
          component.uiEvents = [message];
          spyOn(component.deleteEvalCaseMessage, 'emit');
          fixture.detectChanges();
          await fixture.whenStable();
          fixture.detectChanges();
          const deleteButton = fixture.debugElement.queryAll(
              By.css('.eval-case-edit-button'))[1];
          deleteButton.nativeElement.click();
          expect(component.deleteEvalCaseMessage.emit)
              .toHaveBeenCalledWith({message, index: 0});
        });

    xit(
        'should emit editFunctionArgs when edit on function call is clicked',
        async () => {
          const message = new UiEvent({
            role: 'bot',
            functionCalls: [{name: 'func1', args: {}}],
            event: { id: '1' } as any
          });
          component.uiEvents = [message];
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

  // Skipped: Bot icon (mat-mini-fab) and function-event-button removed in UI refactor
  xdescribe('Events', () => {
    it('should emit clickEvent when bot icon is clicked', () => {
      component.uiEvents = [new UiEvent({role: 'bot', text: 'message', event: { id: '1', author: 'bot' } as any})];
      spyOn(component.clickEvent, 'emit');
      fixture.detectChanges();
      const botIcon =
          fixture.debugElement.query(By.css('button[mat-mini-fab]'));
      botIcon.nativeElement.click();
      expect(component.clickEvent.emit).toHaveBeenCalledWith(0);
    });

    it('should disable bot icon when eventId is not set', () => {
      component.uiEvents = [new UiEvent({role: 'bot', text: 'message', event: {} as any})];
      fixture.detectChanges();
      const botIcon =
          fixture.debugElement.query(By.css('button[mat-mini-fab]'));
      expect(botIcon.nativeElement.disabled).toBeTrue();
    });

    it(
        'should emit clickEvent when function call button is clicked', () => {
          component.uiEvents =
              [new UiEvent({role: 'bot', functionCalls: [{name: 'func1', args: {}}], event: { id: '1', author: 'bot' } as any})];
          spyOn(component.clickEvent, 'emit');
          fixture.detectChanges();
          const funcButton =
              fixture.debugElement.query(By.css('.function-event-button'));
          funcButton.nativeElement.click();
          expect(component.clickEvent.emit).toHaveBeenCalledWith(0);
        });
  });

  describe('State Updates', () => {
    it(
        'should show updated state chip and emit removeStateUpdate',
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
    describe('basic scrolling behavior', () => {
      let scrollContainerElement: HTMLElement;

      beforeEach(() => {
        component.uiEvents = [new UiEvent({role: 'bot', text: 'Bot message', event: {} as any})];
        fixture.detectChanges();
        scrollContainerElement = component.scrollContainer.nativeElement;
      });

      // Skipped: Scroll interrupt behavior changed in UI refactor
      xit(
          'should scroll to bottom when user sends a message, even if scroll was interrupted',
          fakeAsync(() => {
            spyOn(scrollContainerElement, 'scrollTo');
            scrollContainerElement.dispatchEvent(new WheelEvent('wheel'));
            expect(component.scrollInterrupted).toBeTrue();

            const oldMessages = component.uiEvents;
            component.uiEvents = [...oldMessages, new UiEvent({role: 'user', text: 'User', event: {} as any})];
            component.ngOnChanges({
              'messages':
                  new SimpleChange(oldMessages, component.uiEvents, false)
            });
            fixture.detectChanges();
            tick(50);

            expect(component.scrollInterrupted).toBeFalse();
            expect(scrollContainerElement.scrollTo).toHaveBeenCalled();
          }));

      it(
          'should call uiStateService.lazyLoadMessages when scrolled to top',
          fakeAsync(() => {
            const initialMessageCount = 50;
            const initialMessages = Array.from(
                {length: initialMessageCount},
                (_, i) => new UiEvent({role: 'bot', text: `message ${i}`, event: {} as any}));
            component.uiEvents = initialMessages;
            fixture.detectChanges();

            scrollContainerElement.style.height = '100px';
            scrollContainerElement.style.overflow = 'auto';
            scrollContainerElement.scrollTop = 100;
            fixture.detectChanges();

            mockUiStateService.newMessagesLoadedResponse.next(
                {items: [], nextPageToken: 'initial-token'});
            tick();

            scrollContainerElement.scrollTop = 0;
            scrollContainerElement.dispatchEvent(new Event('scroll'));
            tick(200);

            expect(mockUiStateService.lazyLoadMessages).toHaveBeenCalled();

            mockUiStateService.lazyLoadMessagesResponse.next();

            const newMessages = Array.from(
                {length: 20}, (_, i) => new UiEvent({role: 'bot', text: `new ${i}`, event: {} as any}));
            component.uiEvents = [...newMessages, ...component.uiEvents];
            mockUiStateService.newMessagesLoadedResponse.next(
                {items: newMessages, nextPageToken: 'next'});
            tick();
            fixture.detectChanges();

            expect(component.uiEvents.length)
                .toBe(initialMessageCount + newMessages.length);
            expect(component.uiEvents[0]).toEqual(newMessages[0]);
          }));
    });

    describe('when infinity scrolling is enabled', () => {
      beforeEach(() => {
        mockFeatureFlagService.isInfinityMessageScrollingEnabledResponse.next(
            true);
      });

      it('should lazy load messages when session name changes', () => {
        mockUiStateService.lazyLoadMessages.calls.reset();

        fixture.componentRef.setInput('sessionName', 'new-session-id');
        fixture.detectChanges();

        expect(mockUiStateService.lazyLoadMessages)
            .toHaveBeenCalledWith('new-session-id', {
              pageSize: 100,
              pageToken: '',
            });
      });

      describe('when new messages are loaded', () => {
        let scrollContainer: HTMLElement;
        const nextToken = 'updated-token-123';

        beforeEach(fakeAsync(() => {
          scrollContainer = component.scrollContainer.nativeElement;

          // Define scrollHeight and scrollTop as simple data properties to
          // bypass browser layout constraint logic.
          Object.defineProperty(scrollContainer, 'scrollHeight', {
            value: 1000,
            configurable: true,
          });
          Object.defineProperty(scrollContainer, 'scrollTop', {
            value: 0,
            writable: true,
            configurable: true,
          });

          mockUiStateService.newMessagesLoadedResponse.next(
              {items: [], nextPageToken: nextToken});
        }));

        it(
            'should update nextPageToken and fetch on scroll', fakeAsync(() => {
              component['onScroll'].next(
                  {target: scrollContainer} as unknown as Event);
              tick();

              expect(mockUiStateService.lazyLoadMessages)
                  .toHaveBeenCalledWith(
                      jasmine.anything(),
                      jasmine.objectContaining({pageToken: nextToken}));
            }));

        it('should restore scroll position', fakeAsync(() => {
                      component['onScroll'].next(
                          {target: scrollContainer} as unknown as Event);
                      tick();

                      Object.defineProperty(
                          scrollContainer, 'scrollHeight',
                          {value: 1500, configurable: true});
                      mockUiStateService.newMessagesLoadedResponse.next({
                        items: [new UiEvent({role: 'bot', text: 'message 1', event: {} as any})],
                        nextPageToken: nextToken
                      });

                      tick(50);

                      expect(scrollContainer.scrollTop).toBe(500);
                    }));
      });
    });

    describe('when infinity scrolling is disabled', () => {
      beforeEach(() => {
        mockFeatureFlagService.isInfinityMessageScrollingEnabledResponse.next(
            false);
      });

      it(
          'should not lazy load messages when scrolled to top',
          fakeAsync(() => {
            mockUiStateService.lazyLoadMessages.calls.reset();

            component.scrollContainer.nativeElement.scrollTop = 0;
            component['onScroll'].next(
                {target: component.scrollContainer.nativeElement} as unknown as
                Event);
            tick();

            expect(mockUiStateService.lazyLoadMessages).not.toHaveBeenCalled();
          }));

      it(
          'should not restore scroll position after loading new messages',
          fakeAsync(() => {
            const scrollContainer = component.scrollContainer.nativeElement;
            scrollContainer.scrollTop = 0;
            const originalScrollTop = scrollContainer.scrollTop;

            mockUiStateService.newMessagesLoadedResponse.next(
                {items: [], nextPageToken: ''});
            tick();

            expect(scrollContainer.scrollTop).toBe(originalScrollTop);
          }));
    });
  });

  describe('disabled features', () => {
    it('should have the attach_file button disabled', () => {
      mockFeatureFlagService.isMessageFileUploadEnabledResponse.next(false);
      fixture.detectChanges();

      // Open the actions menu
      const prefixButton = fixture.debugElement.query(By.css('.input-prefix-menu-btn'));
      prefixButton.nativeElement.click();
      fixture.detectChanges();

      const allButtons =
          fixture.debugElement.queryAll(By.css('button[mat-menu-item]'));
      const button = allButtons.find(
          b =>
              b.nativeElement.querySelector('mat-icon')?.textContent?.trim() ===
              'attach_file');
      expect(button!.nativeElement.disabled).toBeTrue();
    });

    it('should have the more_vert button disabled', () => {
      mockFeatureFlagService.isManualStateUpdateEnabledResponse.next(false);
      fixture.detectChanges();

      // Open the actions menu
      const prefixButton = fixture.debugElement.query(By.css('.input-prefix-menu-btn'));
      prefixButton.nativeElement.click();
      fixture.detectChanges();

      const allButtons =
          fixture.debugElement.queryAll(By.css('button[mat-menu-item]'));
      const button = allButtons.find(
          b =>
              b.nativeElement.querySelector('mat-icon')?.textContent?.trim() ===
              'tune');
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
              'call');
      expect(button!.nativeElement.disabled).toBeTrue();
    });

    it('should have the videocam button disabled', () => {
      mockFeatureFlagService.isBidiStreamingEnabledResponse.next(false);
      component.isAudioRecording = true;
      fixture.detectChanges();

      const allButtons =
          fixture.debugElement.queryAll(By.css('button[mat-icon-button]'));
      const button = allButtons.find(
          b =>
              b.nativeElement.querySelector('mat-icon')?.textContent?.trim() ===
              'videocam');
      expect(button!.nativeElement.disabled).toBeTrue();
    });

    const callButtons = () =>
        fixture.debugElement.queryAll(By.css('button[mat-icon-button]'))
            .map(b => ({
                   icon: b.nativeElement.querySelector('mat-icon')
                             ?.textContent?.trim(),
                   disabled: b.nativeElement.disabled,
                 }));

    it('offers the videocam button beside the call button while not in a call',
       () => {
         mockFeatureFlagService.isBidiStreamingEnabledResponse.next(true);
         component.isAudioRecording = false;
         fixture.detectChanges();

         const icons = callButtons();
         const videocam = icons.find(b => b.icon === 'videocam');
         const call = icons.find(b => b.icon === 'call');

         expect(videocam).toBeDefined();
         expect(videocam!.disabled).toBeFalse();
         expect(call).toBeDefined();
         expect(call!.disabled).toBeFalse();
       });

    it('disables the videocam button during an audio-only call, which has no camera',
       () => {
         mockFeatureFlagService.isBidiStreamingEnabledResponse.next(true);
         component.isAudioRecording = true;
         component.isVideoCall = false;
         fixture.detectChanges();

         expect(callButtons().find(b => b.icon === 'videocam')!.disabled)
             .toBeTrue();
       });

    it('keeps the videocam button active during a video call so the camera can be turned off',
       () => {
         mockFeatureFlagService.isBidiStreamingEnabledResponse.next(true);
         component.isAudioRecording = true;
         component.isVideoCall = true;
         component.isVideoRecording = true;
         fixture.detectChanges();

         expect(callButtons().find(b => b.icon === 'videocam')!.disabled)
             .toBeFalse();
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

    // Skipped: More options button behavior changed in UI refactor
    xdescribe('when more options button is hidden', () => {
      beforeEach(() => {
        mockFeatureFlagService.isMoreOptionsButtonHiddenResponse.next(true);
        fixture.detectChanges();
      });

      it('should not show more options button', () => {
        const allButtons =
            fixture.debugElement.queryAll(By.css('button[mat-icon-button]'));
        const button = allButtons.find(
            b => b.nativeElement.querySelector('mat-icon')
                     ?.textContent?.trim() === 'more_vert');
        expect(button).toBeFalsy();
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
        const chatMessages =
            fixture.debugElement.query(By.css('.chat-messages'));
        const chatInput = fixture.debugElement.query(By.css('.chat-input'));
        expect(spinner).toBeFalsy();
        expect(chatMessages).toBeTruthy();
        expect(chatInput).toBeTruthy();
      });
    });
  });

  describe('Feedback UI', () => {
    xit('should show when feature flag is on', () => {
      component.uiEvents = [new UiEvent({role: 'bot', text: 'message', event: {} as any})];

      mockFeatureFlagService.isFeedbackServiceEnabledResponse.next(true);
      fixture.detectChanges();

      let feedbackButtons =
          fixture.debugElement.query(By.css('app-message-feedback'));
      expect(feedbackButtons).toBeTruthy();
    });

    it('should hide when feature flag is off', () => {
      component.uiEvents = [new UiEvent({role: 'bot', text: 'message', event: {} as any})];

      mockFeatureFlagService.isFeedbackServiceEnabledResponse.next(false);
      fixture.detectChanges();

      let feedbackButtons =
          fixture.debugElement.query(By.css('app-message-feedback'));
      expect(feedbackButtons).toBeFalsy();
    });

    it('should hide when agent response is loading', () => {
      component.uiEvents = [new UiEvent({role: 'bot', text: 'message', event: {} as any})];

      mockAgentService.getLoadingStateResponse.next(true);
      fixture.detectChanges();

      const feedbackButtons =
          fixture.debugElement.query(By.css('app-message-feedback'));
      expect(feedbackButtons).toBeFalsy();
    });

    xit('should show after each bot message', () => {
      component.uiEvents = [
        new UiEvent({role: 'bot', text: 'message 1', event: {} as any}),
        new UiEvent({role: 'bot', text: 'message 1', event: {} as any}),
        new UiEvent({role: 'user', text: 'message 2', event: {} as any}),
        new UiEvent({role: 'bot', text: 'message 1', event: {} as any}),
        new UiEvent({role: 'bot', text: 'message 1', event: {} as any}),
      ];
      fixture.detectChanges();

      let feedbackButtons =
          fixture.debugElement.queryAll(By.css('app-message-feedback'));
      expect(feedbackButtons.length).toBe(4);
    });
  });

  describe('Computer Use', () => {
    it(
        'isComputerUseResponse should return true when image data and url are present',
        () => {
          const response: any = {
            name: 'computer_use',
            response: {
              image: {data: 'base64data', mimetype: 'image/png'},
              url: 'http://example.com'
            }
          };
          expect(isComputerUseResponse(response)).toBeTrue();
        });

    it(
        'isComputerUseResponse should return false when image data is missing',
        () => {
          const response: any = {
            name: 'computer_use',
            response: {image: null, url: 'http://example.com'}
          };
          expect(isComputerUseResponse(response)).toBeFalse();
        });
  });
});
