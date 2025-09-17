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

import {Component, Inject} from '@angular/core';
import { FormBuilder, FormGroup, Validators, FormsModule, ReactiveFormsModule } from '@angular/forms';
import { MAT_DIALOG_DATA, MatDialogRef, MatDialogTitle, MatDialogContent, MatDialogActions } from '@angular/material/dialog';

import {EvalMetric} from '../../../core/models/Eval';
import { CdkScrollable } from '@angular/cdk/scrolling';
import { MatSlider, MatSliderThumb } from '@angular/material/slider';
import { MatButton } from '@angular/material/button';

/**
 * @interface EvalConfigData
 * @description Data injected into the dialog, including the list of available
 * evaluation metrics.
 */
export interface EvalConfigData {
  evalMetrics: EvalMetric[];
}

@Component({
    selector: 'app-run-eval-config-dialog',
    templateUrl: './run-eval-config-dialog.component.html',
    styleUrls: ['./run-eval-config-dialog.component.scss'],
    imports: [
        MatDialogTitle,
        CdkScrollable,
        MatDialogContent,
        FormsModule,
        ReactiveFormsModule,
        MatSlider,
        MatSliderThumb,
        MatDialogActions,
        MatButton,
    ],
})
export class RunEvalConfigDialogComponent {
  // FormGroup to manage the dialog's form controls
  evalForm: FormGroup;

  evalMetrics: EvalMetric[] = [];

  /**
   * @constructor
   * @param {MatDialogRef<RunEvalConfigDialogComponent>} dialogRef - Reference
   *     to the dialog opened.
   * @param {FormBuilder} fb - Angular's FormBuilder for creating reactive
   *     forms.
   * @param {EvalConfigData} data - Data injected into the dialog (e.g., initial
   *     values).
   */
  constructor(
      public dialogRef: MatDialogRef<RunEvalConfigDialogComponent>,
      private fb: FormBuilder,
      @Inject(MAT_DIALOG_DATA) public data: EvalConfigData) {
    this.evalMetrics = this.data.evalMetrics;

    // Initialize the form with controls and validators
    this.evalForm = this.fb.group({
      tool_trajectory_avg_score_threshold: [
        this.getEvalMetricThresholdFromData('tool_trajectory_avg_score'),
        [Validators.required, Validators.min(0), Validators.max(1)]
      ],
      response_match_score_threshold: [
        this.getEvalMetricThresholdFromData('response_match_score'),
        [Validators.required, Validators.min(0), Validators.max(1)]
      ]
    });
  }

  private getEvalMetricThresholdFromData(metricName: string): number {
    return this.evalMetrics.find((metric) => metric.metricName === metricName)
               ?.threshold ??
        0;
  }

  onStart(): void {
    if (this.evalForm.valid) {
      const {
        tool_trajectory_avg_score_threshold,
        response_match_score_threshold
      } = this.evalForm.value;

      for (const metric of this.evalMetrics) {
        if (metric.metricName === 'tool_trajectory_avg_score') {
          metric.threshold = tool_trajectory_avg_score_threshold;
        } else if (metric.metricName === 'response_match_score') {
          metric.threshold = response_match_score_threshold;
        }
      }

      this.dialogRef.close(this.evalMetrics);
    }
  }

  onCancel(): void {
    this.dialogRef.close(
        null);  // Return null or undefined to indicate cancellation
  }
}
