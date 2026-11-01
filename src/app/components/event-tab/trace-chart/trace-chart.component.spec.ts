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

import {ComponentFixture, TestBed} from '@angular/core/testing';
import {
  MAT_DIALOG_DATA,
  MatDialogModule,
  MatDialogRef,
} from '@angular/material/dialog';


import {TraceChartComponent} from './trace-chart.component';

describe('TraceChartComponent', () => {
  let component: TraceChartComponent;
  let fixture: ComponentFixture<TraceChartComponent>;
  const mockDialogRef = {
    close: jasmine.createSpy('close'),
  };

  beforeEach(async () => {
    await TestBed.configureTestingModule({
    imports: [MatDialogModule, TraceChartComponent],
    providers: [
        { provide: MatDialogRef, useValue: mockDialogRef },
        {
            provide: MAT_DIALOG_DATA,
            useValue: {
                spans: [],
            },
        },
    ],
}).compileComponents();

    fixture = TestBed.createComponent(TraceChartComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  describe('getSpanIcon', () => {
    it('should use the tool icon for OTel GenAI tool spans', () => {
      expect(component.getSpanIcon('execute_tool get_weather')).toBe('build');
    });

    it('should use the agent icon for OTel GenAI agent spans', () => {
      expect(component.getSpanIcon('invoke_agent root_agent'))
          .toBe('directions_run');
    });

    it('should fall back to the start icon for unknown spans', () => {
      expect(component.getSpanIcon('something_else')).toBe('start');
    });
  });

  describe('formatSpanName', () => {
    it('should strip the OTel GenAI operation prefixes', () => {
      expect(component.formatSpanName('invoke_agent root_agent'))
          .toBe('root_agent');
      expect(component.formatSpanName('execute_tool get_weather'))
          .toBe('get_weather');
      expect(component.formatSpanName('invoke_node my_node')).toBe('my_node');
    });

    it('should leave other span names unchanged', () => {
      expect(component.formatSpanName('call_llm')).toBe('call_llm');
    });
  });
});
