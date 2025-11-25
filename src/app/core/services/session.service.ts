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
import {Observable, of} from 'rxjs';
import {map} from 'rxjs/operators';

import {URLUtil} from '../../../utils/url-util';
import {Session} from '../models/Session';

import {ListResponse, SessionService as SessionServiceInterface} from './interfaces/session';

@Injectable({
  providedIn: 'root',
})
export class SessionService implements SessionServiceInterface {
  apiServerDomain = URLUtil.getApiServerBaseUrl();
  constructor(private http: HttpClient) {}

  createSession(userId: string, appName: string) {
    if (this.apiServerDomain != undefined) {
      const url =
          this.apiServerDomain + `/apps/${appName}/users/${userId}/sessions`;
      return this.http.post<any>(url, null);
    }
    return new Observable<Session>();
  }

  listSessions(userId: string, appName: string):
      Observable<ListResponse<Session>> {
    if (this.apiServerDomain != undefined) {
      const url =
          this.apiServerDomain + `/apps/${appName}/users/${userId}/sessions`;

      return this.http.get<any>(url).pipe(map((res) => {
        return {
          items: res as Session[],
          nextPageToken: '',
        };
      }));
    }
    return of<ListResponse<Session>>({
      items: [] as Session[],
      nextPageToken: '',
    });
  }

  deleteSession(userId: string, appName: string, sessionId: string) {
    const url = this.apiServerDomain +
        `/apps/${appName}/users/${userId}/sessions/${sessionId}`;

    return this.http.delete<any>(url);
  }

  getSession(userId: string, appName: string, sessionId: string) {
    const url = this.apiServerDomain +
        `/apps/${appName}/users/${userId}/sessions/${sessionId}`;

    return this.http.get<Session>(url);
  }

  importSession(userId: string, appName: string, events: any[]) {
    if (this.apiServerDomain != undefined) {
      const url =
          this.apiServerDomain + `/apps/${appName}/users/${userId}/sessions`;

      return this.http.post<Session>(url, {
        appName: appName,
        userId: userId,
        events: events,
      });
    }

    return new Observable<Session>();
  }

  canEdit(userId: string, session: Session): Observable<boolean> {
    return of(true);
  }
}
