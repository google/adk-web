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
import {Event} from '../../models/types';

import {InjectionToken} from '@angular/core';
import {Observable} from 'rxjs';

export const EVENT_SERVICE = new InjectionToken<EventService>('EventService');

/**
 * Event identifier used to fetch event trace.
 *
 * This is a subset of the Event interface that is used to identify an event.
 */
export type EventIdentifier = Pick<Event, 'id'|'invocationId'|'timestamp'>;

/**
 * Service to provide methods to handle events.
 */
export declare abstract class EventService {
  abstract getEventTrace(event: EventIdentifier): Observable<any>;
  abstract getTrace(sessionId: string): Observable<any>;
  abstract getEvent(
      userId: string,
      appName: string,
      sessionId: string,
      eventId: string,
      ): Observable<{dotSrc?: string}>;
}
