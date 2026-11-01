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
import {MatPaginator} from '@angular/material/paginator';
import { SnackbarService } from '../../core/services/snackbar.service';
import {MatTab, MatTabGroup} from '@angular/material/tabs';
import {By} from '@angular/platform-browser';
import {NoopAnimationsModule} from '@angular/platform-browser/animations';
import {ActivatedRoute, provideRouter} from '@angular/router';
// 1p-ONLY-IMPORTS: import {beforeEach, describe, expect, it}
import {of} from 'rxjs';

import {EvalCase} from '../../core/models/Eval';
import {Session} from '../../core/models/Session';
import {GCP_VERTEX_AGENT_EVENT_ID, Span, SpanValidator} from '../../core/models/Trace';
import {AgentService} from '../../core/services/agent.service';
import {ArtifactService} from '../../core/services/artifact.service';
import {AudioRecordingService} from '../../core/services/audio-recording.service';
import {DownloadService} from '../../core/services/download.service';
import {EvalService} from '../../core/services/eval.service';
import {EventService} from '../../core/services/event.service';
import {AGENT_SERVICE} from '../../core/services/interfaces/agent';
import {ARTIFACT_SERVICE} from '../../core/services/interfaces/artifact';
import {AUDIO_RECORDING_SERVICE} from '../../core/services/interfaces/audio-recording';
import {DOWNLOAD_SERVICE} from '../../core/services/interfaces/download';
import {EVAL_SERVICE} from '../../core/services/interfaces/eval';
import {EVENT_SERVICE} from '../../core/services/interfaces/event';
import {FEATURE_FLAG_SERVICE} from '../../core/services/interfaces/feature-flag';
import {SAFE_VALUES_SERVICE} from '../../core/services/interfaces/safevalues';
import {SESSION_SERVICE} from '../../core/services/interfaces/session';
import {THEME_SERVICE} from '../../core/services/interfaces/theme';
import {TRACE_SERVICE} from '../../core/services/interfaces/trace';
import {STORAGE_SERVICE} from '../../core/services/interfaces/storage';
import {UI_STATE_SERVICE} from '../../core/services/interfaces/ui-state';
import {VIDEO_SERVICE} from '../../core/services/interfaces/video';
import {WEBSOCKET_SERVICE} from '../../core/services/interfaces/websocket';
import {SessionService} from '../../core/services/session.service';
import {MockFeatureFlagService} from '../../core/services/testing/mock-feature-flag.service';
import {MockSafeValuesService} from '../../core/services/testing/mock-safevalues.service';
import {MockStorageService} from '../../core/services/testing/mock-storage.service';
import {MockThemeService} from '../../core/services/testing/mock-theme.service';
import {MockUiStateService} from '../../core/services/testing/mock-ui-state.service';
import {TraceService} from '../../core/services/trace.service';
import {VideoService} from '../../core/services/video.service';
import {WebSocketService} from '../../core/services/websocket.service';
import {initTestBed} from '../../testing/utils';
import {EVAL_TAB_COMPONENT, EvalTabComponent} from '../eval-tab/eval-tab.component';
import {AnalyticsService} from '../../core/services/analytics.service';

import {SidePanelComponent} from './side-panel.component';

const TABS_CONTAINER_SELECTOR = By.css('.tabs-container');
const DETAILS_PANEL_SELECTOR = By.css('.details-panel-container');
const TAB_HEADERS_SELECTOR = By.css('[role="tab"]');
const EVAL_TAB_SELECTOR = By.css('app-eval-tab');
const DETAILS_PANEL_CLOSE_BUTTON_SELECTOR =
    By.css('.details-panel-container mat-icon');
const EVENT_GRAPH_SELECTOR = By.css('.event-graph-container div');
const SPAN_LINK_SELECTOR = By.css('app-event-tab .span-link');

/** Routes a raw span through `SpanValidator` so `attrEventId` is populated. */
function makeSpan(attributes: Record<string, unknown>): Span {
  const result = SpanValidator.safeParse({
    name: 'test-span',
    trace_id: 'trace-id',
    span_id: 'span-id',
    start_time: 1,
    end_time: 2,
    attributes,
  });
  if (!result.success) {
    throw new Error(`Failed to build test span: ${result.error.message}`);
  }
  return result.data;
}

const EVAL_TAB_INDEX = 3;

describe('SidePanelComponent', () => {
  let component: SidePanelComponent;
  let fixture: ComponentFixture<SidePanelComponent>;
  let mockSessionService: jasmine.SpyObj<SessionService>;
  let mockArtifactService: jasmine.SpyObj<ArtifactService>;
  let mockAudioRecordingService: jasmine.SpyObj<AudioRecordingService>;
  let mockWebSocketService: jasmine.SpyObj<WebSocketService>;
  let mockVideoService: jasmine.SpyObj<VideoService>;
  let mockEventService: jasmine.SpyObj<EventService>;
  let mockDownloadService: jasmine.SpyObj<DownloadService>;
  let mockEvalService: jasmine.SpyObj<EvalService>;
  let mockTraceService: jasmine.SpyObj<TraceService>;
  let mockAgentService: jasmine.SpyObj<AgentService>;
  let mockUiStateService: MockUiStateService;
  let mockFeatureFlagService: MockFeatureFlagService;
  let mockDialog: jasmine.SpyObj<MatDialog>;
  let mockSnackBar: jasmine.SpyObj<SnackbarService>;
  let mockActivatedRoute: Partial<ActivatedRoute>;
  let mockLocation: jasmine.SpyObj<Location>;

  beforeEach(() => {
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
    mockAudioRecordingService = jasmine.createSpyObj(
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
          hoveredMessageIndices$: of([]),
        },
    );
    mockAgentService = jasmine.createSpyObj(
        'AgentService',
        ['listApps', 'getApp', 'getLoadingState', 'setApp', 'runSse'],
    );
    mockUiStateService = new MockUiStateService();
    mockFeatureFlagService = new MockFeatureFlagService();
    mockDialog = jasmine.createSpyObj('MatDialog', ['open']);
    mockSnackBar = jasmine.createSpyObj('SnackbarService', ['open']);
    mockLocation = jasmine.createSpyObj('Location', ['replaceState']);
    mockActivatedRoute = {
      snapshot: {
        queryParams: {},
      } as unknown as ActivatedRoute['snapshot'],
      queryParams: of({}),
    };
    mockEvalService.getEvalSets.and.returnValue(of([]));
    mockSessionService.listSessions.and.returnValue(of({
      items: [],
      nextPageToken: '',
    }));
    mockEvalService.listEvalResults.and.returnValue(of([]));
    mockFeatureFlagService.isEditFunctionArgsEnabled.and.returnValue(of(false));
    mockFeatureFlagService.isImportSessionEnabled.and.returnValue(of(false));
    mockFeatureFlagService.isAlwaysOnSidePanelEnabled.and.returnValue(
        of(false));
    mockFeatureFlagService.isApplicationSelectorEnabledResponse.next(true);
    mockFeatureFlagService.isTraceEnabledResponse.next(true);
    mockFeatureFlagService.isArtifactsTabEnabledResponse.next(true);
    mockFeatureFlagService.isEvalEnabledResponse.next(true);
    mockFeatureFlagService.isTokenStreamingEnabled.and.returnValue(of(true));
    mockFeatureFlagService.isMessageFileUploadEnabled.and.returnValue(of(true));
    mockFeatureFlagService.isManualStateUpdateEnabled.and.returnValue(of(true));
    mockFeatureFlagService.isBidiStreamingEnabled.and.returnValue(of(true));

    initTestBed();  // required for 1p compatibility
    TestBed.configureTestingModule({
      imports: [SidePanelComponent, MatDialogModule, NoopAnimationsModule],
      providers: [
        {provide: EVAL_TAB_COMPONENT, useValue: EvalTabComponent},
        {provide: SESSION_SERVICE, useValue: mockSessionService},
        {provide: ARTIFACT_SERVICE, useValue: mockArtifactService},
        {provide: AUDIO_RECORDING_SERVICE, useValue: mockAudioRecordingService},
        {provide: WEBSOCKET_SERVICE, useValue: mockWebSocketService},
        {provide: VIDEO_SERVICE, useValue: mockVideoService},
        {provide: EVENT_SERVICE, useValue: mockEventService},
        {provide: DOWNLOAD_SERVICE, useValue: mockDownloadService},
        {provide: EVAL_SERVICE, useValue: mockEvalService},
        {provide: TRACE_SERVICE, useValue: mockTraceService},
        {provide: AGENT_SERVICE, useValue: mockAgentService},
        {provide: UI_STATE_SERVICE, useValue: mockUiStateService},
        {provide: FEATURE_FLAG_SERVICE, useValue: mockFeatureFlagService},
        {provide: MatDialog, useValue: mockDialog},
        {provide: SnackbarService, useValue: mockSnackBar},
        provideRouter([]),
        {provide: ActivatedRoute, useValue: mockActivatedRoute},
        {provide: Location, useValue: mockLocation},
        {provide: SAFE_VALUES_SERVICE, useClass: MockSafeValuesService},
        {provide: STORAGE_SERVICE, useClass: MockStorageService},
        {provide: THEME_SERVICE, useClass: MockThemeService},
        {provide: AnalyticsService, useValue: jasmine.createSpyObj('AnalyticsService', ['setUserProperties', 'sendEvent'])}
      ],
    });

    fixture = TestBed.createComponent(SidePanelComponent);
    component = fixture.componentInstance;
    fixture.componentRef.setInput('appName', 'test-app');
    fixture.componentRef.setInput('showSidePanel', true);
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

  describe('Tab hiding', () => {
    it('should hide Trace tab when isTraceEnabled is false', () => {
      mockFeatureFlagService.isTraceEnabledResponse.next(false);
      fixture.detectChanges();
      const tabLabels = fixture.debugElement.queryAll(
          By.css('.tab-label'),
      );
      const traceLabel = tabLabels.find(
          (label) => label.nativeElement.textContent.trim() === 'Trace',
      );
      expect(traceLabel).toBeUndefined();
    });

    it('should hide Artifacts tab when isArtifactsTabEnabled is false', () => {
      mockFeatureFlagService.isArtifactsTabEnabledResponse.next(false);
      fixture.detectChanges();
      const tabLabels = fixture.debugElement.queryAll(
          By.css('.tab-label'),
      );
      const artifactsLabel = tabLabels.find(
          (label) => label.nativeElement.textContent.trim() === 'Artifacts',
      );
      expect(artifactsLabel).toBeUndefined();
    });

    it('should hide Eval tab when isEvalEnabled is false', () => {
      mockFeatureFlagService.isEvalEnabledResponse.next(false);
      fixture.detectChanges();
      const tabLabels = fixture.debugElement.queryAll(
          By.css('.tab-label'),
      );
      const evalLabel = tabLabels.find(
          (label) => label.nativeElement.textContent.trim() === 'Eval',
      );
      expect(evalLabel).toBeUndefined();
    });
  });

  describe('Rendering', () => {
    describe('when appName is empty', () => {
      beforeEach(() => {
        fixture.componentRef.setInput('appName', '');
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
        fixture.componentRef.setInput('selectedEvent', undefined);
        fixture.detectChanges();
      });
      it('does not show details panel', () => {
        expect(fixture.debugElement.query(DETAILS_PANEL_SELECTOR)).toBeNull();
      });
    });

  });

  describe('Tabs', () => {
    describe('when tab is changed', () => {
      beforeEach(() => {
        spyOn(component.tabChange, 'emit');
        const tabGroup = fixture.debugElement.query(By.directive(MatTabGroup));
        tabGroup.triggerEventHandler(
            'selectedTabChange', {index: 1, tab: {} as MatTab});
      });
      it('emits tabChange event', () => {
        expect(component.tabChange.emit)
            .toHaveBeenCalledWith({index: 1, tab: {} as MatTab});
      });
    });

    describe('Eval tab', () => {
      describe('Interactions', () => {
        beforeEach(async () => {
          await switchTab(EVAL_TAB_INDEX);
        });

        describe('when app-eval-tab emits evalCaseSelected', () => {
          beforeEach(async () => {
            await fixture.whenStable();
            fixture.detectChanges();
            spyOn(component.evalCaseSelected, 'emit');
            const evalTab = fixture.debugElement.query(EVAL_TAB_SELECTOR);
            evalTab!.componentInstance.evalCaseSelected.emit({
              evalId: 'eval1',
            } as unknown as EvalCase);
            fixture.detectChanges();
          });
          it('emits evalCaseSelected', () => {
            expect(component.evalCaseSelected.emit).toHaveBeenCalledWith({
              evalId: 'eval1'
            } as unknown as EvalCase);
          });
        });

        describe('when app-eval-tab emits evalSetIdSelected', () => {
          beforeEach(async () => {
            await fixture.whenStable();
            fixture.detectChanges();
            spyOn(component.evalSetIdSelected, 'emit');
            const evalTab = fixture.debugElement.query(EVAL_TAB_SELECTOR);
            evalTab!.componentInstance.evalSetIdSelected.emit('set1');
            fixture.detectChanges();
          });
          it('emits evalSetIdSelected', () => {
            expect(component.evalSetIdSelected.emit)
                .toHaveBeenCalledWith('set1');
          });
        });

        describe('when app-eval-tab emits shouldReturnToSession', () => {
          beforeEach(async () => {
            await fixture.whenStable();
            fixture.detectChanges();
            spyOn(component.returnToSession, 'emit');
            const evalTab = fixture.debugElement.query(EVAL_TAB_SELECTOR);
            evalTab!.componentInstance.shouldReturnToSession.emit(true);
            fixture.detectChanges();
          });
          it('emits returnToSession', () => {
            expect(component.returnToSession.emit).toHaveBeenCalledWith(true);
          });
        });

        describe('when app-eval-tab emits evalNotInstalledMsg', () => {
          beforeEach(async () => {
            await fixture.whenStable();
            fixture.detectChanges();
            spyOn(component.evalNotInstalled, 'emit');
            const evalTab = fixture.debugElement.query(EVAL_TAB_SELECTOR);
            evalTab!.componentInstance.evalNotInstalledMsg.emit('error');
            fixture.detectChanges();
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
      fixture.componentRef.setInput('selectedEvent', {id: 'event1'});
      fixture.detectChanges();
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

    describe('associated spans', () => {
      beforeEach(() => {
        fixture.componentRef.setInput(
            'traceData', [makeSpan({[GCP_VERTEX_AGENT_EVENT_ID]: 'event1'})]);
      });

      it('links the spans of the selected event', () => {
        fixture.detectChanges();
        expect(fixture.debugElement.queryAll(SPAN_LINK_SELECTOR).length)
            .toBe(1);
      });

      it('links no spans when isTraceEnabled is false', () => {
        mockFeatureFlagService.isTraceEnabledResponse.next(false);
        fixture.detectChanges();
        expect(fixture.debugElement.queryAll(SPAN_LINK_SELECTOR).length)
            .toBe(0);
      });
    });
  });

  describe('Loading state', () => {
    describe('when session is loading', () => {
      beforeEach(() => {
        mockUiStateService.isSessionLoadingResponse.next(true);
        fixture.detectChanges();
      });

      it('shows loading spinner', () => {
        const spinner =
            fixture.debugElement.query(By.css('mat-progress-spinner'));
        expect(spinner).toBeTruthy();
      });

      it('hides tabs container', () => {
        expect(fixture.debugElement.query(TABS_CONTAINER_SELECTOR)!.nativeElement.hidden).toBeTrue();
      });
    });

    describe('when session is not loading', () => {
      beforeEach(() => {
        mockUiStateService.isSessionLoadingResponse.next(false);
        fixture.detectChanges();
      });

      it('hides loading spinner', () => {
        const spinner =
            fixture.debugElement.query(By.css('mat-progress-spinner'));
        expect(spinner).toBeFalsy();
      });

      it('shows tabs container', () => {
        expect(fixture.debugElement.query(TABS_CONTAINER_SELECTOR)!.nativeElement.hidden)
            .toBeFalse();
      });
    });
  });

  describe('Dynamic Eval Tab Initialization', () => {
    it('should initialize Eval tab dynamically when appName transitions from empty to non-empty', async () => {
      fixture = TestBed.createComponent(SidePanelComponent);
      component = fixture.componentInstance;
      fixture.componentRef.setInput('appName', '');
      fixture.componentRef.setInput('showSidePanel', true);
      fixture.detectChanges();

      // Assert: Tab container is not rendered
      expect(fixture.debugElement.query(TABS_CONTAINER_SELECTOR)).toBeNull();
      expect(fixture.debugElement.query(EVAL_TAB_SELECTOR)).toBeNull();

      // Act: Change appName to a non-empty string
      fixture.componentRef.setInput('appName', 'my-app');
      fixture.detectChanges();
      await fixture.whenStable();
      fixture.detectChanges();

      // Switch to Eval Tab to instantiate its container
      await switchTab(EVAL_TAB_INDEX);

      // Assert: Tab container is now rendered, and Eval tab component is instantiated
      expect(fixture.debugElement.query(TABS_CONTAINER_SELECTOR)).toBeTruthy();
      expect(fixture.debugElement.query(EVAL_TAB_SELECTOR)).toBeTruthy();
    });
  });
});
