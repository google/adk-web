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
import {Injectable} from '@angular/core';
import {URLUtil} from '../../../utils/url-util';
import {EventIdentifier, EventService as EventServiceInterface} from './interfaces/event';

@Injectable({
  providedIn: 'root',
})
export class EventService implements EventServiceInterface {
  apiServerDomain = URLUtil.getApiServerBaseUrl();
  constructor(private http: HttpClient) {}

  /**
   * Returns the trace data for a given event id.
   */
  getEventTrace(event: EventIdentifier) {
    const url = this.apiServerDomain + `/debug/trace/${event.id!}`;
    return this.http.get<any>(url);
  }

  getTrace(sessionId: string) {
    const url = this.apiServerDomain + `/debug/trace/session/${sessionId}`;
    return this.http.get<any>(url);
  }

  getEvent(
      userId: string,
      appName: string,
      sessionId: string,
      eventId: string,
  ) {
    const url = this.apiServerDomain +
        `/apps/${appName}/users/${userId}/sessions/${sessionId}/events/${
                    eventId}/graph`;
    return this.http.get<{dotSrc?: string}>(url);
  }
}
