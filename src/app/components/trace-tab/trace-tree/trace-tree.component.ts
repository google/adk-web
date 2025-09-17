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
import {Component, Input, OnChanges, SimpleChanges, Inject} from '@angular/core';

import {Span} from '../../../core/models/Trace';
import {TraceService, TRACE_SERVICE} from '../../../core/services/trace.service';
import { NgStyle } from '@angular/common';


@Component({
    selector: 'app-trace-tree',
    templateUrl: './trace-tree.component.html',
    styleUrl: './trace-tree.component.scss',
    imports: [NgStyle]
})
export class TraceTreeComponent {
  @Input() spans: any[] = [];
  @Input() invocationId: string = '';
  tree: Span[] = [];
  eventData: Map<string, any>|undefined;
  baseStartTimeMs = 0;
  totalDurationMs = 1;
  flatTree: {span: Span; level: number}[] = [];
  traceLabelIconMap = new Map<string, string>([
    ['Invocation', 'start'],
    ['agent_run', 'directions_run'],
    ['tool', 'build'],
    ['call_llm', 'chat'],
  ]);
  selectedRow: Span|undefined = undefined;

  constructor(@Inject(TRACE_SERVICE) private traceService: TraceService) {}

  ngOnInit(): void {
    this.tree = this.buildSpanTree(this.spans);
    this.flatTree = this.flattenTree(this.tree);
    const times = this.getGlobalTimes(this.spans);
    this.baseStartTimeMs = times.start;
    this.totalDurationMs = times.duration;
    this.traceService.selectedTraceRow$.subscribe(
        span => this.selectedRow = span);
    this.traceService.eventData$.subscribe(e => this.eventData = e);
  }


  buildSpanTree(spans: Span[]): Span[] {
    const spanClones = spans.map(span => ({...span}));
    const spanMap = new Map<string, Span>();
    const roots: Span[] = [];

    spanClones.forEach(span => spanMap.set(span.span_id, span));
    spanClones.forEach(span => {
      if (span.parent_span_id && spanMap.has(span.parent_span_id)) {
        const parent = spanMap.get(span.parent_span_id)!;
        parent.children = parent.children || [];
        parent.children.push(span);
      } else {
        roots.push(span);
      }
    });

    return roots;
  }

  getGlobalTimes(spans: Span[]) {
    const start = Math.min(...spans.map(s => this.toMs(s.start_time)));
    const end = Math.max(...spans.map(s => this.toMs(s.end_time)));
    return {start, duration: end - start};
  }

  toMs(nanos: number): number {
    return nanos / 1_000_000;
  }

  getRelativeStart(span: Span): number {
    return ((this.toMs(span.start_time) - this.baseStartTimeMs) /
            this.totalDurationMs) *
        100;
  }

  getRelativeWidth(span: Span): number {
    return ((this.toMs(span.end_time) - this.toMs(span.start_time)) /
            this.totalDurationMs) *
        100;
  }

  flattenTree(spans: Span[], level: number = 0): any[] {
    const tree = spans.flatMap(
        span =>
            [{span, level},
             ...(span.children ? this.flattenTree(span.children, level + 1) :
                                 [])]);
    return tree
  }

  getSpanIcon(label: string) {
    for (const [key, value] of this.traceLabelIconMap.entries()) {
      if (label.startsWith(key)) {
        return value;
      }
    }
    return 'start';
  }

  getArray(n: number): number[] {
    return Array.from({length: n});
  }

  selectRow(node: any) {
    if (this.selectedRow && this.selectedRow.span_id == node.span.span_id) {
      this.traceService.selectedRow(undefined);
      this.traceService.setHoveredMessages(undefined, this.invocationId)
      return;
    }
    this.traceService.selectedRow(node.span);
    this.traceService.setHoveredMessages(node.span, this.invocationId)
  }

  rowSelected(node: any) {
    return this.selectedRow == node.span
  }

  isEventRow(node: any) {
    if (!node.span.attributes) {
      return false;
    }
    const eventId = node?.span.attributes['gcp.vertex.agent.event_id'];
    if (eventId && this.eventData && this.eventData.has(eventId)) {
      return true;
    }
    return false;
  }

  onHover(n: any) {
    this.traceService.setHoveredMessages(n.span, this.invocationId)
  }

  onHoverOut() {
    this.traceService.setHoveredMessages(undefined, this.invocationId);
    if (this.selectedRow) {
      this.traceService.setHoveredMessages(this.selectedRow, this.invocationId);
    }
  }
}
