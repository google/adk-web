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

import {Component, EventEmitter, Input, OnChanges, Output, SimpleChanges, computed, inject, input, signal} from '@angular/core';
import {MatDialog} from '@angular/material/dialog';

import {Span} from '../../core/models/Trace';
import {FEATURE_FLAG_SERVICE} from '../../core/services/interfaces/feature-flag';
import {TraceChartComponent} from './trace-chart/trace-chart.component';
import { MatButtonToggleGroup, MatButtonToggle } from '@angular/material/button-toggle';
import { FormsModule } from '@angular/forms';
import { MatList, MatListItem } from '@angular/material/list';
import {AsyncPipe, KeyValuePipe} from '@angular/common';
import {EventTabMessagesInjectionToken} from './event-tab.component.i18n';
import {InvocIdPipe} from './invoc-id.pipe';

@Component({
    selector: 'app-event-tab',
    templateUrl: './event-tab.component.html',
    styleUrl: './event-tab.component.scss',
    standalone: true,
    imports: [
        MatButtonToggleGroup,
        FormsModule,
        MatButtonToggle,
        MatList,
        MatListItem,
        KeyValuePipe,
        InvocIdPipe,
        AsyncPipe,
    ],
})
export class EventTabComponent {
  readonly eventsMap = input<Map<string, any>>(new Map<string, any>());
  readonly traceData = input<Span[]>([]);
  @Output() selectedEvent = new EventEmitter<string>();
  private readonly dialog = inject(MatDialog);
  private readonly featureFlagService = inject(FEATURE_FLAG_SERVICE);
  protected readonly i18n = inject(EventTabMessagesInjectionToken);

  readonly view = signal<string>('events');
  readonly isTraceView = computed(() => this.view() === 'trace');
  readonly spansByTraceId = computed(() => {
    if (!this.traceData() || this.traceData().length == 0) {
      return new Map<string, Span[]>();
    }
    return this.traceData().reduce((map, span) => {
      const key = span.trace_id;
      const group = map.get(key);
      if (group) {
        span.invoc_id = span.attributes?.['gcp.vertex.agent.invocation_id'];
        group.push(span);
        group.sort((a: Span, b: Span) => a.start_time - b.start_time);
      } else {
        map.set(key, [span]);
      }
      return map;
    }, new Map<string, Span[]>());
  });

  showJson: boolean[] = Array(this.eventsMap().size).fill(false);
  readonly isTraceEnabledObs = this.featureFlagService.isTraceEnabled();

  toggleJson(index: number) {
    this.showJson[index] = !this.showJson[index];
  }

  selectEvent(key: string) {
    this.selectedEvent.emit(key);
  }

  mapOrderPreservingSort = (a: any, b: any): number => 0;

  findInvocId(spans: Span[]) {
    return spans
        .find(
            item => item.attributes !== undefined &&
                'gcp.vertex.agent.invocation_id' in item.attributes)
        ?.attributes['gcp.vertex.agent.invocation_id']
  }

  openDialog(traceId: string): void {
    const spans = this.spansByTraceId().get(traceId);
    if (!spans) return;

    const dialogRef = this.dialog.open(TraceChartComponent, {
      width: 'auto',
      maxWidth: '90vw',
      data: {spans, invocId: this.findInvocId(spans)},
    });
  }
}
