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
import {Session} from '../../models/Session';

export const SESSION_SERVICE = new InjectionToken<SessionService>('SessionService');

/**
 * Service to provide methods to handle sessions.
 */
export declare abstract class SessionService {
  abstract createSession(userId: string, appName: string): Observable<Session>;
  abstract listSessions(userId: string, appName: string): Observable<Session[]>;
  abstract deleteSession(
    userId: string,
    appName: string,
    sessionId: string,
  ): Observable<any>;
  abstract getSession(
    userId: string,
    appName: string,
    sessionId: string,
  ): Observable<Session>;
  abstract importSession(
    userId: string,
    appName: string,
    events: any[],
  ): Observable<Session>;
}
