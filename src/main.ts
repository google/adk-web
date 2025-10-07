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

import {HttpClientModule} from '@angular/common/http';
import {importProvidersFrom} from '@angular/core';
import {FormsModule} from '@angular/forms';
import {MatButtonModule} from '@angular/material/button';
import {MatFormFieldModule} from '@angular/material/form-field';
import {MatInputModule} from '@angular/material/input';
import {bootstrapApplication, BrowserModule} from '@angular/platform-browser';
import {provideAnimations} from '@angular/platform-browser/animations';

import {AppRoutingModule} from './app/app-routing.module';
import {AppComponent} from './app/app.component';
import {CustomLogoComponent} from './app/components/custom-logo/custom-logo.component';
import {MarkdownComponent} from './app/components/markdown/markdown.component';
import {MARKDOWN_COMPONENT} from './app/components/markdown/markdown.component.interface';
import {AGENT_SERVICE, AgentService} from './app/core/services/agent.service';
import {ARTIFACT_SERVICE, ArtifactService} from './app/core/services/artifact.service';
import {AUDIO_SERVICE, AUDIO_WORKLET_MODULE_PATH, AudioService} from './app/core/services/audio.service';
import {DOWNLOAD_SERVICE, DownloadService} from './app/core/services/download.service';
import {EVAL_SERVICE, EvalService} from './app/core/services/eval.service';
import {EVENT_SERVICE, EventService} from './app/core/services/event.service';
import {FEATURE_FLAG_SERVICE, FeatureFlagService} from './app/core/services/feature-flag.service';
import {GRAPH_SERVICE, GraphService} from './app/core/services/graph.service';
import {LOCAL_FILE_SERVICE} from './app/core/services/interfaces/localfile';
import {SAFE_VALUES_SERVICE} from './app/core/services/interfaces/safevalues';
import {STRING_TO_COLOR_SERVICE, StringToColorService} from './app/core/services/interfaces/string-to-color';
import {LocalFileServiceImpl} from './app/core/services/local-file.service';
import {SafeValuesServiceImpl} from './app/core/services/safevalues.service';
import {SESSION_SERVICE, SessionService} from './app/core/services/session.service';
import {STREAM_CHAT_SERVICE, StreamChatService} from './app/core/services/stream-chat.service';
import {StringToColorServiceImpl} from './app/core/services/string-to-color.service';
import {TRACE_SERVICE, TraceService} from './app/core/services/trace.service';
import {VIDEO_SERVICE, VideoService} from './app/core/services/video.service';
import {SCREEN_SHARING_SERVICE, ScreenSharingService} from './app/core/services/screensharing.service';
import {WEBSOCKET_SERVICE, WebSocketService} from './app/core/services/websocket.service';
import {LOGO_COMPONENT} from './app/injection_tokens';

fetch('./assets/config/runtime-config.json')
  .then((response) => response.json())
  .then((config) => {
    (window as any)['runtimeConfig'] = config;

    bootstrapApplication(AppComponent, {
      providers: [
        importProvidersFrom(
            BrowserModule, FormsModule, HttpClientModule, AppRoutingModule,
            MatInputModule, MatFormFieldModule, MatButtonModule),
        {provide: SESSION_SERVICE, useClass: SessionService},
        {provide: AGENT_SERVICE, useClass: AgentService},
        {provide: WEBSOCKET_SERVICE, useClass: WebSocketService},
        {
          provide: AUDIO_WORKLET_MODULE_PATH,
          useValue: './assets/audio-processor.js'
        },
        {provide: AUDIO_SERVICE, useClass: AudioService},
        {provide: VIDEO_SERVICE, useClass: VideoService},
        {provide: STREAM_CHAT_SERVICE, useClass: StreamChatService},
        {provide: EVENT_SERVICE, useClass: EventService},
        {provide: EVAL_SERVICE, useClass: EvalService},
        {provide: ARTIFACT_SERVICE, useClass: ArtifactService},
        {provide: DOWNLOAD_SERVICE, useClass: DownloadService},
        {provide: TRACE_SERVICE, useClass: TraceService},
        {provide: FEATURE_FLAG_SERVICE, useClass: FeatureFlagService},
        {provide: GRAPH_SERVICE, useClass: GraphService},
        {provide: STRING_TO_COLOR_SERVICE, useClass: StringToColorServiceImpl},
        {provide: SAFE_VALUES_SERVICE, useClass: SafeValuesServiceImpl},
        {provide: LOCAL_FILE_SERVICE, useClass: LocalFileServiceImpl},
        {provide: MARKDOWN_COMPONENT, useValue: MarkdownComponent},
        ...(config.logo ?
                [{provide: LOGO_COMPONENT, useValue: CustomLogoComponent}] :
                []),
        provideAnimations(),
      ]
    }).catch((err) => console.error(err));
  });
