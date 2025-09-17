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

import { ComponentFixture, TestBed } from '@angular/core/testing';
import { MatDialog, MatDialogModule } from '@angular/material/dialog';
import { TraceEventComponent } from './trace-event.component';
import { TRACE_SERVICE, TraceService } from '../../../core/services/trace.service';
import { EVENT_SERVICE, EventService } from '../../../core/services/event.service';
import { DomSanitizer } from '@angular/platform-browser';
import { of } from 'rxjs';
import { NoopAnimationsModule } from '@angular/platform-browser/animations';

describe('TraceEventComponent', () => {
  let component: TraceEventComponent;
  let fixture: ComponentFixture<TraceEventComponent>;

  beforeEach(async () => {
    const traceService = {
      selectedTraceRow$: of(undefined),
      eventData$: of(new Map<string, any>()),
      setHoveredMessages: () => {},
      selectedRow: () => {},
    };

    const eventService = jasmine.createSpyObj<EventService>([
      'getEventTrace',
      'getEvent',
    ]);
    eventService.getEventTrace.and.returnValue(of({}));
    eventService.getEvent.and.returnValue(of({} as any));

    await TestBed.configureTestingModule({
      imports: [MatDialogModule, TraceEventComponent, NoopAnimationsModule],
      providers: [
        { provide: MatDialog, useValue: jasmine.createSpyObj('MatDialog', ['open']) },
        { provide: TRACE_SERVICE, useValue: traceService },
        { provide: EVENT_SERVICE, useValue: eventService },
        {
          provide: DomSanitizer,
          useValue: { bypassSecurityTrustHtml: () => '' },
        },
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(TraceEventComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
