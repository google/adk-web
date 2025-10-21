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
import {TraceService} from '../trace.service';

@Injectable()
export class MockTraceService implements Partial<TraceService> {
  selectedTraceRow$ = new ReplaySubject<Span|undefined>(1);
  eventData$ = new ReplaySubject<Map<string, any>|undefined>(1);
  hoveredMessageIndices$ = new ReplaySubject<number[]>(1);
  messages$ = new ReplaySubject<any[]>(1);

  selectedRow = jasmine.createSpy('selectedRow');
  setEventData = jasmine.createSpy('setEventData');
  setMessages = jasmine.createSpy('setMessages');
  setHoveredMessages = jasmine.createSpy('setHoveredMessages');
  resetTraceService = jasmine.createSpy('resetTraceService');
}
