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

import {Injectable} from '@angular/core';
import {of, ReplaySubject} from 'rxjs';

import {WebSocketService} from '../websocket.service';

@Injectable()
export class MockWebSocketService implements Partial<WebSocketService> {
  connect = jasmine.createSpy('connect');
  sendMessage = jasmine.createSpy('sendMessage');
  closeConnection = jasmine.createSpy('closeConnection');
  getMessagesResponse = new ReplaySubject<string>(1);
  getMessages = jasmine.createSpy('getMessages')
                    .and.returnValue(this.getMessagesResponse);
  onCloseReasonResponse = new ReplaySubject<string>(1);
  onCloseReason = jasmine.createSpy('onCloseReason')
                      .and.returnValue(this.onCloseReasonResponse);
}
