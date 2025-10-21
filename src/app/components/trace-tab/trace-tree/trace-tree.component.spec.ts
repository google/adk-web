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
import { TraceTreeComponent } from './trace-tree.component';
import { TRACE_SERVICE, TraceService } from '../../../core/services/interfaces/trace';
import { of } from 'rxjs';

describe('TraceTreeComponent', () => {
  let component: TraceTreeComponent;
  let fixture: ComponentFixture<TraceTreeComponent>;

  beforeEach(async () => {
    const traceService = {
      ...jasmine.createSpyObj<TraceService>([
        'selectedRow',
        'setHoveredMessages',
      ]),
      selectedTraceRow$: of(undefined),
      eventData$: of(new Map<string, any>()),
    };

    await TestBed.configureTestingModule({
      imports: [TraceTreeComponent],
      providers: [{ provide: TRACE_SERVICE, useValue: traceService }],
    }).compileComponents();

    fixture = TestBed.createComponent(TraceTreeComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
