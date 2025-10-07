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

import { Component, Inject, OnInit } from "@angular/core";
import { MAT_DIALOG_DATA, MatDialogRef, MatDialogTitle, MatDialogContent, MatDialogActions, MatDialogClose } from "@angular/material/dialog";
import { CdkScrollable } from "@angular/cdk/scrolling";
import { MatButton } from "@angular/material/button";

export interface Span {
  name: string;
  start_time: number;
  end_time: number;
  span_id: string;
  parent_span_id?: string;
  trace_id: string;
  attributes?: any;
  children?: Span[];
}

interface SpanNode extends Span {
  children: SpanNode[];
  depth: number;
  duration: number;
  id: string; // Using span_id as string ID
}

interface TimeTick {
  position: number;
  label: string;
}

@Component({
    selector: 'app-trace-chart',
    templateUrl: './trace-chart.component.html',
    styleUrl: './trace-chart.component.scss',
    imports: [MatDialogTitle, CdkScrollable, MatDialogContent, MatDialogActions, MatButton, MatDialogClose]
})
export class TraceChartComponent implements OnInit {
  tree: Span[] = [];
  baseStartTimeMs = 0;
  totalDurationMs = 1;
  flatTree: { span: Span; level: number }[] = [];
  traceLabelIconMap = new Map<string, string>([
    ['Invocation', 'start'],
    // TODO: Remove agent_run mapping once all ADKs span names follow OTLP GenAI semconv.
    ['agent_run', 'directions_run'],
    ['invoke_agent', 'directions_run'],
    ['tool', 'build'],
    ['call_llm', 'chat'],
  ]);

  constructor(
    public dialogRef: MatDialogRef<TraceChartComponent>,
    @Inject(MAT_DIALOG_DATA) public data: any
  ) {}

  ngOnInit(): void {
    this.tree = this.buildSpanTree(this.data.spans);
    this.flatTree = this.flattenTree(this.tree);
    const times = this.getGlobalTimes(this.data.spans);
    this.baseStartTimeMs = times.start;
    this.totalDurationMs = times.duration;
  }

  buildSpanTree(spans: Span[]): Span[] {
    const spanClones = spans.map(span => ({ ...span })); 
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
    return { start, duration: end - start };
  }

  toMs(nanos: number): number {
    return nanos / 1_000_000;
  }

  getRelativeStart(span: Span): number {
    return ((this.toMs(span.start_time) - this.baseStartTimeMs) / this.totalDurationMs) * 100;
  }

  getRelativeWidth(span: Span): number {
    return ((this.toMs(span.end_time) - this.toMs(span.start_time)) / this.totalDurationMs) * 100;
  }

  flattenTree(spans: Span[], level: number = 0): any[] {
    const tree = spans.flatMap(span => [
      { span, level },
      ...(span.children ? this.flattenTree(span.children, level + 1) : [])
    ]);
    return tree
  }

  getSpanIcon(label: string) {
    for (const [key, value] of this.traceLabelIconMap.entries()) {
      if (label.startsWith(key)) {
        return value;
      }
    }
    return "start";
  }

  getArray(n: number): number[] {
    return Array.from({ length: n });
  }
}
