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
import { Injectable, InjectionToken } from '@angular/core';
import { BehaviorSubject, Subject } from 'rxjs';
import { Span } from '../models/Trace';

export const TRACE_SERVICE = new InjectionToken<TraceService>('TraceService');

@Injectable({ providedIn: 'root' })
export class TraceService {
    private selectedTraceRowSource = new BehaviorSubject<Span | undefined>(undefined);
    selectedTraceRow$ = this.selectedTraceRowSource.asObservable();

    private eventDataSource = new BehaviorSubject<Map<string, any> | undefined>(undefined);
    eventData$ = this.eventDataSource.asObservable();

    private hoveredMessageIndiciesSource = new BehaviorSubject<number[]>([]);
    hoveredMessageIndicies$ = this.hoveredMessageIndiciesSource.asObservable();

    private messagesSource = new BehaviorSubject<any[]>([]);
    messages$ = this.messagesSource.asObservable();

    selectedRow(span: Span | undefined) {
        this.selectedTraceRowSource.next(span);
    }

    setEventData(data: Map<string, any> | undefined) {
        this.eventDataSource.next(data);
    }

    setMessages(messages: any[]) {
        this.messagesSource.next(messages)
    }

    setHoveredMessages(span: Span | undefined, invocationId: string) {
        if (!span) {
            this.hoveredMessageIndiciesSource.next([]);
            return;
        }

        const attributes = span.attributes
        const hasEvent: boolean = attributes && attributes['gcp.vertex.agent.event_id']
        let index = 0;
        const messageIndices = [];
        for (const msg of this.messagesSource.value) {
            if (msg.role == 'user') {
                index++
                continue
            }

            if (this.eventDataSource.value?.get(msg.eventId).invocationId != invocationId) {
                index++
                continue
            }

            if (!hasEvent) {
                messageIndices.push(index)
                index++
                continue
            } else {
                if (attributes['gcp.vertex.agent.event_id'] == msg.eventId) {
                    messageIndices.push(index)
                    index++
                    continue
                } else {
                    index++
                    continue
                }
            }
        }
        this.hoveredMessageIndiciesSource.next(messageIndices);
    }

    resetTraceService() {
        this.eventDataSource.next(undefined);
        this.messagesSource.next([]);
        this.hoveredMessageIndiciesSource.next([])
    }
}
