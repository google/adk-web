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
import {Component, Input, OnChanges, OnInit, SimpleChange, SimpleChanges} from '@angular/core';
import { MatDialogTitle } from '@angular/material/dialog';
import { MatExpansionPanel, MatExpansionPanelHeader, MatExpansionPanelTitle } from '@angular/material/expansion';
import { TraceTreeComponent } from './trace-tree/trace-tree.component';
import { KeyValuePipe } from '@angular/common';
@Component({
    selector: 'app-trace-tab',
    templateUrl: './trace-tab.component.html',
    styleUrl: './trace-tab.component.scss',
    imports: [MatDialogTitle, MatExpansionPanel, MatExpansionPanelHeader, MatExpansionPanelTitle, TraceTreeComponent, KeyValuePipe]
})

export class TraceTabComponent implements OnInit, OnChanges {
  @Input() traceData: any = [];
  invocTraces = new Map<string, any[]>();
  invocToUserMsg = new Map<string, string>();

  constructor() {}

  ngOnInit(): void {}

  ngOnChanges(changes: SimpleChanges) {
    if ('traceData' in changes) {
      this.rebuildTrace();
    }
  }

  rebuildTrace() {
    this.invocTraces = this.traceData.reduce((map: any, item: any) => {
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

    for (const [key, value] of this.invocTraces) {
      this.invocToUserMsg.set(key, this.findUserMsgFromInvocGroup(value))
    }
  }


  getArray(n: number): number[] {
    return Array.from({length: n});
  }

  findUserMsgFromInvocGroup(group: any[]) {
    const eventItem = group?.find(
        item => item.attributes !== undefined &&
            'gcp.vertex.agent.invocation_id' in item.attributes)
    const requestJson =
        JSON.parse(eventItem.attributes['gcp.vertex.agent.llm_request'])
    const userContent =
        requestJson.contents.filter((c: any) => c.role == 'user').at(-1)
    return userContent.parts[0]?.text ?? '[attachment]';
  }

  findInvocIdFromTraceId(traceId: string) {
    const group = this.invocTraces.get(traceId);
    return group
        ?.find(
            item => item.attributes !== undefined &&
                'gcp.vertex.agent.invocation_id' in item.attributes)
        .attributes['gcp.vertex.agent.invocation_id']
  }

  mapOrderPreservingSort = (a: any, b: any): number => 0;
}
