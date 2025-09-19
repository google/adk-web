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

import {ComponentFixture, fakeAsync, TestBed, tick,} from '@angular/core/testing';
import {MatDialog, MatDialogModule} from '@angular/material/dialog';
import {DomSanitizer} from '@angular/platform-browser';
import {NoopAnimationsModule} from '@angular/platform-browser/animations';
import {of} from 'rxjs';

import {Span} from '../../../core/models/Trace';
import {EVENT_SERVICE, EventService} from '../../../core/services/event.service';
import {GRAPH_SERVICE, GraphService} from '../../../core/services/graph.service';
import {MockEventService} from '../../../core/services/testing/mock-event.service';
import {MockGraphService} from '../../../core/services/testing/mock-graph.service';
import {MockTraceService} from '../../../core/services/testing/mock-trace.service';
import {TRACE_SERVICE, TraceService} from '../../../core/services/trace.service';
import {ViewImageDialogComponent} from '../../view-image-dialog/view-image-dialog.component';

import {TraceEventComponent} from './trace-event.component';

const EVENT_ID = 'event-id';
const EVENT_DATA = {
  data: 'event data',
};
const IMAGE_DATA = 'image-data';
const DOT_SRC = 'digraph {}';
const RAW_SVG = '<svg>Generated SVG</svg>';
const SANITIZED_SVG = 'sanitized svg';

describe('TraceEventComponent', () => {
  let component: TraceEventComponent;
  let fixture: ComponentFixture<TraceEventComponent>;
  let traceService: MockTraceService;
  let eventService: MockEventService;
  let matDialog: jasmine.SpyObj<MatDialog>;
  let domSanitizer: jasmine.SpyObj<DomSanitizer>;
  let graphService: MockGraphService;

  const span: Span = {
    name: 'test-span',
    trace_id: 'trace-id',
    span_id: 'span-id',
    start_time: 1,
    end_time: 2,
    attributes: {
      'gcp.vertex.agent.event_id': EVENT_ID,
    },
  };

  beforeEach(async () => {
    traceService = new MockTraceService();
    eventService = new MockEventService();

    traceService.selectedTraceRow$.next(span);
    traceService.eventData$.next(
        new Map<string, any>([[EVENT_ID, EVENT_DATA]]));
    eventService.getEventTraceResponse.next({
      'gcp.vertex.agent.llm_request': '{"data": "request"}',
      'gcp.vertex.agent.llm_response': '{"data": "response"}',
    });
    eventService.getEventResponse.next({});
    matDialog = jasmine.createSpyObj<MatDialog>('MatDialog', ['open']);
    domSanitizer = jasmine.createSpyObj<DomSanitizer>('DomSanitizer', [
      'bypassSecurityTrustHtml',
    ]);
    graphService = new MockGraphService();
    graphService.render.and.returnValue(Promise.resolve('svg'));

    await TestBed
        .configureTestingModule({
          imports: [MatDialogModule, TraceEventComponent, NoopAnimationsModule],
          providers: [
            {provide: MatDialog, useValue: matDialog},
            {provide: TRACE_SERVICE, useValue: traceService},
            {provide: EVENT_SERVICE, useValue: eventService},
            {provide: GRAPH_SERVICE, useValue: graphService},
            {
              provide: DomSanitizer,
              useValue: domSanitizer,
            },
          ],
        })
        .compileComponents();

    domSanitizer.bypassSecurityTrustHtml.and.returnValue(SANITIZED_SVG);

    fixture = TestBed.createComponent(TraceEventComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  describe('when initialized', () => {
    it('should populate eventData from the trace service', () => {
      expect(component.eventData)
          .toEqual(
              new Map<string, any>([[EVENT_ID, EVENT_DATA]]),
          );
    });

    it('should populate selectedRow from the trace service', () => {
      expect(component.selectedRow).toEqual(span);
    });

    it('should call event service to get trace for the selected row', () => {
      expect(eventService.getEventTrace).toHaveBeenCalledWith(EVENT_ID);
    });

    it('should call event service to get event details for the selected row',
       () => {
         expect(eventService.getEvent)
             .toHaveBeenCalledWith(
                 '',
                 '',
                 '',
                 EVENT_ID,
             );
       });

    it('should parse LLM request from the event trace', () => {
      expect(component.llmRequest).toEqual({data: 'request'});
    });

    it('should parse LLM response from the event trace', () => {
      expect(component.llmResponse).toEqual({data: 'response'});
    });
  });

  describe('getEventIdFromSpan()', () => {
    it('should return the event_id from the selected row attributes', () => {
      expect(component.getEventIdFromSpan()).toEqual(EVENT_ID);
    });

    it('should return undefined if no row is selected', () => {
      component.selectedRow = undefined;
      expect(component.getEventIdFromSpan()).toBeUndefined();
    });

    it('should return undefined if the selected row lacks the event_id attribute',
       () => {
         component.selectedRow = {
           name: 'test-span',
           trace_id: 'trace-id',
           span_id: 'span-id',
           start_time: 1,
           end_time: 2,
           attributes: {'another_attribute': 'value'},
         };
         expect(component.getEventIdFromSpan()).toBeUndefined();
       });
  });

  describe('getEventDetails()', () => {
    it('should return event details for the selected row from eventData',
       () => {
         expect(component.getEventDetails()).toEqual(EVENT_DATA);
       });

    it('should return undefined if no row is selected', () => {
      component.selectedRow = undefined;
      expect(component.getEventDetails()).toBeUndefined();
    });
  });

  describe('closePanel()', () => {
    it('should emit panelClosed event when called', () => {
      spyOn(component.panelClosed, 'emit');
      component.closePanel();
      expect(component.panelClosed.emit).toHaveBeenCalledWith(true);
    });
  });

  describe('openViewImageDialog()', () => {
    it('should open the ViewImageDialogComponent with the provided image data',
       () => {
         component.openViewImageDialog(IMAGE_DATA);
         expect(matDialog.open).toHaveBeenCalledWith(ViewImageDialogComponent, {
           maxWidth: '90vw',
           maxHeight: '90vh',
           data: {
             imageData: IMAGE_DATA,
           },
         });
       });
  });

  describe('getEventGraph()', () => {
    describe('when event service returns no dotSrc', () => {
      beforeEach(() => {
        eventService.getEventResponse.next({});
      });

      it('should set renderedEventGraph to undefined', fakeAsync(() => {
           component.getEventGraph(EVENT_ID);
           tick();
           expect(component.renderedEventGraph).toBeUndefined();
         }));
    });

    describe('when event service returns dotSrc', () => {
      beforeEach(() => {
        eventService.getEventResponse.next({dotSrc: DOT_SRC});
        graphService.render.and.returnValue(Promise.resolve(RAW_SVG));
        domSanitizer.bypassSecurityTrustHtml.and.returnValue(SANITIZED_SVG);
      });

      it('should render SVG using GraphService', fakeAsync(() => {
           component.getEventGraph(EVENT_ID);
           tick();

           expect(graphService.render).toHaveBeenCalledWith(DOT_SRC);
           expect(component.rawSvgString).toEqual(RAW_SVG);
         }));

      it('should sanitize the result of graph rendering', fakeAsync(() => {
           component.getEventGraph(EVENT_ID);
           tick();

           expect(domSanitizer.bypassSecurityTrustHtml)
               .toHaveBeenCalledWith(
                   RAW_SVG,
               );
           expect(component.renderedEventGraph).toEqual(SANITIZED_SVG);
         }));
    });
  });
});
