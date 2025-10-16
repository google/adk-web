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

import {InjectionToken} from '@angular/core';
import {Observable} from 'rxjs';
import {LiveRequest} from '../../models/LiveRequest';

export const WEBSOCKET_SERVICE =
    new InjectionToken<WebSocketService>('WebSocketService');

/**
 * Service to provide methods to handle websocket connections.
 */
export declare abstract class WebSocketService {
  abstract connect(serverUrl: string): void;
  abstract sendMessage(data: LiveRequest): void;
  abstract closeConnection(): void;
  abstract getMessages(): Observable<string>;
  abstract urlSafeBase64ToBase64(urlSafeBase64: string): string;
  abstract emitWsCloseReason(reason: string): void;
  abstract onCloseReason(): Observable<string>;
}
