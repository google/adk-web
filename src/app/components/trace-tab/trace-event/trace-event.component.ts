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
import {AsyncPipe} from '@angular/common';
import {Component, EventEmitter, inject, Input, OnInit, Output, signal} from '@angular/core';
import {toSignal} from '@angular/core/rxjs-interop';
import {MatIconButton} from '@angular/material/button';
import {MatDialog} from '@angular/material/dialog';
import {MatIcon} from '@angular/material/icon';
import {MatProgressSpinner} from '@angular/material/progress-spinner';
import {MatTab, MatTabGroup} from '@angular/material/tabs';
import {DomSanitizer, SafeHtml} from '@angular/platform-browser';
import {NgxJsonViewerModule} from 'ngx-json-viewer';
import {tap} from 'rxjs/operators';

import {Span} from '../../../core/models/Trace';
import {EVENT_SERVICE} from '../../../core/services/interfaces/event';
import {FEATURE_FLAG_SERVICE} from '../../../core/services/interfaces/feature-flag';
import {GRAPH_SERVICE} from '../../../core/services/interfaces/graph';
import {TRACE_SERVICE} from '../../../core/services/interfaces/trace';
import {UI_STATE_SERVICE} from '../../../core/services/interfaces/ui-state';
import {ViewImageDialogComponent} from '../../view-image-dialog/view-image-dialog.component';

@Component({
  selector: 'app-trace-event',
  templateUrl: './trace-event.component.html',
  styleUrl: './trace-event.component.scss',
  imports: [
    MatTabGroup, MatTab, NgxJsonViewerModule, MatIconButton, MatIcon,
    MatProgressSpinner, AsyncPipe
  ]
})
export class TraceEventComponent implements OnInit {
  @Input() userId: string = '';
  @Input() sessionId: string = '';
  @Input() appName: string = '';
  @Output() panelClosed = new EventEmitter<boolean>;

  renderedEventGraph: SafeHtml|undefined;
  eventData: Map<string, any>|undefined;
  selectedRow: Span|undefined = undefined;
  rawSvgString: string|null = null;

  llmRequest: any = undefined;
  llmResponse: any = undefined;
  llmRequestKey = 'gcp.vertex.agent.llm_request';
  llmResponseKey = 'gcp.vertex.agent.llm_response';

  private readonly dialog = inject(MatDialog);
  private readonly traceService = inject(TRACE_SERVICE);
  private readonly eventService = inject(EVENT_SERVICE);
  private readonly graphService = inject(GRAPH_SERVICE);
  private readonly featureFlagService = inject(FEATURE_FLAG_SERVICE);
  private readonly sanitizer = inject(DomSanitizer);
  protected readonly uiStateService = inject(UI_STATE_SERVICE);

  private readonly isEventFilteringEnabled = toSignal(
      this.featureFlagService.isEventFilteringEnabled(),
  );

  constructor() {}

  ngOnInit() {
    this.traceService.selectedTraceRow$.subscribe(span => {
      this.selectedRow = span;
      const eventId = this.getEventIdFromSpan();
      if (eventId) {
        let filter = undefined;
        if (this.isEventFilteringEnabled() && this.selectedRow?.invoc_id &&
            this.selectedRow?.start_time) {
          filter = {
            invocationId: this.selectedRow.invoc_id,
            timestamp: this.selectedRow.start_time / 1000000,
          };
        }
        const eventTraceParam = {id: eventId, ...filter};

        this.eventService.getEventTrace(eventTraceParam)
            .pipe(tap(() => {
              this.uiStateService.setIsEventRequestResponseLoading(true);
            }))
            .subscribe(
                (res) => {
                  this.llmRequest = JSON.parse(res[this.llmRequestKey]);
                  this.llmResponse = JSON.parse(res[this.llmResponseKey]);

                  this.uiStateService.setIsEventRequestResponseLoading(false);
                },
                () => {
                  this.uiStateService.setIsEventRequestResponseLoading(false);
                });
        this.getEventGraph(eventId);
      }
    });
    this.traceService.eventData$.subscribe(e => this.eventData = e);
  }

  openViewImageDialog(imageData: string|null) {
    const dialogRef = this.dialog.open(ViewImageDialogComponent, {
      maxWidth: '90vw',
      maxHeight: '90vh',
      data: {
        imageData,
      },
    });
  }

  getEventDetails() {
    if (this.eventData && this.selectedRow) {
      return this.eventData.get(this.getEventIdFromSpan());
    } else {
      return undefined;
    }
  }

  getEventIdFromSpan() {
    if (!this.selectedRow) {
      return undefined;
    }
    return this.selectedRow.attributes['gcp.vertex.agent.event_id'];
  }

  getEventGraph(eventId: string) {
    this.eventService
        .getEvent(
            this.userId,
            this.appName,
            this.sessionId,
            eventId,
            )
        .subscribe(async (res) => {
          if (!res.dotSrc) {
            this.renderedEventGraph = undefined;
            return;
          }
          const graphSrc = res.dotSrc;
          const svg = await this.graphService.render(graphSrc);
          this.rawSvgString = svg;
          this.renderedEventGraph = this.sanitizer.bypassSecurityTrustHtml(svg);
        });
  }

  closePanel() {
    this.panelClosed.emit(true);
  }
}
