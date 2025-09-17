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


import { SESSION_SERVICE, SessionService } from './app/core/services/session.service';
import { AGENT_SERVICE, AgentService } from './app/core/services/agent.service';
import { WEBSOCKET_SERVICE, WebSocketService } from './app/core/services/websocket.service';
import { AUDIO_SERVICE, AudioService } from './app/core/services/audio.service';
import { VIDEO_SERVICE, VideoService } from './app/core/services/video.service';
import { EVENT_SERVICE, EventService } from './app/core/services/event.service';
import { EVAL_SERVICE, EvalService } from './app/core/services/eval.service';
import { ARTIFACT_SERVICE, ArtifactService } from './app/core/services/artifact.service';
import { DOWNLOAD_SERVICE, DownloadService } from './app/core/services/download.service';
import { TRACE_SERVICE, TraceService } from './app/core/services/trace.service';
import { FEATURE_FLAG_SERVICE, FeatureFlagService } from './app/core/services/feature-flag.service';
import { BrowserModule, bootstrapApplication } from '@angular/platform-browser';
import { FormsModule } from '@angular/forms';
import { HttpClientModule } from '@angular/common/http';
import { AppRoutingModule } from './app/app-routing.module';
import { MatInputModule } from '@angular/material/input';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatButtonModule } from '@angular/material/button';
import { provideAnimations } from '@angular/platform-browser/animations';
import { AppComponent } from './app/app.component';
import { importProvidersFrom } from '@angular/core';

fetch('./assets/config/runtime-config.json')
  .then((response) => response.json())
  .then((config) => {
    (window as any)['runtimeConfig'] = config;
    bootstrapApplication(AppComponent, {
    providers: [
        importProvidersFrom(BrowserModule, FormsModule, HttpClientModule, AppRoutingModule, MatInputModule, MatFormFieldModule, MatButtonModule),
        { provide: SESSION_SERVICE, useClass: SessionService },
        { provide: AGENT_SERVICE, useClass: AgentService },
        { provide: WEBSOCKET_SERVICE, useClass: WebSocketService },
        { provide: AUDIO_SERVICE, useClass: AudioService },
        { provide: VIDEO_SERVICE, useClass: VideoService },
        { provide: EVENT_SERVICE, useClass: EventService },
        { provide: EVAL_SERVICE, useClass: EvalService },
        { provide: ARTIFACT_SERVICE, useClass: ArtifactService },
        { provide: DOWNLOAD_SERVICE, useClass: DownloadService },
        { provide: TRACE_SERVICE, useClass: TraceService },
        { provide: FEATURE_FLAG_SERVICE, useClass: FeatureFlagService },
        provideAnimations(),
    ]
})
      .catch((err) => console.error(err));
  });
