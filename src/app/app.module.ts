/**
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

import {NgModule} from '@angular/core';
import {FormsModule} from '@angular/forms';
import {BrowserModule} from '@angular/platform-browser';
import {AppRoutingModule} from './app-routing.module';

import {HttpClientModule} from '@angular/common/http';
import {MatButtonModule} from '@angular/material/button';
import {MatFormFieldModule} from '@angular/material/form-field';
import {MatInputModule} from '@angular/material/input';
import {BrowserAnimationsModule} from '@angular/platform-browser/animations';
import {AppComponent} from './app.component';
import {ComponentModule} from './components/component.module';
import {AgentService} from './core/services/agent.service';
import {ArtifactService} from './core/services/artifact.service';
import {AudioService} from './core/services/audio.service';
import {DownloadService} from './core/services/download.service';
import {EvalService} from './core/services/eval.service';
import {EventService} from './core/services/event.service';
import {FileStorageService} from './core/services/file-storage.service';
import {SessionService} from './core/services/session.service';
import {VideoService} from './core/services/video.service';
import {WebSocketService} from './core/services/websocket.service';

@NgModule({
  declarations: [AppComponent],
  imports: [
    ComponentModule,
    BrowserModule,
    FormsModule,
    HttpClientModule,
    AppRoutingModule,
    MatInputModule,
    MatFormFieldModule,
    MatButtonModule,
    BrowserAnimationsModule,
    MatButtonModule,
  ],
  providers: [
    SessionService,
    AgentService,
    WebSocketService,
    AudioService,
    VideoService,
    EventService,
    EvalService,
    ArtifactService,
    DownloadService,
    FileStorageService,
  ],
  bootstrap: [AppComponent],
})
export class AppModule {}
