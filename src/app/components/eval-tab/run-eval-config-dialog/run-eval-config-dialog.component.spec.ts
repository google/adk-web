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
import {ReactiveFormsModule} from '@angular/forms';
import {
  MAT_DIALOG_DATA,
  MatDialogModule,
  MatDialogRef,
} from '@angular/material/dialog';
import {NoopAnimationsModule} from '@angular/platform-browser/animations';


import {RunEvalConfigDialogComponent} from './run-eval-config-dialog.component';

describe('RunEvalConfigDialogComponent', () => {
  let component: RunEvalConfigDialogComponent;
  let fixture: ComponentFixture<RunEvalConfigDialogComponent>;
  let dialogRefSpy: jasmine.SpyObj<MatDialogRef<RunEvalConfigDialogComponent>>;

  // Mock MatDialogRef
  const mockDialogRef = jasmine.createSpyObj('MatDialogRef', ['close']);

  beforeEach(async () => {
    await TestBed.configureTestingModule({
    imports: [
        ReactiveFormsModule,
        MatDialogModule,
        NoopAnimationsModule,
        RunEvalConfigDialogComponent,
    ],
    providers: [
        { provide: MatDialogRef, useValue: mockDialogRef },
        {
            provide: MAT_DIALOG_DATA,
            useValue: {
                metrics: [
                    {
                        metricName: 'tool_trajectory_avg_score',
                        threshold: 1,
                        metricValueInfo: {
                          minThreshold: 0,
                          maxThreshold: 1,
                          step: 0.1,
                        },
                    },
                    {
                        metricName: 'response_match_score',
                        threshold: 0.7,
                        metricValueInfo: {
                          minThreshold: 0,
                          maxThreshold: 1,
                          step: 0.1,
                        },
                    },
                ],
            },
        },
        // Provide empty data for initial setup
    ],
}).compileComponents();
  });

  beforeEach(() => {
    fixture = TestBed.createComponent(RunEvalConfigDialogComponent);
    component = fixture.componentInstance;
    dialogRefSpy = TestBed.inject(MatDialogRef) as jasmine.SpyObj<
      MatDialogRef<RunEvalConfigDialogComponent>
    >;
    fixture.detectChanges(); // Initialize the component and trigger change
    // detection
  });

  it('should initialize form with default values', () => {
    expect(
      component.evalForm.get('tool_trajectory_avg_score_threshold')?.value
    ).toBe(1);
    expect(
      component.evalForm.get('response_match_score_threshold')?.value
    ).toBe(0.7);
  });

  it('should close dialog with null on cancel', () => {
    component.onCancel();
    expect(dialogRefSpy.close).toHaveBeenCalledWith(null);
  });

  it('should close dialog with updated thresholds on start', () => {
    const toolControl =
      component.evalForm.get('tool_trajectory_avg_score_threshold')!;
    const responseControl =
      component.evalForm.get('response_match_score_threshold')!;

    toolControl.setValue(0.4);
    responseControl.setValue(0.5);

    component.onStart();

    expect(dialogRefSpy.close).toHaveBeenCalledWith([
      jasmine.objectContaining({
        metricName: 'tool_trajectory_avg_score',
        threshold: 0.4,
      }),
      jasmine.objectContaining({
        metricName: 'response_match_score',
        threshold: 0.5,
      }),
    ]);
  });
});
