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

import {HttpClient} from '@angular/common/http';
import {Injectable, InjectionToken} from '@angular/core';
import {Observable} from 'rxjs';

import {URLUtil} from '../../../utils/url-util';

export const SESSION_SERVICE = new InjectionToken<SessionService>('SessionService');

@Injectable({
  providedIn: 'root',
})
export class SessionService {
  apiServerDomain = URLUtil.getApiServerBaseUrl();
  constructor(private http: HttpClient) {}

  createSession(userId: string, appName: string) {
    if (this.apiServerDomain != undefined) {
      const url =
          this.apiServerDomain + `/apps/${appName}/users/${userId}/sessions`;
      return this.http.post<any>(url, null);
    }
    return new Observable<any>();
  }

  listSessions(userId: string, appName: string) {
    if (this.apiServerDomain != undefined) {
      const url =
          this.apiServerDomain + `/apps/${appName}/users/${userId}/sessions`;

      return this.http.get<any>(url);
    }
    return new Observable<[]>();
  }

  deleteSession(userId: string, appName: string, sessionId: string) {
    const url = this.apiServerDomain +
        `/apps/${appName}/users/${userId}/sessions/${sessionId}`;

    return this.http.delete<any>(url);
  }

  getSession(userId: string, appName: string, sessionId: string) {
    const url = this.apiServerDomain +
        `/apps/${appName}/users/${userId}/sessions/${sessionId}`;

    return this.http.get<any>(url);
  }

  importSession(userId: string, appName: string, events: any[]) {
    if (this.apiServerDomain != undefined) {
      const url = this.apiServerDomain +
          `/apps/${appName}/users/${userId}/sessions`;

      return this.http.post<any>(url, {
        appName: appName,
        userId: userId,
        events: events,
      });
    }

    return new Observable<any>();
  }
}
