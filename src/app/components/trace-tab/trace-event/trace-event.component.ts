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
import { Component, EventEmitter, Input, OnInit, Output, Inject } from '@angular/core';
import { MatDialog } from '@angular/material/dialog';
import { DomSanitizer, SafeHtml } from '@angular/platform-browser';
import { ViewImageDialogComponent } from '../../view-image-dialog/view-image-dialog.component';
import { TraceService, TRACE_SERVICE } from '../../../core/services/trace.service';
import { Span } from '../../../core/models/Trace';
import { EventService, EVENT_SERVICE } from '../../../core/services/event.service';
import { instance } from '@viz-js/viz';
import { MatTabGroup, MatTab } from '@angular/material/tabs';
import { NgxJsonViewerModule } from 'ngx-json-viewer';
import { MatIconButton } from '@angular/material/button';
import { MatIcon } from '@angular/material/icon';

@Component({
    selector: 'app-trace-event',
    templateUrl: './trace-event.component.html',
    styleUrl: './trace-event.component.scss',
    imports: [MatTabGroup, MatTab, NgxJsonViewerModule, MatIconButton, MatIcon]
})
export class TraceEventComponent implements OnInit {
  @Input() userId: string = "";
  @Input() sessionId: string = "";
  @Input() appName: string = "";
  @Output() panelClosed = new EventEmitter<boolean>;

  renderedEventGraph: SafeHtml | undefined;
  eventData: Map<string, any> | undefined;
  selectedRow: Span | undefined = undefined;
  rawSvgString: string | null = null;

  llmRequest: any = undefined;
  llmResponse: any = undefined;
  llmRequestKey = 'gcp.vertex.agent.llm_request';
  llmResponseKey = 'gcp.vertex.agent.llm_response';


  constructor(private dialog: MatDialog,
    @Inject(TRACE_SERVICE) private traceService: TraceService,
    @Inject(EVENT_SERVICE) private eventService: EventService,
    private sanitizer: DomSanitizer) {
  }

  ngOnInit() {
    this.traceService.selectedTraceRow$.subscribe(span => {
      this.selectedRow = span;
      const eventId = this.getEventIdFromSpan();
      if (eventId) {
        this.eventService.getEventTrace(eventId).subscribe((res) => {
          this.llmRequest = JSON.parse(res[this.llmRequestKey]);
          this.llmResponse = JSON.parse(res[this.llmResponseKey]);
        });
        this.getEventGraph(eventId);
      }
    });
    this.traceService.eventData$.subscribe(e => this.eventData = e);
  }

  openViewImageDialog(imageData: string | null) {
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
    if (!this.selectedRow) { return undefined; }
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
        const viz = await instance();
        const svg = viz.renderString(graphSrc, {
          format: 'svg',
          engine: 'dot',
        });
        this.rawSvgString = svg;
        this.renderedEventGraph = this.sanitizer.bypassSecurityTrustHtml(svg);
      });
  }

  closePanel() {
    this.panelClosed.emit(true);
  }
}
