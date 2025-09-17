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

import { TestBed } from '@angular/core/testing';
import { AppComponent } from './app.component';
import { of, BehaviorSubject } from 'rxjs';
import { MatDialog } from '@angular/material/dialog';
import { ActivatedRoute } from '@angular/router';
import { DomSanitizer } from '@angular/platform-browser';
import {
  SESSION_SERVICE,
  SessionService,
} from './core/services/session.service';
import {
  ARTIFACT_SERVICE,
  ArtifactService,
} from './core/services/artifact.service';
import { AUDIO_SERVICE, AudioService } from './core/services/audio.service';
import {
  WEBSOCKET_SERVICE,
  WebSocketService,
} from './core/services/websocket.service';
import { VIDEO_SERVICE, VideoService } from './core/services/video.service';
import { EVENT_SERVICE, EventService } from './core/services/event.service';
import {
  DOWNLOAD_SERVICE,
  DownloadService,
} from './core/services/download.service';
import { EVAL_SERVICE, EvalService } from './core/services/eval.service';
import { TRACE_SERVICE, TraceService } from './core/services/trace.service';
import { AGENT_SERVICE, AgentService } from './core/services/agent.service';
import {
  FEATURE_FLAG_SERVICE,
  FeatureFlagService,
} from './core/services/feature-flag.service';
import { NoopAnimationsModule } from '@angular/platform-browser/animations';

describe('AppComponent', () => {
  beforeEach(async () => {
    const sessionService = jasmine.createSpyObj<SessionService>([
      'createSession',
      'getSession',
      'deleteSession',
      'importSession',
    ]);
    sessionService.createSession.and.returnValue(of({} as any));
    sessionService.getSession.and.returnValue(of({} as any));

    const agentService = jasmine.createSpyObj<AgentService>([
      'listApps',
      'getApp',
      'setApp',
      'getLoadingState',
      'runSse',
    ]);
    agentService.listApps.and.returnValue(of([]));
    agentService.getApp.and.returnValue(of(''));
    agentService.getLoadingState.and.returnValue(
      new BehaviorSubject<boolean>(false)
    );
    agentService.runSse.and.returnValue(of(''));

    const featureFlagService = jasmine.createSpyObj<FeatureFlagService>([
      'isImportSessionEnabled',
      'isEditFunctionArgsEnabled',
      'isSessionUrlEnabled',
    ]);
    featureFlagService.isImportSessionEnabled.and.returnValue(of(false));
    featureFlagService.isEditFunctionArgsEnabled.and.returnValue(of(false));
    featureFlagService.isSessionUrlEnabled.and.returnValue(of(false));

    const traceService = {
      ...jasmine.createSpyObj<TraceService>([
        'setEventData',
        'setMessages',
        'resetTraceService',
        'selectedRow',
        'setHoveredMessages',
      ]),
      selectedTraceRow$: of(undefined),
      hoveredMessageIndicies$: of([]),
    };

    await TestBed.configureTestingModule({
      imports: [AppComponent, NoopAnimationsModule],
      providers: [
        { provide: MatDialog, useValue: {} },
        {
          provide: ActivatedRoute,
          useValue: {
            snapshot: { queryParams: {} },
            queryParams: of({}),
            valueChanges: of({}),
            fragment: of(''),
          },
        },
        {
          provide: DomSanitizer,
          useValue: { bypassSecurityTrustHtml: () => '' },
        },
        {
          provide: SESSION_SERVICE,
          useValue: sessionService,
        },
        {
          provide: ARTIFACT_SERVICE,
          useValue: jasmine.createSpyObj<ArtifactService>([
            'getArtifactVersion',
          ]),
        },
        {
          provide: AUDIO_SERVICE,
          useValue: jasmine.createSpyObj<AudioService>([
            'startRecording',
            'stopRecording',
          ]),
        },
        {
          provide: WEBSOCKET_SERVICE,
          useValue: {
            ...jasmine.createSpyObj<WebSocketService>([
              'onCloseReason',
              'connect',
              'closeConnection',
            ]),
            onCloseReason: () => of(''),
          },
        },
        {
          provide: VIDEO_SERVICE,
          useValue: jasmine.createSpyObj<VideoService>([
            'startRecording',
            'stopRecording',
          ]),
        },
        {
          provide: EVENT_SERVICE,
          useValue: jasmine.createSpyObj<EventService>([
            'getTrace',
            'getEventTrace',
            'getEvent',
          ]),
        },
        {
          provide: DOWNLOAD_SERVICE,
          useValue: jasmine.createSpyObj<DownloadService>([
            'downloadObjectAsJson',
          ]),
        },
        {
          provide: EVAL_SERVICE,
          useValue: jasmine.createSpyObj<EvalService>(['updateEvalCase']),
        },
        {
          provide: TRACE_SERVICE,
          useValue: traceService,
        },
        {
          provide: AGENT_SERVICE,
          useValue: agentService,
        },
        {
          provide: FEATURE_FLAG_SERVICE,
          useValue: featureFlagService,
        },
      ],
    }).compileComponents();
  });

  it('should create the app', () => {
    const fixture = TestBed.createComponent(AppComponent);
    const app = fixture.componentInstance;
    expect(app).toBeTruthy();
  });
});
