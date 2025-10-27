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

import {Location} from '@angular/common';
import {HttpErrorResponse} from '@angular/common/http';
import {Component} from '@angular/core';
import {ComponentFixture, TestBed} from '@angular/core/testing';
import {MatDialog, MatDialogModule} from '@angular/material/dialog';
import {MatSnackBar} from '@angular/material/snack-bar';
import {By} from '@angular/platform-browser';
import {NoopAnimationsModule} from '@angular/platform-browser/animations';
import {ActivatedRoute, NavigationEnd, Router} from '@angular/router';
import {BehaviorSubject, NEVER, of, Subject, throwError} from 'rxjs';

import {EvalCase} from '../../core/models/Eval';
import {AGENT_SERVICE, AgentService} from '../../core/services/interfaces/agent';
import {ARTIFACT_SERVICE, ArtifactService,} from '../../core/services/interfaces/artifact';
import {DOWNLOAD_SERVICE, DownloadService,} from '../../core/services/interfaces/download';
import {EVAL_SERVICE, EvalService} from '../../core/services/interfaces/eval';
import {EVENT_SERVICE, EventService} from '../../core/services/interfaces/event';
import {FEATURE_FLAG_SERVICE, FeatureFlagService,} from '../../core/services/interfaces/feature-flag';
import {GRAPH_SERVICE, GraphService} from '../../core/services/interfaces/graph';
import {LOCAL_FILE_SERVICE} from '../../core/services/interfaces/localfile';
import {SAFE_VALUES_SERVICE} from '../../core/services/interfaces/safevalues';
import {SESSION_SERVICE, SessionService,} from '../../core/services/interfaces/session';
import {STREAM_CHAT_SERVICE} from '../../core/services/interfaces/stream-chat';
import {STRING_TO_COLOR_SERVICE} from '../../core/services/interfaces/string-to-color';
import {LOCATION_SERVICE} from '../../core/services/location.service';
import {TRACE_SERVICE, TraceService} from '../../core/services/interfaces/trace';
import {VIDEO_SERVICE, VideoService} from '../../core/services/interfaces/video';
import {WEBSOCKET_SERVICE, WebSocketService,} from '../../core/services/interfaces/websocket';
import {MARKDOWN_COMPONENT} from '../markdown/markdown.component.interface';
import {MockAgentService} from '../../core/services/testing/mock-agent.service';
import {MockArtifactService} from '../../core/services/testing/mock-artifact.service';
import {MockDownloadService} from '../../core/services/testing/mock-download.service';
import {MockEvalService} from '../../core/services/testing/mock-eval.service';
import {MockEventService} from '../../core/services/testing/mock-event.service';
import {MockFeatureFlagService} from '../../core/services/testing/mock-feature-flag.service';
import {MockGraphService} from '../../core/services/testing/mock-graph.service';
import {MockLocalFileService} from '../../core/services/testing/mock-local-file.service';
import {MockSafeValuesService} from '../../core/services/testing/mock-safevalues.service';
import {MockSessionService} from '../../core/services/testing/mock-session.service';
import {MockStreamChatService} from '../../core/services/testing/mock-stream-chat.service';
import {MockStringToColorService} from '../../core/services/testing/mock-string-to-color.service';
import {MockTraceService} from '../../core/services/testing/mock-trace.service';
import {MockVideoService} from '../../core/services/testing/mock-video.service';
import {MockWebSocketService} from '../../core/services/testing/mock-websocket.service';
// 1p-ONLY-IMPORTS: import {beforeEach, describe, expect, it}
import {fakeAsync, initTestBed, tick} from '../../testing/utils';
import {EVAL_TAB_COMPONENT, EvalTabComponent,} from '../eval-tab/eval-tab.component';
import {MockMarkdownComponent} from '../markdown/testing/mock-markdown.component';
import {SidePanelComponent} from '../side-panel/side-panel.component';
import {ChatPanelComponent} from '../chat-panel/chat-panel.component';

import {ChatComponent} from './chat.component';

// Mock EvalTabComponent to satisfy the required viewChild in ChatComponent
@Component({
  selector: 'app-eval-tab',
  template: '',
  standalone: true,
})
class MockEvalTabComponent {
  showEvalHistory = false;
  toggleEvalHistoryButton() {
    this.showEvalHistory = !this.showEvalHistory;
  }
}

const SESSION_1_ID = 'session-1';
const SESSION_2_ID = 'session-2';
const TEST_APP_1_NAME = 'test-app';
const TEST_APP_2_NAME = 'test-app-2';
const ANOTHER_APP_NAME = 'another-app';
const INVALID_APP_NAME = 'invalid-app';
const USER_ID = 'user';
const EVENT_1_ID = 'event1';
const OK_BUTTON_TEXT = 'OK';
const APP_QUERY_PARAM = 'app';
const SESSION_QUERY_PARAM = 'session';
const SSE_ERROR_RESPONSE = '{"error": "SSE error"}';
const CALL_FUNCTION_USER_INPUT = 'call a function';
const FUNC1_NAME = 'func1';
const STATE_KEY = 'key';
const STATE_VALUE = 'value';
const TEST_MESSAGE = 'test message';
const TEST_FILE_NAME = 'test.txt';
const BOT_RESPONSE = 'bot response';
const NEW_RESPONSE = 'new response';

describe('ChatComponent', () => {
  let component: ChatComponent;
  let fixture: ComponentFixture<ChatComponent>;
  let mockSessionService: MockSessionService;
  let mockArtifactService: MockArtifactService;
  let mockWebSocketService: MockWebSocketService;
  let mockVideoService: MockVideoService;
  let mockStreamChatService: MockStreamChatService;
  let mockEventService: MockEventService;
  let mockDownloadService: MockDownloadService;
  let mockEvalService: MockEvalService;
  let mockTraceService: MockTraceService;
  let mockAgentService: MockAgentService;
  let mockFeatureFlagService: MockFeatureFlagService;
  let mockStringToColorService: MockStringToColorService;
  let mockSafeValuesService: MockSafeValuesService;
  let mockLocalFileService: MockLocalFileService;
  let mockDialog: jasmine.SpyObj<MatDialog>;
  let mockSnackBar: jasmine.SpyObj<MatSnackBar>;
  let mockRouter: jasmine.SpyObj<Router>;
  let mockActivatedRoute: Partial<ActivatedRoute>;
  let mockLocation: jasmine.SpyObj<Location>;
  let graphService: MockGraphService;

  beforeEach(async () => {
    mockSessionService = new MockSessionService();
    mockArtifactService = new MockArtifactService();
    mockWebSocketService = new MockWebSocketService();
    mockVideoService = new MockVideoService();
    mockStreamChatService = new MockStreamChatService();
    mockEventService = new MockEventService();
    mockDownloadService = new MockDownloadService();
    mockEvalService = new MockEvalService();
    mockTraceService = new MockTraceService();
    mockAgentService = new MockAgentService();
    mockFeatureFlagService = new MockFeatureFlagService();
    mockStringToColorService = new MockStringToColorService();
    mockSafeValuesService = new MockSafeValuesService();
    mockLocalFileService = new MockLocalFileService();
    mockSessionService.canEdit =
        jasmine.createSpy('canEdit').and.returnValue(of(true));
    mockStringToColorService.stc.and.returnValue('#8c8526ff');

    mockSessionService.createSessionResponse.next(
        {id: SESSION_1_ID, state: {}});
    mockTraceService.selectedTraceRow$.next(undefined);
    mockTraceService.hoveredMessageIndices$.next([]);
    mockFeatureFlagService.isImportSessionEnabledResponse.next(true);
    mockFeatureFlagService.isEditFunctionArgsEnabledResponse.next(true);
    mockFeatureFlagService.isSessionUrlEnabledResponse.next(true);
    mockFeatureFlagService.isApplicationSelectorEnabledResponse.next(true);
    mockFeatureFlagService.isTokenStreamingEnabledResponse.next(true);
    mockFeatureFlagService.isEventFilteringEnabledResponse.next(true);
    mockFeatureFlagService.isDeleteSessionEnabledResponse.next(true);

    mockDialog = jasmine.createSpyObj('MatDialog', ['open']);
    mockSnackBar = jasmine.createSpyObj('MatSnackBar', ['open']);
    mockRouter = jasmine.createSpyObj('Router', ['navigate', 'createUrlTree'], {
      events: of(new NavigationEnd(1, '', '')),
    });
    mockLocation = jasmine.createSpyObj('Location', ['replaceState']);

    mockActivatedRoute = {
      snapshot: {
        queryParams: {},
      } as any,
      queryParams: of({}),
    };

    const appName = new BehaviorSubject<string>(TEST_APP_1_NAME);
    mockAgentService.setApp.and.callFake((p) => {
      appName.next(p);
    });
    mockAgentService.getApp.and.callFake(() => {
      return appName;
    });
    mockAgentService.getLoadingStateResponse.next(false);
    mockRouter.createUrlTree.and.returnValue({
      toString: () => '/?session=session-id',
    } as any);

    graphService = new MockGraphService();
    graphService.render.and.returnValue(Promise.resolve('svg'));
    mockEventService.getEventResponse.next({
      dotSrc: 'digraph {A -> B}',
    });

    initTestBed();  // required for 1p compat
    await TestBed
        .configureTestingModule({
          imports: [
            ChatComponent,
            MatDialogModule,
            NoopAnimationsModule,
            MockEvalTabComponent,
          ],
          providers: [
            {provide: EVAL_TAB_COMPONENT, useValue: EvalTabComponent},
            {provide: SESSION_SERVICE, useValue: mockSessionService},
            {provide: ARTIFACT_SERVICE, useValue: mockArtifactService},
            {provide: WEBSOCKET_SERVICE, useValue: mockWebSocketService},
            {provide: VIDEO_SERVICE, useValue: mockVideoService},
            {provide: EVENT_SERVICE, useValue: mockEventService},
            {provide: STREAM_CHAT_SERVICE, useValue: mockStreamChatService},
            {provide: DOWNLOAD_SERVICE, useValue: mockDownloadService},
            {provide: EVAL_SERVICE, useValue: mockEvalService},
            {provide: TRACE_SERVICE, useValue: mockTraceService},
            {provide: AGENT_SERVICE, useValue: mockAgentService},
            {provide: FEATURE_FLAG_SERVICE, useValue: mockFeatureFlagService},
            {
              provide: STRING_TO_COLOR_SERVICE,
              useValue: mockStringToColorService,
            },
            {provide: GRAPH_SERVICE, useValue: graphService},
            {provide: SAFE_VALUES_SERVICE, useValue: mockSafeValuesService},
            {provide: LOCAL_FILE_SERVICE, useValue: mockLocalFileService},
            {provide: MatDialog, useValue: mockDialog},
            {provide: MatSnackBar, useValue: mockSnackBar},
            {provide: Router, useValue: mockRouter},
            {provide: ActivatedRoute, useValue: mockActivatedRoute},
            {provide: LOCATION_SERVICE, useValue: mockLocation},
            {provide: MARKDOWN_COMPONENT, useValue: MockMarkdownComponent},
          ],
        })
        .compileComponents();

    fixture = TestBed.createComponent(ChatComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  describe('Component Initialization', () => {
    it('should create', () => {
      expect(component).toBeTruthy();
    });

    describe('when listApps fails', () => {
      let error: HttpErrorResponse;
      beforeEach(() => {
        error = new HttpErrorResponse({error: 'Failed to load apps'});
        mockAgentService.listAppsResponse.error(error);
        fixture = TestBed.createComponent(ChatComponent);
        component = fixture.componentInstance;
        fixture.detectChanges();
      });
      it('should set loadingError', () => {
        expect(component.loadingError()).toBe(error.message);
      });
    });

    describe('when app in URL is invalid', () => {
      beforeEach(async () => {
        mockAgentService.listAppsResponse.next(
            [TEST_APP_1_NAME, TEST_APP_2_NAME]);

        mockActivatedRoute.snapshot!.queryParams = {
          [APP_QUERY_PARAM]: INVALID_APP_NAME,
        };
        mockAgentService.listAppsResponse.next([TEST_APP_1_NAME]);
        fixture = TestBed.createComponent(ChatComponent);
        component = fixture.componentInstance;
        fixture.detectChanges();
        await fixture.whenStable();
      });
      it('should show snackbar', () => {
        expect(mockSnackBar.open)
            .toHaveBeenCalledWith(
                `Agent '${INVALID_APP_NAME}' not found`,
                OK_BUTTON_TEXT,
            );
      });
    });
  });

  describe('Session Management', () => {
    describe('when session not in url', () => {
      beforeEach(() => {
        mockAgentService.listAppsResponse.next(
            [TEST_APP_1_NAME, TEST_APP_2_NAME]);

        mockActivatedRoute.snapshot!.queryParams = {
          [APP_QUERY_PARAM]: TEST_APP_2_NAME,
        };
        component.ngOnInit();
      });
      it('should create new session on init', () => {
        expect(mockSessionService.createSession)
            .toHaveBeenCalledWith(
                USER_ID,
                TEST_APP_2_NAME,
            );
        expect(component.sessionId).toBe(SESSION_1_ID);
      });
    });

    describe('when session ID is provided in URL', () => {
      beforeEach(() => {
        mockAgentService.listAppsResponse.next([TEST_APP_1_NAME]);
        mockFeatureFlagService.isSessionUrlEnabledResponse.next(true);
        mockActivatedRoute.snapshot!.queryParams = {
          [APP_QUERY_PARAM]: TEST_APP_1_NAME,
          [SESSION_QUERY_PARAM]: SESSION_2_ID,
        };
        mockSessionService.getSessionResponse.next(
            {id: SESSION_2_ID, state: {}, events: []});
      });

      describe('on initial load without application selector', () => {
        beforeEach(async () => {
          mockFeatureFlagService.isApplicationSelectorEnabledResponse.next(
              false);
          fixture = TestBed.createComponent(ChatComponent);
          component = fixture.componentInstance;
          fixture.detectChanges();
          await fixture.whenStable();
        });
        it('should load session from URL', () => {
          expect(mockSessionService.getSession)
              .toHaveBeenCalledWith(
                  USER_ID,
                  TEST_APP_1_NAME,
                  SESSION_2_ID,
              );
          expect(component.sessionId).toBe(SESSION_2_ID);
        });
      });

      describe('on app change', () => {
        beforeEach(async () => {
          fixture = TestBed.createComponent(ChatComponent);
          component = fixture.componentInstance;
          component.ngOnInit();
          fixture.detectChanges();
          component.selectApp(TEST_APP_2_NAME);
          await fixture.whenStable();
        });
        it('should load session from URL', () => {
          expect(mockSessionService.getSession)
              .toHaveBeenCalledWith(
                  USER_ID,
                  TEST_APP_2_NAME,
                  SESSION_2_ID,
              );
          expect(component.sessionId).toBe(SESSION_2_ID);
        });
      });
    });

    describe('when session in URL is not found', () => {
      beforeEach(async () => {
        mockActivatedRoute.snapshot!.queryParams = {
          [APP_QUERY_PARAM]: TEST_APP_1_NAME,
          [SESSION_QUERY_PARAM]: SESSION_2_ID,
        };
        mockSessionService.getSession.and.callFake(
            (userId: string, app: string, sessionId: string) => {
              if (sessionId === SESSION_2_ID) {
                return throwError(() => new HttpErrorResponse({status: 404}));
              }
              return of({id: SESSION_1_ID, state: {}, events: []});
            },
        );
        fixture = TestBed.createComponent(ChatComponent);
        component = fixture.componentInstance;
        fixture.detectChanges();
        component.selectApp(TEST_APP_2_NAME);
        await fixture.whenStable();
      });

      it('should try load the session', () => {
        expect(mockSessionService.getSession)
            .toHaveBeenCalledWith(
                USER_ID,
                TEST_APP_2_NAME,
                SESSION_2_ID,
            );
      });


      it('should show snackbar', () => {
        expect(mockSnackBar.open)
            .toHaveBeenCalledWith(
                'Cannot find specified session. Creating a new one.',
                OK_BUTTON_TEXT,
            );
      });

      it('should create new session', () => {
        expect(mockSessionService.createSession)
            .toHaveBeenCalledWith(
                USER_ID,
                TEST_APP_2_NAME,
            );
      });

      it('should load the new session', () => {
        expect(mockSessionService.getSession)
            .toHaveBeenCalledWith(
                USER_ID,
                TEST_APP_1_NAME,
                SESSION_1_ID,
            );
      });
    });

    describe('when app selection changes and session URL is disabled', () => {
      beforeEach(async () => {
        mockFeatureFlagService.isSessionUrlEnabledResponse.next(false);
        fixture = TestBed.createComponent(ChatComponent);
        component = fixture.componentInstance;
        fixture.detectChanges();
        component.selectApp(ANOTHER_APP_NAME);
        await fixture.whenStable();
      });
      it('should create new session', () => {
        expect(mockAgentService.setApp).toHaveBeenCalledWith(ANOTHER_APP_NAME);
        expect(mockSessionService.createSession).toHaveBeenCalled();
      });
    });

    describe('when onNewSessionClick() is called', () => {
      beforeEach(() => {
        component.messages.set([{role: USER_ID, text: 'hello'}]);
        component.artifacts = [{}];
        component.eventData = new Map([['1', {}]]);
        component.traceData = [{}];
        component.onNewSessionClick();
      });
      it('should clear data', () => {
        expect(component.messages().length).toBe(0);
        expect(component.artifacts.length).toBe(0);
        expect(component.eventData.size).toBe(0);
        expect(component.traceData.length).toBe(0);
      });
      it('should create new session', () => {
        expect(mockSessionService.createSession).toHaveBeenCalled();
      });
    });

    describe('when deleting a session', () => {
      describe('and dialog is confirmed', () => {
        beforeEach(() => {
          mockDialog.open.and.returnValue({
            afterClosed: () => of(true),
          } as any);
          const sessionTabSpy = jasmine.createSpyObj(
              'sessionTab', ['refreshSession', 'getSession']);
          sessionTabSpy.refreshSession.and.returnValue(
              {id: SESSION_2_ID} as any);
          spyOnProperty(component, 'sessionTab', 'get')
              .and.returnValue(sessionTabSpy);
          component.deleteSession(SESSION_1_ID);
        });
        it('should delete session', () => {
          expect(mockDialog.open).toHaveBeenCalled();
          expect(mockSessionService.deleteSession)
              .toHaveBeenCalledWith(
                  USER_ID,
                  TEST_APP_1_NAME,
                  SESSION_1_ID,
              );
        });
      });

      describe('and dialog is cancelled', () => {
        beforeEach(() => {
          mockDialog.open.and.returnValue({
            afterClosed: () => of(false),
          } as any);
          component.deleteSession(SESSION_1_ID);
        });
        it('should not delete session', () => {
          expect(mockDialog.open).toHaveBeenCalled();
          expect(mockSessionService.deleteSession).not.toHaveBeenCalled();
        });
      });
    });

    describe(
        'when updateWithSelectedSession() is called with a session', () => {
          const mockSession = {
            id: SESSION_1_ID,
            state: {},
            events: [
              {
                id: 'event-1',
                author: 'user',
                content: {parts: [{text: 'user message'}]},
              },
              {
                id: 'event-2',
                author: 'bot',
                content: {parts: [{text: 'bot response'}]},
              },
            ],
          };
          beforeEach(() => {
            mockEventService.getTraceResponse.next([]);
            component['updateWithSelectedSession'](mockSession as any);
            fixture.detectChanges();
          });

          it('should update session id and state', () => {
            expect(component.sessionId).toBe(SESSION_1_ID);
            expect(component.currentSessionState).toEqual({});
          });

          it('should reset trace service', () => {
            expect(mockTraceService.resetTraceService).toHaveBeenCalled();
          });

          it('should populate messages from session events', () => {
            expect(component.messages().length).toBe(2);
            expect(component.messages()[0]).toEqual(jasmine.objectContaining({
              role: 'user',
              text: 'user message'
            }));
            expect(component.messages()[1]).toEqual(jasmine.objectContaining({
              role: 'bot',
              text: 'bot response'
            }));
          });

          it('should call getTrace', () => {
            expect(mockEventService.getTrace)
                .toHaveBeenCalledWith(SESSION_1_ID);
          });

          describe('canEdit', () => {
            it('should be called', () => {
              expect(mockSessionService.canEdit)
                  .toHaveBeenCalledWith(USER_ID, mockSession);
            });

            describe('when canEdit returns false', () => {
              beforeEach(() => {
                mockSessionService.canEdit.and.returnValue(of(false));
                mockEventService.getTraceResponse.next([]);
                component['updateWithSelectedSession'](mockSession as any);
                fixture.detectChanges();
              });

              it('should set canEditSession to false', () => {
                expect(component.chatPanel()?.canEditSession()).toBe(false);
              });
            });

            describe('when canEdit returns true', () => {
              beforeEach(() => {
                mockSessionService.canEdit.and.returnValue(of(true));
                mockEventService.getTraceResponse.next([]);
                component['updateWithSelectedSession'](mockSession as any);
                fixture.detectChanges();
              });

              it('should set canEditSession to true', () => {
                expect(component.chatPanel()?.canEditSession()).toBe(true);
              });
            });
          });
        });
  });

  describe('UI and State', () => {
    beforeEach(() => {
      mockAgentService.listAppsResponse.next(
          [TEST_APP_1_NAME, TEST_APP_2_NAME]);
    });

    describe('toggleSidePanel', () => {
      beforeEach(() => {
        spyOn(component.sideDrawer()!, 'open');
        spyOn(component.sideDrawer()!, 'close');
      });

      describe('when panel is open', () => {
        beforeEach(() => {
          component.showSidePanel = true;
          component.toggleSidePanel();
        });
        it('closes panel', () => {
          expect(component.sideDrawer()!.close).toHaveBeenCalled();
          expect(component.showSidePanel).toBe(false);
        });
      });
      describe('when panel is closed', () => {
        beforeEach(() => {
          component.showSidePanel = false;
          component.toggleSidePanel();
        });
        it('opens panel', () => {
          expect(component.sideDrawer()!.open).toHaveBeenCalled();
          expect(component.showSidePanel).toBe(true);
        });
      });
    });

    describe('delete session button', () => {
      describe('when isDeleteSessionEnabled is false', () => {
        beforeEach(() => {
          mockFeatureFlagService.isDeleteSessionEnabledResponse.next(false);
          fixture.detectChanges();
        });

        it('should not be visible', () => {
          const deleteButton = fixture.debugElement.query(
              By.css('[matTooltip="Delete current session"]'));
          expect(deleteButton).toBeFalsy();
        });
      });

      describe('when isDeleteSessionEnabled is true', () => {
        beforeEach(() => {
          mockFeatureFlagService.isDeleteSessionEnabledResponse.next(true);
          fixture.detectChanges();
        });

        it('should be visible', () => {
          const deleteButton = fixture.debugElement.query(
              By.css('[matTooltip="Delete current session"]'));
          expect(deleteButton).toBeTruthy();
        });
      });
    });

    describe('when clickEvent() is called', () => {
      beforeEach(() => {
        component.sessionId = SESSION_1_ID;
        component.messages.set(
            [{role: 'bot', text: 'response', eventId: EVENT_1_ID}]);
        spyOn(component.sideDrawer()!, 'open');
      });

      it('should open side panel with event details', () => {
        component.eventData = new Map([[EVENT_1_ID, {id: EVENT_1_ID}]]);
        component.clickEvent(0);
        expect(component.sideDrawer()!.open).toHaveBeenCalled();
        expect(component.selectedEvent.id).toBe(EVENT_1_ID);
        expect(mockEventService.getEventTrace).toHaveBeenCalledWith({
          id: EVENT_1_ID
        });
        expect(mockEventService.getEvent)
            .toHaveBeenCalledWith(
                USER_ID,
                TEST_APP_1_NAME,
                SESSION_1_ID,
                EVENT_1_ID,
            );
      });

      it('should call getEventTrace with filter and parse llm request/response',
         () => {
           const invocationId = 'inv-1';
           const timestamp = 123456789;
           component.eventData = new Map([[
             EVENT_1_ID, {
               id: EVENT_1_ID,
               invocationId,
               timestampInMillis: timestamp,
             }
           ]]);
           const llmRequest = {prompt: 'test prompt'};
           const llmResponse = {response: 'test response'};
           mockEventService.getEventTraceResponse.next({
             'gcp.vertex.agent.llm_request': JSON.stringify(llmRequest),
             'gcp.vertex.agent.llm_response': JSON.stringify(llmResponse),
           });

           component.clickEvent(0);

           expect(mockEventService.getEventTrace).toHaveBeenCalledWith({
             id: EVENT_1_ID,
             invocationId,
             timestamp,
           });
           expect(component.llmRequest).toEqual(llmRequest);
           expect(component.llmResponse).toEqual(llmResponse);
         });
    });

    describe('when updateState() is called', () => {
      const newState = {[STATE_KEY]: STATE_VALUE};
      beforeEach(() => {
        mockDialog.open.and.returnValue({
          afterClosed: () => of(newState),
        } as any);
        component.updateState();
      });
      it('should open dialog', () => {
        expect(mockDialog.open).toHaveBeenCalled();
      });
      it('should update session state', () => {
        expect(component.updatedSessionState()).toEqual(newState);
      });
    });

    describe('when removeStateUpdate() is called', () => {
      beforeEach(() => {
        component.updatedSessionState.set({[STATE_KEY]: STATE_VALUE});
        component.removeStateUpdate();
      });
      it('should remove state update', () => {
        expect(component.updatedSessionState()).toBeNull();
      });
    });
  });

  describe('Bi-directional Streaming', () => {
    beforeEach(() => {
      mockAgentService.listAppsResponse.next(
          [TEST_APP_1_NAME, TEST_APP_2_NAME]);
    });

    describe('when bidi streaming is restarted', () => {
      beforeEach(() => {
        component.sessionHasUsedBidi.add(component.sessionId);
        component.startAudioRecording();
      });
      it('should show snackbar', () => {
        expect(mockSnackBar.open)
            .toHaveBeenCalledWith(
                'Restarting bidirectional streaming is not currently supported. Please refresh the page or start a new session.',
                OK_BUTTON_TEXT,
            );
      });
    });
  });

  describe('ChatPanel integration', () => {
    beforeEach(() => {
      mockAgentService.listAppsResponse.next(
          [TEST_APP_1_NAME, TEST_APP_2_NAME]);
    });

    describe('when appName is set', () => {
      it('should display chat-panel', () => {
        const chatPanel =
            fixture.debugElement.query(By.directive(ChatPanelComponent));
        expect(chatPanel).toBeTruthy();
      });
    });

    describe('Message Passing', () => {
      beforeEach(async () => {
        component.messages.set([{role: 'user', text: TEST_MESSAGE}]);
        fixture.detectChanges();
        await fixture.whenStable();
        fixture.detectChanges();
      });
      it('should pass messages to chat-panel', () => {
        const chatPanelComponent =
            fixture.debugElement.query(By.directive(ChatPanelComponent))
                .componentInstance;
        expect(chatPanelComponent.messages).toEqual(component.messages());
        const messageCards = fixture.debugElement.queryAll(
            By.css('app-chat-panel .message-card'));
        expect(messageCards.length).toBe(1);
        expect(messageCards[0].nativeElement.textContent)
            .toContain(TEST_MESSAGE);
      });

      describe('when event contains multiple text parts', () => {
        it('should combine consecutive text parts into a single message',
           async () => {
             const sseEvent = {
               id: 'event-1',
               author: 'bot',
               content:
                   {role: 'bot', parts: [{text: 'Hello '}, {text: 'World!'}]},
             };
             component.messages.set([]);
             component.userInput = 'test message';
             await component.sendMessage(
                 new KeyboardEvent('keydown', {key: 'Enter'}));
             mockAgentService.runSseResponse.next(sseEvent);
             fixture.detectChanges();

             const botMessages =
                 component.messages().filter(m => m.role === 'bot');
             expect(botMessages.length).toBe(1);
             expect(botMessages[0].text).toBe('Hello World!');
           });

        it('should not combine non-consecutive text parts', async () => {
          const sseEvent = {
            id: 'event-1',
            author: 'bot',
            content: {
              role: 'bot',
              parts: [
                {text: 'Hello '},
                {functionCall: {name: 'foo', args: {}}},
                {text: 'World!'},
              ]
            },
          };
          component.messages.set([]);
          component.userInput = 'test message';
          await component.sendMessage(
              new KeyboardEvent('keydown', {key: 'Enter'}));
          mockAgentService.runSseResponse.next(sseEvent);
          fixture.detectChanges();

          const botMessages =
              component.messages().filter(m => m.role === 'bot');
          expect(botMessages.length).toBe(3);
          expect(botMessages[0].text).toBe('Hello ');
          expect(botMessages[1].functionCall).toEqual({name: 'foo', args: {}});
          expect(botMessages[2].text).toBe('World!');
        });
      });
    });

    describe('when chat-panel emits sendMessage', () => {
      const mockEvent = new KeyboardEvent('keydown', {key: 'Enter'});
      beforeEach(() => {
        spyOn(component, 'sendMessage').and.callThrough();
        mockAgentService.runSseResponse.next(
            {content: {role: 'bot', parts: []}});
        const chatPanelDebugEl =
            fixture.debugElement.query(By.directive(ChatPanelComponent));
        chatPanelDebugEl.triggerEventHandler('sendMessage', mockEvent);
      });
      it('should call sendMessage', () => {
        expect(component.sendMessage).toHaveBeenCalledWith(mockEvent);
      });
    });

    describe('when chat-panel emits clickEvent', () => {
      beforeEach(() => {
        spyOn(component, 'clickEvent');
        const chatPanelDebugEl =
            fixture.debugElement.query(By.directive(ChatPanelComponent));
        chatPanelDebugEl.triggerEventHandler('clickEvent', 0);
      });
      it('should call clickEvent', () => {
        expect(component.clickEvent).toHaveBeenCalledWith(0);
      });
    });

    describe('when chat-panel emits updateState', () => {
      beforeEach(() => {
        spyOn(component, 'updateState');
        const chatPanelDebugEl =
            fixture.debugElement.query(By.directive(ChatPanelComponent));
        chatPanelDebugEl.triggerEventHandler('updateState', undefined);
      });
      it('should call updateState', () => {
        expect(component.updateState).toHaveBeenCalled();
      });
    });

    describe('when chat-panel emits toggleAudioRecording', () => {
      beforeEach(() => {
        spyOn(component, 'toggleAudioRecording');
        const chatPanelDebugEl =
            fixture.debugElement.query(By.directive(ChatPanelComponent));
        chatPanelDebugEl.triggerEventHandler('toggleAudioRecording', undefined);
      });
      it('should call toggleAudioRecording', () => {
        expect(component.toggleAudioRecording).toHaveBeenCalled();
      });
    });
  });

  describe('File Handling', () => {
    beforeEach(() => {
      mockAgentService.listAppsResponse.next(
          [TEST_APP_1_NAME, TEST_APP_2_NAME]);
    });

    describe('when onFileSelect() is called', () => {
      beforeEach(() => {
        const file = new File([''], TEST_FILE_NAME, {type: 'text/plain'});
        const event = {target: {files: [file]}} as unknown as Event;
        component.onFileSelect(event);
      });
      it('should add file to selectedFiles', () => {
        expect(component.selectedFiles.length).toBe(1);
        expect(component.selectedFiles[0].file.name).toBe(TEST_FILE_NAME);
      });
    });

    describe('when removeFile() is called', () => {
      beforeEach(() => {
        component.selectedFiles =
            [{file: new File([''], TEST_FILE_NAME), url: 'blob:url'}];
        component.removeFile(0);
      });
      it('should remove file from selectedFiles', () => {
        expect(component.selectedFiles.length).toBe(0);
      });
    });
  });

  describe('Eval Case Editing', () => {
    const mockEvalCase: EvalCase = {
      evalId: 'eval-1',
      sessionInput: {},
      creationTimestamp: 12345,
      conversation: [{
        invocationId: 'inv-1',
        creationTimestamp: 12345,
        userContent: {parts: [{text: 'user message'}]},
        finalResponse: {parts: [{text: BOT_RESPONSE}]},
      }],
    };
    const mockMessage = {
      text: BOT_RESPONSE,
      isEditing: false,
      invocationIndex: 0,
      finalResponsePartIndex: 0
    };

    beforeEach(() => {
      mockAgentService.listAppsResponse.next(
          [TEST_APP_1_NAME, TEST_APP_2_NAME]);

      component.evalCase = mockEvalCase;
      component.messages.set([mockMessage]);
      fixture.detectChanges();
    });

    describe('when editEvalCase() is called', () => {
      beforeEach(() => {
        (component as any).editEvalCase();
      });
      it('should set isEvalEditMode to true', () => {
        expect(component.isEvalEditMode()).toBe(true);
      });
    });

    describe('when editEvalCaseMessage() is called', () => {
      const message = {role: 'user', text: 'hello', isEditing: false};
      let mockTextarea: any;

      beforeEach(() => {
        mockTextarea = {
          value: message.text,
          focus: jasmine.createSpy('focus'),
          setSelectionRange: jasmine.createSpy('setSelectionRange'),
        };
        component.chatPanel()!.textarea = {
          nativeElement: mockTextarea,
        };
      });

      it('should set editing state', () => {
        component['editEvalCaseMessage'](message);

        expect(component.isEvalCaseEditing()).toBe(true);
        expect(component.userEditEvalCaseMessage).toBe(message.text);
        expect(message.isEditing).toBe(true);
      });

      it('should set cursor position', fakeAsync(() => {
           component['editEvalCaseMessage'](message);

           tick();
           expect(mockTextarea.setSelectionRange)
               .toHaveBeenCalledWith(message.text.length, message.text.length);
         }));

      it('should focus textarea ', fakeAsync(() => {
           component['editEvalCaseMessage'](message);

           tick();
           expect(mockTextarea.focus).toHaveBeenCalled();
         }));
    });

    describe('when editEvalCaseMessage() is called with newline at end', () => {
      const message = {role: 'user', text: 'hello\n', isEditing: false};
      let mockTextarea: any;

      beforeEach(() => {
        mockTextarea = {
          value: message.text,
          focus: jasmine.createSpy('focus'),
          setSelectionRange: jasmine.createSpy('setSelectionRange'),
        };
        component.chatPanel()!.textarea = {
          nativeElement: mockTextarea,
        };
      });

      it('should set cursor position before newline', fakeAsync(() => {
           component['editEvalCaseMessage'](message);

           tick();
           expect(mockTextarea.setSelectionRange)
               .toHaveBeenCalledWith(
                   message.text.length - 1, message.text.length - 1);
         }));

      it('should focus textarea', fakeAsync(() => {
           component['editEvalCaseMessage'](message);

           tick();
           expect(mockTextarea.focus).toHaveBeenCalled();
         }));
    });

    describe('when cancelEditMessage() is called', () => {
      beforeEach(() => {
        mockMessage.isEditing = true;
        component.isEvalCaseEditing.set(true);
        (component as any).cancelEditMessage(mockMessage);
      });
      it('should exit editing mode', () => {
        expect(mockMessage.isEditing).toBe(false);
        expect(component.isEvalCaseEditing()).toBe(false);
      });
    });

    describe('when saveEditMessage() is called', () => {
      beforeEach(() => {
        mockMessage.isEditing = true;
        component.isEvalCaseEditing.set(true);
        component.userEditEvalCaseMessage = NEW_RESPONSE;
        (component as any).saveEditMessage(mockMessage);
      });
      it('should save message', () => {
        expect(mockMessage.text).toBe(NEW_RESPONSE);
        expect(component.hasEvalCaseChanged()).toBe(true);
        expect(component.updatedEvalCase!.conversation[0]
                   .finalResponse!.parts![0]!.text)
            .toBe(NEW_RESPONSE);
      });
      it('should exit editing mode', () => {
        expect(mockMessage.isEditing).toBe(false);
        expect(component.isEvalCaseEditing()).toBe(false);
      });
    });

    describe('when deleteEvalCaseMessage() is called', () => {
      beforeEach(() => {
        (component as any).deleteEvalCaseMessage(mockMessage, 0);
      });
      it('should delete message', () => {
        expect(component.messages().length).toBe(0);
        expect(component.hasEvalCaseChanged()).toBe(true);
        expect(component.updatedEvalCase!.conversation[0]
                   .finalResponse!.parts!.length)
            .toBe(0);
      });
    });

    describe('when saveEvalCase() is called', () => {
      beforeEach(() => {
        component.updatedEvalCase = mockEvalCase;
        mockEvalService.updateEvalCaseResponse.next({});
        (component as any).saveEvalCase();
      });
      it('should call updateEvalCase', () => {
        expect(mockEvalService.updateEvalCase).toHaveBeenCalled();
      });
      it('should reset edit mode', () => {
        expect(component.isEvalEditMode()).toBe(false);
      });
    });

    describe('when cancelEditEvalCase() is called', () => {
      beforeEach(() => {
        component.isEvalEditMode.set(true);
        (component as any).cancelEditEvalCase();
      });
      it('should reset edit mode', () => {
        expect(component.isEvalEditMode()).toBe(false);
      });
    });
  });

  describe('Feature Disabling', () => {
    describe('when token streaming is disabled', () => {
      beforeEach(() => {
        mockFeatureFlagService.isTokenStreamingEnabledResponse.next(false);
        fixture.detectChanges();
      });

      it('should have the token streaming toggle disabled', () => {
        const slideToggle =
            fixture.debugElement.query(By.css('mat-slide-toggle'));
        expect(slideToggle.componentInstance.disabled).toBe(true);
      });
    });
  });
});
