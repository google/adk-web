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
import {FormBuilder, FormGroup, Validators, FormsModule, ReactiveFormsModule} from '@angular/forms';
import { MAT_DIALOG_DATA, MatDialogRef, MatDialogTitle, MatDialogContent, MatDialogActions } from '@angular/material/dialog';

import {EvalMetricConfig} from '../../../core/models/Eval';
import { CdkScrollable } from '@angular/cdk/scrolling';
import { MatButton } from '@angular/material/button';
import { MatFormField } from '@angular/material/form-field';
import { MatLabel } from '@angular/material/form-field';
import { MatInput } from '@angular/material/input';
import { NgIf, NgFor } from '@angular/common';

/**
 * @interface EvalConfigData
 * @description Data injected into the dialog, including the list of available
 * evaluation metrics.
 */
export interface EvalConfigData {
  metrics: EvalMetricConfig[];
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
        MatDialogActions,
        MatButton,
        MatFormField,
        MatLabel,
        MatInput,
        NgIf,
        NgFor,
    ],
})
export class RunEvalConfigDialogComponent {
  // FormGroup to manage the dialog's form controls
  evalForm: FormGroup;

  metrics: EvalMetricConfig[] = [];
  private controlNameByMetric = new Map<string, string>();

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
    this.metrics = this.data.metrics ?? [];

    this.evalForm = this.fb.group({});
    this.initializeForm();
  }

  protected getControlName(metricName: string): string {
    return this.controlNameByMetric.get(metricName) ?? '';
  }

  protected getMin(metric: EvalMetricConfig): number|undefined {
    return metric.metricValueInfo?.minThreshold;
  }

  protected getMax(metric: EvalMetricConfig): number|undefined {
    return metric.metricValueInfo?.maxThreshold;
  }

  protected getStep(metric: EvalMetricConfig): number|undefined {
    return metric.metricValueInfo?.step;
  }

  private initializeForm() {
    for (const metric of this.metrics) {
      const controlName = this.createControlName(metric.metricName);
      this.controlNameByMetric.set(metric.metricName, controlName);

      const validators = [Validators.required];
      const min = this.getMin(metric);
      if (min !== undefined) {
        validators.push(Validators.min(min));
      }
      const max = this.getMax(metric);
      if (max !== undefined) {
        validators.push(Validators.max(max));
      }

      this.evalForm.addControl(controlName, this.fb.control(
                                         metric.threshold,
                                         validators));
    }
  }

  private createControlName(metricName: string): string {
    const sanitized = metricName.replace(/[^a-zA-Z0-9]/g, '_');
    return `${sanitized}_threshold`;
  }

  onStart(): void {
    if (this.evalForm.valid) {
      this.metrics = this.metrics.map((metric) => {
        const controlName = this.getControlName(metric.metricName);
        const value = this.evalForm.get(controlName)?.value;
        return {
          ...metric,
          threshold: Number(value),
        };
      });

      this.dialogRef.close(this.metrics);

      return;
    }

    this.evalForm.markAllAsTouched();
  }

  protected hasError(metric: EvalMetricConfig): boolean {
    const control = this.evalForm.get(this.getControlName(metric.metricName));
    return !!control && control.invalid && (control.dirty || control.touched);
  }

  protected getErrorMessage(metric: EvalMetricConfig): string {
    const control = this.evalForm.get(this.getControlName(metric.metricName));
    if (!control || !control.errors) {
      return '';
    }
    if (control.errors['min']) {
      const min = this.getMin(metric);
      return `Minimum threshold is ${min}`;
    }
    if (control.errors['max']) {
      const max = this.getMax(metric);
      return `Maximum threshold is ${max}`;
    }
    if (control.errors['required']) {
      return 'Threshold is required';
    }
    return 'Invalid threshold';
  }

  protected formatRangeDescription(metric: EvalMetricConfig): string {
    const min = this.getMin(metric);
    const max = this.getMax(metric);
    if (min === undefined && max === undefined) {
      return '';
    }
    if (min !== undefined && max !== undefined) {
      return `Range ${min} – ${max}`;
    }
    if (min !== undefined) {
      return `≥ ${min}`;
    }
    if (max !== undefined) {
      return `≤ ${max}`;
    }
    return '';
  }

  protected formatStepDescription(metric: EvalMetricConfig): string {
    const step = this.getStep(metric);
    if (step === undefined) {
      return '';
    }
    return `Step ${step}`;
  }

  onCancel(): void {
    this.dialogRef.close(null);
    }
}
