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

import {TestBed} from '@angular/core/testing';
import {firstValueFrom} from 'rxjs';

import {Span} from '../models/Trace';

import {TraceService} from './trace.service';

describe('TraceService', () => {
  let service: TraceService;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [TraceService],
    });
    service = TestBed.inject(TraceService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });

  describe('selectedRow', () => {
    it('should update selectedTraceRow$ with the given span', async () => {
      const span: Span = {
        name: 'test-span',
        trace_id: '1',
        span_id: '1',
        parent_span_id: undefined,
        start_time: 0,
        end_time: 0,
        attributes: {},
      };
      service.selectedRow(span);
      const selectedSpan = await firstValueFrom(service.selectedTraceRow$);
      expect(selectedSpan).toEqual(span);
    });
  });

  describe('setEventData', () => {
    it('should update eventData$ with given data', async () => {
      const eventData = new Map<string, any>([['event1', {}]]);
      service.setEventData(eventData);
      const data = await firstValueFrom(service.eventData$);
      expect(data).toEqual(eventData);
    });
  });

  describe('setMessages', () => {
    it('should update messages$ with given messages', async () => {
      const messages = [{role: 'user', text: 'hello'}];
      service.setMessages(messages);
      const msgs = await firstValueFrom(service.messages$);
      expect(msgs).toEqual(messages);
    });
  });

  describe('setHoveredMessages', () => {
    it('should set hovered indices to empty if span is undefined', async () => {
      service.setHoveredMessages(undefined, 'inv1');
      const indices = await firstValueFrom(service.hoveredMessageIndicies$);
      expect(indices).toEqual([]);
    });

    it('should set hovered indices for span with specific event_id',
       async () => {
         const messages = [
           {role: 'user', eventId: 'e0'},
           {role: 'bot', eventId: 'e1'},
           {role: 'bot', eventId: 'e2'},
         ];
         const eventData = new Map<string, any>([
           ['e1', {invocationId: 'inv1'}],
           ['e2', {invocationId: 'inv1'}],
         ]);
         const span: Partial<Span> = {
           attributes: {'gcp.vertex.agent.event_id': 'e1'},
         };
         service.setMessages(messages);
         service.setEventData(eventData);
         service.setHoveredMessages(span as Span, 'inv1');
         const indices = await firstValueFrom(service.hoveredMessageIndicies$);
         expect(indices).toEqual([1]);
       });

    it('should set hovered indices for span without event_id but matching invocationId',
       async () => {
         const messages = [
           {role: 'user', eventId: 'e0'},
           {role: 'bot', eventId: 'e1'},
           {role: 'bot', eventId: 'e2'},
         ];
         const eventData = new Map<string, any>([
           ['e1', {invocationId: 'inv1'}],
           ['e2', {invocationId: 'inv2'}],
         ]);
         const span: Partial<Span> = {
           attributes: {},
         };
         service.setMessages(messages);
         service.setEventData(eventData);
         service.setHoveredMessages(span as Span, 'inv1');
         const indices = await firstValueFrom(service.hoveredMessageIndicies$);
         expect(indices).toEqual([1]);
       });
  });

  describe('resetTraceService', () => {
    it('should reset eventData to undefined', async () => {
      service.setEventData(new Map<string, any>());
      service.resetTraceService();
      const data = await firstValueFrom(service.eventData$);
      expect(data).toBeUndefined();
    });

    it('should reset messages to empty array', async () => {
      service.setMessages([{}]);
      service.resetTraceService();
      const messages = await firstValueFrom(service.messages$);
      expect(messages).toEqual([]);
    });

    it('should reset hoveredMessageIndicies to empty array', async () => {
      service.setHoveredMessages({} as Span, 'inv1');
      service.resetTraceService();
      const indices = await firstValueFrom(service.hoveredMessageIndicies$);
      expect(indices).toEqual([]);
    });
  });
});
