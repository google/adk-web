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
import {HttpClientModule} from '@angular/common/http';
import {importProvidersFrom} from '@angular/core';
import {FormsModule} from '@angular/forms';
import {MatButtonModule} from '@angular/material/button';
import {MatFormFieldModule} from '@angular/material/form-field';
import {MatInputModule} from '@angular/material/input';
import {bootstrapApplication, BrowserModule} from '@angular/platform-browser';
import {provideAnimations} from '@angular/platform-browser/animations';
import {provideMarkdown} from 'ngx-markdown';

import {AppRoutingModule} from './app/app-routing.module';
import {AppComponent} from './app/app.component';
import {CustomLogoComponent} from './app/components/custom-logo/custom-logo.component';
import {EVAL_TAB_COMPONENT, EvalTabComponent} from './app/components/eval-tab/eval-tab.component';
import {MarkdownComponent} from './app/components/markdown/markdown.component';
import {MARKDOWN_COMPONENT} from './app/components/markdown/markdown.component.interface';
import {AgentService} from './app/core/services/agent.service';
import {ArtifactService} from './app/core/services/artifact.service';
import {AudioPlayingService} from './app/core/services/audio-playing.service';
import {AudioRecordingService} from './app/core/services/audio-recording.service';
import {DownloadService} from './app/core/services/download.service';
import {EvalService} from './app/core/services/eval.service';
import {EventService} from './app/core/services/event.service';
import {FeatureFlagService} from './app/core/services/feature-flag.service';
import {GraphService} from './app/core/services/graph.service';
import {AGENT_SERVICE} from './app/core/services/interfaces/agent';
import {AGENT_BUILDER_SERVICE} from './app/core/services/interfaces/agent-builder';
import {ARTIFACT_SERVICE} from './app/core/services/interfaces/artifact';
import {AUDIO_PLAYING_SERVICE} from './app/core/services/interfaces/audio-playing';
import {AUDIO_RECORDING_SERVICE, AUDIO_WORKLET_MODULE_PATH} from './app/core/services/interfaces/audio-recording';
import {DOWNLOAD_SERVICE} from './app/core/services/interfaces/download';
import {EVAL_SERVICE} from './app/core/services/interfaces/eval';
import {EVENT_SERVICE} from './app/core/services/interfaces/event';
import {FEATURE_FLAG_SERVICE} from './app/core/services/interfaces/feature-flag';
import {GRAPH_SERVICE} from './app/core/services/interfaces/graph';
import {LOCAL_FILE_SERVICE} from './app/core/services/interfaces/localfile';
import {PENDING_EVENT_SERVICE} from './app/core/services/interfaces/pendingevent';
import {SAFE_VALUES_SERVICE} from './app/core/services/interfaces/safevalues';
import {SESSION_SERVICE} from './app/core/services/interfaces/session';
import {STREAM_CHAT_SERVICE} from './app/core/services/interfaces/stream-chat';
import {STRING_TO_COLOR_SERVICE} from './app/core/services/interfaces/string-to-color';
import {TRACE_SERVICE} from './app/core/services/interfaces/trace';
import {UI_STATE_SERVICE} from './app/core/services/interfaces/ui-state';
import {VIDEO_SERVICE} from './app/core/services/interfaces/video';
import {WEBSOCKET_SERVICE} from './app/core/services/interfaces/websocket';
import {LocalFileServiceImpl} from './app/core/services/local-file.service';
import {PendingEventServiceImpl} from './app/core/services/pending-event.service';
import {SafeValuesServiceImpl} from './app/core/services/safevalues.service';
import {SessionService} from './app/core/services/session.service';
import {StreamChatService} from './app/core/services/stream-chat.service';
import {StringToColorServiceImpl} from './app/core/services/string-to-color.service';
import {TraceService} from './app/core/services/trace.service';
import {VideoService} from './app/core/services/video.service';
import {WebSocketService} from './app/core/services/websocket.service';
import {LOGO_COMPONENT} from './app/injection_tokens';
import {AgentBuilderService} from './app/core/services/agent-builder.service';
import {LOCATION_SERVICE} from './app/core/services/location.service';
import {UiStateService} from './app/core/services/ui-state.service';

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
          {provide: AUDIO_RECORDING_SERVICE, useClass: AudioRecordingService},
          {provide: AUDIO_PLAYING_SERVICE, useClass: AudioPlayingService},
          {provide: VIDEO_SERVICE, useClass: VideoService},
          {provide: STREAM_CHAT_SERVICE, useClass: StreamChatService},
          {provide: EVENT_SERVICE, useClass: EventService},
          {provide: EVAL_SERVICE, useClass: EvalService},
          {provide: ARTIFACT_SERVICE, useClass: ArtifactService},
          {provide: DOWNLOAD_SERVICE, useClass: DownloadService},
          {provide: TRACE_SERVICE, useClass: TraceService},
          {provide: FEATURE_FLAG_SERVICE, useClass: FeatureFlagService},
          {provide: GRAPH_SERVICE, useClass: GraphService},
          {
            provide: STRING_TO_COLOR_SERVICE,
            useClass: StringToColorServiceImpl
          },
          {provide: SAFE_VALUES_SERVICE, useClass: SafeValuesServiceImpl},
          {provide: LOCAL_FILE_SERVICE, useClass: LocalFileServiceImpl},
          {provide: PENDING_EVENT_SERVICE, useClass: PendingEventServiceImpl},
          {provide: MARKDOWN_COMPONENT, useValue: MarkdownComponent},
          ...(config.logo ?
                  [{provide: LOGO_COMPONENT, useValue: CustomLogoComponent}] :
                  []),
          { provide: AGENT_BUILDER_SERVICE, useClass: AgentBuilderService },
          {provide: EVAL_TAB_COMPONENT, useValue: EvalTabComponent},
        provideAnimations(),
          provideMarkdown(),
          {provide: LOCATION_SERVICE, useClass: Location},
          {provide: UI_STATE_SERVICE, useClass: UiStateService}
      ]
      }).catch((err) => console.error(err));
    });
