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

import {TestBed} from '@angular/core/testing';
import {MatDialog} from '@angular/material/dialog';
import {DomSanitizer} from '@angular/platform-browser';
import {NoopAnimationsModule} from '@angular/platform-browser/animations';
import {ActivatedRoute} from '@angular/router';
import {BehaviorSubject, of} from 'rxjs';

import {AppComponent} from './app.component';
import {AGENT_SERVICE, AgentService} from './core/services/agent.service';
import {ARTIFACT_SERVICE, ArtifactService,} from './core/services/artifact.service';
import {AUDIO_SERVICE, AudioService} from './core/services/audio.service';
import {DOWNLOAD_SERVICE, DownloadService,} from './core/services/download.service';
import {EVAL_SERVICE, EvalService} from './core/services/eval.service';
import {EVENT_SERVICE, EventService} from './core/services/event.service';
import {FEATURE_FLAG_SERVICE, FeatureFlagService,} from './core/services/feature-flag.service';
import {GRAPH_SERVICE, GraphService} from './core/services/graph.service';
import {SESSION_SERVICE, SessionService,} from './core/services/session.service';
import {SCREEN_SHARING_SERVICE, ScreenSharingService,} from './core/services/screensharing.service';
import {MockAgentService} from './core/services/testing/mock-agent.service';
import {MockArtifactService} from './core/services/testing/mock-artifact.service';
import {MockAudioService} from './core/services/testing/mock-audio.service';
import {MockDownloadService} from './core/services/testing/mock-download.service';
import {MockEvalService} from './core/services/testing/mock-eval.service';
import {MockEventService} from './core/services/testing/mock-event.service';
import {MockFeatureFlagService} from './core/services/testing/mock-feature-flag.service';
import {MockGraphService} from './core/services/testing/mock-graph.service';
import {MockSessionService} from './core/services/testing/mock-session.service';
import {MockTraceService} from './core/services/testing/mock-trace.service';
import {MockVideoService} from './core/services/testing/mock-video.service';
import {MockScreenSharingService} from './core/services/testing/mock-screensharing.service';
import {MockWebSocketService} from './core/services/testing/mock-websocket.service';
import {TRACE_SERVICE, TraceService} from './core/services/trace.service';
import {VIDEO_SERVICE, VideoService} from './core/services/video.service';
import {WEBSOCKET_SERVICE, WebSocketService,} from './core/services/websocket.service';

describe('AppComponent', () => {
  beforeEach(async () => {
    const sessionService = new MockSessionService();
    const agentService = new MockAgentService();
    const featureFlagService = new MockFeatureFlagService();
    const traceService = new MockTraceService();
    const artifactService = new MockArtifactService();
    const audioService = new MockAudioService();
    const webSocketService = new MockWebSocketService();
    const videoService = new MockVideoService();
    const screenSharingService = new MockScreenSharingService();
    const eventService = new MockEventService();
    const downloadService = new MockDownloadService();
    const evalService = new MockEvalService();

    traceService.selectedTraceRow$.next(undefined);
    traceService.hoveredMessageIndicies$.next([]);

    const graphService = new MockGraphService();
    graphService.render.and.returnValue(Promise.resolve('svg'));

    await TestBed
        .configureTestingModule({
          imports: [AppComponent, NoopAnimationsModule],
          providers: [
            {provide: MatDialog, useValue: {}}, {
              provide: ActivatedRoute,
              useValue: {
                snapshot: {queryParams: {}},
                queryParams: of({}),
                valueChanges: of({}),
                fragment: of(''),
              },
            },
            {
              provide: DomSanitizer,
              useValue: {bypassSecurityTrustHtml: () => ''},
            },
            {
              provide: SESSION_SERVICE,
              useValue: sessionService,
            },
            {
              provide: ARTIFACT_SERVICE,
              useValue: artifactService,
            },
            {
              provide: AUDIO_SERVICE,
              useValue: audioService,
            },
            {
              provide: WEBSOCKET_SERVICE,
              useValue: webSocketService,
            },
            {
              provide: VIDEO_SERVICE,
              useValue: videoService,
            },
            {
              provide: SCREEN_SHARING_SERVICE,
              useValue: screenSharingService,
            },
            {
              provide: EVENT_SERVICE,
              useValue: eventService,
            },
            {
              provide: DOWNLOAD_SERVICE,
              useValue: downloadService,
            },
            {
              provide: EVAL_SERVICE,
              useValue: evalService,
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
            {
              provide: GRAPH_SERVICE,
              useValue: graphService,
            }
          ],
        })
        .compileComponents();
  });

  it('should create the app', () => {
    const fixture = TestBed.createComponent(AppComponent);
    const app = fixture.componentInstance;
    expect(app).toBeTruthy();
  });
});
