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
import {Span} from '../../models/Trace';

export const TRACE_SERVICE = new InjectionToken<TraceService>('TraceService');

/**
 * Service to provide methods to handle traces.
 */
export declare abstract class TraceService {
  abstract selectedTraceRow$: Observable<Span | undefined>;
  abstract eventData$: Observable<Map<string, any> | undefined>;
  abstract hoveredMessageIndices$: Observable<number[]>;
  abstract messages$: Observable<any[]>;

  abstract selectedRow(span: Span | undefined): void;
  abstract setEventData(data: Map<string, any> | undefined): void;
  abstract setMessages(messages: any[]): void;
  abstract setHoveredMessages(span: Span | undefined, invocationId: string): void;
  abstract resetTraceService(): void;
}
