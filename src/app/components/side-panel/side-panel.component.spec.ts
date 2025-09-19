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
import {ComponentFixture, TestBed} from '@angular/core/testing';
import {MatDialog, MatDialogModule} from '@angular/material/dialog';
import {MatPaginator, PageEvent} from '@angular/material/paginator';
import {MatSnackBar} from '@angular/material/snack-bar';
import {MatTabGroup} from '@angular/material/tabs';
import {By} from '@angular/platform-browser';
import {NoopAnimationsModule} from '@angular/platform-browser/animations';
import {ActivatedRoute, Router} from '@angular/router';
import {of} from 'rxjs';

import {AGENT_SERVICE, AgentService} from '../../core/services/agent.service';
import {ARTIFACT_SERVICE, ArtifactService,} from '../../core/services/artifact.service';
import {AUDIO_SERVICE, AudioService} from '../../core/services/audio.service';
import {DOWNLOAD_SERVICE, DownloadService,} from '../../core/services/download.service';
import {EVAL_SERVICE, EvalService} from '../../core/services/eval.service';
import {EVENT_SERVICE, EventService} from '../../core/services/event.service';
import {FEATURE_FLAG_SERVICE, FeatureFlagService,} from '../../core/services/feature-flag.service';
import {SESSION_SERVICE, SessionService,} from '../../core/services/session.service';
import {TRACE_SERVICE, TraceService} from '../../core/services/trace.service';
import {VIDEO_SERVICE, VideoService} from '../../core/services/video.service';
import {SCREEN_SHARING_SERVICE, ScreenSharingService} from '../../core/services/screensharing.service';
import {WEBSOCKET_SERVICE, WebSocketService,} from '../../core/services/websocket.service';

import {SidePanelComponent} from './side-panel.component';

const TABS_CONTAINER_SELECTOR = By.css('.tabs-container');
const DETAILS_PANEL_SELECTOR = By.css('.details-panel-container');
const HEADER_CLOSE_BUTTON_SELECTOR =
    By.css('.drawer-header .material-symbols-outlined');
const TAB_HEADERS_SELECTOR = By.css('[role="tab"]');
const EVENT_TAB_SELECTOR = By.css('app-event-tab');
const SESSION_TAB_SELECTOR = By.css('app-session-tab');
const EVAL_TAB_SELECTOR = By.css('app-eval-tab');
const DETAILS_PANEL_CLOSE_BUTTON_SELECTOR =
    By.css('.details-panel-container mat-icon');
const EVENT_GRAPH_SELECTOR = By.css('.event-graph-container div');

const EVENTS_TAB_INDEX = 1;
const SESSIONS_TAB_INDEX = 4;
const EVAL_TAB_INDEX = 5;

describe('SidePanelComponent', () => {
  let component: SidePanelComponent;
  let fixture: ComponentFixture<SidePanelComponent>;
  let mockSessionService: jasmine.SpyObj<SessionService>;
  let mockArtifactService: jasmine.SpyObj<ArtifactService>;
  let mockAudioService: jasmine.SpyObj<AudioService>;
  let mockWebSocketService: jasmine.SpyObj<WebSocketService>;
  let mockVideoService: jasmine.SpyObj<VideoService>;
  let mockScreenSharingService: jasmine.SpyObj<ScreenSharingService>;
  let mockEventService: jasmine.SpyObj<EventService>;
  let mockDownloadService: jasmine.SpyObj<DownloadService>;
  let mockEvalService: jasmine.SpyObj<EvalService>;
  let mockTraceService: jasmine.SpyObj<TraceService>;
  let mockAgentService: jasmine.SpyObj<AgentService>;
  let mockFeatureFlagService: jasmine.SpyObj<FeatureFlagService>;
  let mockDialog: jasmine.SpyObj<MatDialog>;
  let mockSnackBar: jasmine.SpyObj<MatSnackBar>;
  let mockRouter: jasmine.SpyObj<Router>;
  let mockActivatedRoute: Partial<ActivatedRoute>;
  let mockLocation: jasmine.SpyObj<Location>;

  beforeEach(async () => {
    mockSessionService = jasmine.createSpyObj(
        'SessionService',
        ['createSession', 'getSession', 'deleteSession', 'listSessions'],
        {
          sessions$: of([]),
        },
    );
    mockArtifactService = jasmine.createSpyObj(
        'ArtifactService',
        ['getArtifactVersion'],
    );
    mockAudioService = jasmine.createSpyObj(
        'AudioService',
        ['startRecording', 'stopRecording'],
    );
    mockWebSocketService = jasmine.createSpyObj(
        'WebSocketService',
        ['onCloseReason', 'connect', 'closeConnection'],
    );
    mockVideoService = jasmine.createSpyObj(
        'VideoService',
        ['startRecording', 'stopRecording'],
    );
    mockScreenSharingService = jasmine.createSpyObj(
        'ScreenSharingService',
        ['startScreenSharing', 'stopScreenSharing'],
    );
    mockEventService = jasmine.createSpyObj('EventService', ['getTrace']);
    mockDownloadService = jasmine.createSpyObj(
        'DownloadService',
        ['downloadObjectAsJson'],
    );
    mockEvalService = jasmine.createSpyObj(
        'EvalService',
        [
          'getEvalSets',
          'listEvalCases',
          'runEval',
          'getEvalCase',
          'deleteEvalCase',
          'listEvalResults',
          'getEvalResult',
        ],
        {
          evalSets$: of([]),
          evalResults$: of([]),
        },
    );
    mockTraceService = jasmine.createSpyObj(
        'TraceService',
        ['setEventData', 'setMessages', 'selectedRow', 'setHoveredMessages'],
        {
          selectedTraceRow$: of(null),
          hoveredMessageIndicies$: of([]),
        },
    );
    mockAgentService = jasmine.createSpyObj(
        'AgentService',
        ['listApps', 'getApp', 'getLoadingState', 'setApp', 'runSse'],
    );
    mockFeatureFlagService = jasmine.createSpyObj(
        'FeatureFlagService',
        ['isImportSessionEnabled', 'isEditFunctionArgsEnabled'],
    );
    mockDialog = jasmine.createSpyObj('MatDialog', ['open']);
    mockSnackBar = jasmine.createSpyObj('MatSnackBar', ['open']);
    mockRouter = jasmine.createSpyObj('Router', ['navigate']);
    mockLocation = jasmine.createSpyObj('Location', ['replaceState']);
    mockActivatedRoute = {
      snapshot: {
        queryParams: {},
      } as any,
      queryParams: of({}),
    };
    mockEvalService.getEvalSets.and.returnValue(of([]));
    mockSessionService.listSessions.and.returnValue(of([]));
    mockEvalService.listEvalResults.and.returnValue(of([]));
    mockFeatureFlagService.isEditFunctionArgsEnabled.and.returnValue(of(false));
    mockFeatureFlagService.isImportSessionEnabled.and.returnValue(of(false));
    mockEvalService.getEvalResult.and.returnValue(of({}));

    await TestBed
        .configureTestingModule({
          imports: [SidePanelComponent, MatDialogModule, NoopAnimationsModule],
          providers: [
            {provide: SESSION_SERVICE, useValue: mockSessionService},
            {provide: ARTIFACT_SERVICE, useValue: mockArtifactService},
            {provide: AUDIO_SERVICE, useValue: mockAudioService},
            {provide: WEBSOCKET_SERVICE, useValue: mockWebSocketService},
            {provide: VIDEO_SERVICE, useValue: mockVideoService},
            {provide: SCREEN_SHARING_SERVICE, useValue: mockScreenSharingService},
            {provide: EVENT_SERVICE, useValue: mockEventService},
            {provide: DOWNLOAD_SERVICE, useValue: mockDownloadService},
            {provide: EVAL_SERVICE, useValue: mockEvalService},
            {provide: TRACE_SERVICE, useValue: mockTraceService},
            {provide: AGENT_SERVICE, useValue: mockAgentService},
            {provide: FEATURE_FLAG_SERVICE, useValue: mockFeatureFlagService},
            {provide: MatDialog, useValue: mockDialog},
            {provide: MatSnackBar, useValue: mockSnackBar},
            {provide: Router, useValue: mockRouter},
            {provide: ActivatedRoute, useValue: mockActivatedRoute},
            {provide: Location, useValue: mockLocation},
          ],
        })
        .compileComponents();

    fixture = TestBed.createComponent(SidePanelComponent);
    component = fixture.componentInstance;
    component.appName = 'test-app';
    component.showSidePanel = true;
    fixture.detectChanges();
  });

  async function switchTab(index: number) {
    const tabHeaders = fixture.debugElement.queryAll(TAB_HEADERS_SELECTOR);
    tabHeaders[index].nativeElement.click();
    fixture.detectChanges();
    await fixture.whenStable();
    fixture.detectChanges();
  }

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  describe('Rendering', () => {
    describe('when appName is empty', () => {
      beforeEach(() => {
        component.appName = '';
        fixture.detectChanges();
      });
      it('does not show tabs container', () => {
        expect(fixture.debugElement.query(TABS_CONTAINER_SELECTOR)).toBeNull();
      });
    });

    describe('when appName is provided', () => {
      it('shows tabs container', () => {
        expect(fixture.debugElement.query(TABS_CONTAINER_SELECTOR))
            .toBeTruthy();
      });
    });

    describe('when selectedEvent is undefined', () => {
      beforeEach(() => {
        component.selectedEvent = undefined;
        fixture.detectChanges();
      });
      it('does not show details panel', () => {
        expect(fixture.debugElement.query(DETAILS_PANEL_SELECTOR)).toBeNull();
      });
    });

    describe('when selectedEvent is defined', () => {
      beforeEach(() => {
        component.selectedEvent = {id: 'event1'};
        fixture.detectChanges();
      });
      it('shows details panel', () => {
        expect(fixture.debugElement.query(DETAILS_PANEL_SELECTOR)).toBeTruthy();
      });
    });
  });

  describe('Header', () => {
    describe('when close button is clicked', () => {
      beforeEach(() => {
        spyOn(component.closePanel, 'emit');
        const closeButton = fixture.debugElement.query(
            HEADER_CLOSE_BUTTON_SELECTOR,
        );
        closeButton.nativeElement.click();
      });
      it('emits closePanel event', () => {
        expect(component.closePanel.emit).toHaveBeenCalled();
      });
    });
  });

  describe('Tabs', () => {
    describe('when tab is changed', () => {
      beforeEach(() => {
        spyOn(component.tabChange, 'emit');
        const tabGroup = fixture.debugElement.query(By.directive(MatTabGroup));
        tabGroup.triggerEventHandler(
            'selectedTabChange', {index: 1, tab: {} as any});
      });
      it('emits tabChange event', () => {
        expect(component.tabChange.emit)
            .toHaveBeenCalledWith({index: 1, tab: {} as any});
      });
    });

    describe('Events tab', () => {
      beforeEach(async () => {
        await switchTab(EVENTS_TAB_INDEX);
      });

      describe('when app-event-tab emits selectedEvent', () => {
        beforeEach(() => {
          spyOn(component.eventSelected, 'emit');
          const eventTab = fixture.debugElement.query(EVENT_TAB_SELECTOR);
          eventTab.triggerEventHandler('selectedEvent', 'event1');
        });
        it('emits eventSelected', () => {
          expect(component.eventSelected.emit).toHaveBeenCalledWith('event1');
        });
      });
    });

    describe('Sessions tab', () => {
      beforeEach(async () => {
        await switchTab(SESSIONS_TAB_INDEX);
      });

      describe('when app-session-tab emits sessionSelected', () => {
        beforeEach(() => {
          spyOn(component.sessionSelected, 'emit');
          const sessionTab = fixture.debugElement.query(SESSION_TAB_SELECTOR);
          sessionTab.triggerEventHandler(
              'sessionSelected', {sessionId: 'session1'} as any);
        });
        it('emits sessionSelected', () => {
          expect(component.sessionSelected.emit).toHaveBeenCalledWith({
            sessionId: 'session1'
          } as any);
        });
      });

      describe('when app-session-tab emits sessionReloaded', () => {
        beforeEach(() => {
          spyOn(component.sessionReloaded, 'emit');
          const sessionTab = fixture.debugElement.query(SESSION_TAB_SELECTOR);
          sessionTab.triggerEventHandler(
              'sessionReloaded', {sessionId: 'session1'} as any);
        });
        it('emits sessionReloaded', () => {
          expect(component.sessionReloaded.emit).toHaveBeenCalledWith({
            sessionId: 'session1'
          } as any);
        });
      });
    });

    describe('Eval tab', () => {
      beforeEach(() => {
        component.shouldShowEvalTab = true;
        fixture.detectChanges();
      });

      describe('when shouldShowEvalTab is true', () => {
        beforeEach(async () => {
          await switchTab(EVAL_TAB_INDEX);
        });
        it('is visible', () => {
          expect(fixture.debugElement.query(EVAL_TAB_SELECTOR)).toBeTruthy();
        });
      });

      describe('Interactions', () => {
        beforeEach(async () => {
          await switchTab(EVAL_TAB_INDEX);
        });

        describe('when app-eval-tab emits shouldShowTab', () => {
          beforeEach(() => {
            spyOn(component.evalTabVisibilityChange, 'emit');
            const evalTab = fixture.debugElement.query(EVAL_TAB_SELECTOR);
            evalTab.triggerEventHandler('shouldShowTab', false);
          });
          it('emits evalTabVisibilityChange', () => {
            expect(component.evalTabVisibilityChange.emit)
                .toHaveBeenCalledWith(false);
          });
        });

        describe('when app-eval-tab emits evalCaseSelected', () => {
          beforeEach(() => {
            spyOn(component.evalCaseSelected, 'emit');
            const evalTab = fixture.debugElement.query(EVAL_TAB_SELECTOR);
            evalTab.triggerEventHandler(
                'evalCaseSelected', {evalId: 'eval1'} as any);
          });
          it('emits evalCaseSelected', () => {
            expect(component.evalCaseSelected.emit).toHaveBeenCalledWith({
              evalId: 'eval1'
            } as any);
          });
        });

        describe('when app-eval-tab emits evalSetIdSelected', () => {
          beforeEach(() => {
            spyOn(component.evalSetIdSelected, 'emit');
            const evalTab = fixture.debugElement.query(EVAL_TAB_SELECTOR);
            evalTab.triggerEventHandler('evalSetIdSelected', 'set1');
          });
          it('emits evalSetIdSelected', () => {
            expect(component.evalSetIdSelected.emit)
                .toHaveBeenCalledWith('set1');
          });
        });

        describe('when app-eval-tab emits shouldReturnToSession', () => {
          beforeEach(() => {
            spyOn(component.returnToSession, 'emit');
            const evalTab = fixture.debugElement.query(EVAL_TAB_SELECTOR);
            evalTab.triggerEventHandler('shouldReturnToSession', true);
          });
          it('emits returnToSession', () => {
            expect(component.returnToSession.emit).toHaveBeenCalledWith(true);
          });
        });

        describe('when app-eval-tab emits evalNotInstalledMsg', () => {
          beforeEach(() => {
            spyOn(component.evalNotInstalled, 'emit');
            const evalTab = fixture.debugElement.query(EVAL_TAB_SELECTOR);
            evalTab.triggerEventHandler('evalNotInstalledMsg', 'error');
          });
          it('emits evalNotInstalled', () => {
            expect(component.evalNotInstalled.emit)
                .toHaveBeenCalledWith('error');
          });
        });
      });
    });
  });

  describe('Details Panel', () => {
    beforeEach(() => {
      component.selectedEvent = {id: 'event1'};
      fixture.detectChanges();
    });

    describe('when close button is clicked', () => {
      beforeEach(() => {
        spyOn(component.closeSelectedEvent, 'emit');
        const closeButton =
            fixture.debugElement.query(DETAILS_PANEL_CLOSE_BUTTON_SELECTOR);
        closeButton.nativeElement.click();
      });
      it('emits closeSelectedEvent', () => {
        expect(component.closeSelectedEvent.emit).toHaveBeenCalled();
      });
    });

    describe('when paginator page is changed', () => {
      beforeEach(() => {
        spyOn(component.page, 'emit');
        const paginator =
            fixture.debugElement.query(By.directive(MatPaginator));
        paginator.componentInstance.page.emit(
            {pageIndex: 1, pageSize: 1, length: 2});
      });
      it('emits page event', () => {
        expect(component.page.emit)
            .toHaveBeenCalledWith({pageIndex: 1, pageSize: 1, length: 2});
      });
    });

    describe('when event graph is clicked', () => {
      beforeEach(async () => {
        component.renderedEventGraph = '<div>graph</div>';
        fixture.detectChanges();
        await fixture.whenStable();
        fixture.detectChanges();
        spyOn(component.openImageDialog, 'emit');
        const graphContainer = fixture.debugElement.query(EVENT_GRAPH_SELECTOR);
        graphContainer.nativeElement.click();
      });
      it('emits openImageDialog', () => {
        expect(component.openImageDialog.emit).toHaveBeenCalled();
      });
    });
  });
});
