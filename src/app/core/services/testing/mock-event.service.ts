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

import {Span} from '../../models/Trace';
import {EventService} from '../event.service';

@Injectable()
export class MockEventService implements Partial<EventService> {
  getEventTraceResponse = new ReplaySubject<{
    'gcp.vertex.agent.llm_request': string,
    'gcp.vertex.agent.llm_response': string,
  }>(1);
  getEventTrace = jasmine.createSpy('getEventTrace')
                      .and.returnValue(this.getEventTraceResponse);
  getTraceResponse = new ReplaySubject<Span[]>(1);
  getTrace =
      jasmine.createSpy('getTrace').and.returnValue(this.getTraceResponse);
  getEventResponse = new ReplaySubject<{dotSrc?: string}>(1);
  getEvent =
      jasmine.createSpy('getEvent').and.returnValue(this.getEventResponse);
}
