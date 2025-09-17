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

import {Component, EventEmitter, Input, OnChanges, Output, SimpleChanges} from '@angular/core';
import {MatDialog} from '@angular/material/dialog';

import {TraceChartComponent} from './trace-chart/trace-chart.component';
import { MatButtonToggleGroup, MatButtonToggle } from '@angular/material/button-toggle';
import { FormsModule } from '@angular/forms';
import { MatList, MatListItem } from '@angular/material/list';
import { KeyValuePipe } from '@angular/common';

@Component({
    selector: 'app-event-tab',
    templateUrl: './event-tab.component.html',
    styleUrl: './event-tab.component.scss',
    imports: [
        MatButtonToggleGroup,
        FormsModule,
        MatButtonToggle,
        MatList,
        MatListItem,
        KeyValuePipe,
    ],
})
export class EventTabComponent implements OnChanges {
  @Input() eventsMap = new Map<string, any>();
  @Output() selectedEvent = new EventEmitter<string>();
  @Input() traceData: any[] = [];
  llmRequest: any = undefined;
  llmResponse: any = undefined;
  llmRequestKey = 'gcp.vertex.agent.llm_request';
  llmResponseKey = 'gcp.vertex.agent.llm_response';
  isDetailsPanelOpen = false;
  view = 'events';
  invocTraces = new Map<string, any[]>();

  constructor(private dialog: MatDialog) {}

  ngOnChanges(changes: SimpleChanges): void {
    if ('traceData' in changes) {
      this.prcessTraceDataToInvocTrace();
    }
  }

  showJson: boolean[] = Array(this.eventsMap.size).fill(false);

  toggleJson(index: number) {
    this.showJson[index] = !this.showJson[index];
  }

  selectEvent(key: string) {
    this.selectedEvent.emit(key);
  }

  isTraceView() {
    return this.view == 'trace';
  }

  mapOrderPreservingSort = (a: any, b: any): number => 0;

  prcessTraceDataToInvocTrace() {
    if (!this.traceData || this.traceData.length == 0) {
      return;
    }
    this.invocTraces = this.traceData.reduce((map, item) => {
      const key = item.trace_id;
      const group = map.get(key);
      if (group) {
        group.push(item);
        group.sort((a: any, b: any) => a.start_time - b.start_time);
      } else {
        map.set(key, [item]);
      }
      return map;
    }, new Map<string, any[]>());
  }

  findInvocIdFromTraceId(traceId: string) {
    const group = this.invocTraces.get(traceId);
    return group
        ?.find(
            item => item.attributes !== undefined &&
                'gcp.vertex.agent.invocation_id' in item.attributes)
        .attributes['gcp.vertex.agent.invocation_id']
  }

  openDialog(traceId: string): void {
    const dialogRef = this.dialog.open(TraceChartComponent, {
      width: 'auto',
      maxWidth: '90vw',
      data: {
        spans: this.invocTraces.get(traceId),
        invocId: this.findInvocIdFromTraceId(traceId)
      },
    });
  }
}
