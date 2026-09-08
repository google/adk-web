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

import {ChangeDetectionStrategy, Component, Inject} from '@angular/core';
import { FormBuilder, FormGroup, Validators, FormsModule, ReactiveFormsModule } from '@angular/forms';
import { MAT_DIALOG_DATA, MatDialogRef, MatDialogTitle, MatDialogContent, MatDialogActions } from '@angular/material/dialog';

import {AUDIO_SIMULATOR_VOICES, DEFAULT_AUDIO_MODEL, EvalMetric, MetricsInfo, DEFAULT_EVAL_METRICS, UserSimulatorConfig} from '../../../core/models/Eval';
import { CdkScrollable } from '@angular/cdk/scrolling';
import { MatSlider, MatSliderThumb } from '@angular/material/slider';
import { MatButton } from '@angular/material/button';
import { MatCheckbox } from '@angular/material/checkbox';
import { CommonModule } from '@angular/common';
import { MatTooltip } from '@angular/material/tooltip';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatIconModule } from '@angular/material/icon';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { MatSlideToggleModule } from '@angular/material/slide-toggle';
import { MatButtonToggleModule } from '@angular/material/button-toggle';
import { FormatMetricNamePipe } from '../format-metric-name.pipe';

/**
 * @interface EvalConfigData
 * @description Data injected into the dialog, including the list of available
 * evaluation metrics.
 */
export interface EvalConfigData {
  evalMetrics: EvalMetric[];
  metricsInfo: MetricsInfo[];
}

/** Result emitted when the dialog is confirmed, consumed by runEval. */
export interface RunEvalDialogResult {
  metrics: EvalMetric[];
  useLive: boolean;
  // Present only when the audio user simulator is enabled for a live run.
  userSimulatorConfig?: UserSimulatorConfig;
}

const DEFAULT_VOICE_NAME = 'Kore';
const DEFAULT_LANGUAGE_CODE = 'en-US';

/**
 * Top-level evaluation run mode. `standard` is the default (non-live) run;
 * `live` uses bidirectional streaming inference.
 */
export type EvalRunMode = 'standard'|'live';

const DEFAULT_RUN_MODE: EvalRunMode = 'standard';

export type LiveInputModality = 'audio'|'text';

/** Default modality when live mode is enabled (audio is the common case). */
const DEFAULT_INPUT_MODALITY: LiveInputModality = 'audio';

@Component({
  changeDetection: ChangeDetectionStrategy.Default,
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
        MatCheckbox,
        CommonModule,
        MatTooltip,
        MatFormFieldModule,
        MatInputModule,
        MatSelectModule,
        MatSlideToggleModule,
        MatButtonToggleModule,
        MatIconModule,
        FormatMetricNamePipe,
    ],
})
export class RunEvalConfigDialogComponent {
  // FormGroup to manage the dialog's form controls
  evalForm: FormGroup;

  // Live run + optional audio user simulation controls.
  runForm: FormGroup;

  evalMetrics: EvalMetric[] = [];
  metricsInfo: MetricsInfo[] = [];

  readonly voices = AUDIO_SIMULATOR_VOICES;

  constructor(
      public dialogRef: MatDialogRef<RunEvalConfigDialogComponent>,
      private fb: FormBuilder,
      @Inject(MAT_DIALOG_DATA) public data: EvalConfigData) {
    this.evalMetrics = this.data.evalMetrics || [];
    // This dialog asks the user to select metrics and set a threshold for
    // each, with the slider bounded by the metric's value interval. A metric
    // that needs no threshold has nothing to configure here, and carries no
    // interval to bound a slider by, so it is not offered. Those metrics are
    // always on and are reported without the user selecting them.
    this.metricsInfo = (this.data.metricsInfo || [])
                           .filter(
                               (metric) => metric.requiresThreshold !== false &&
                                   !!metric.metricValueInfo?.interval);

    this.runForm = this.fb.group({
      runMode: [DEFAULT_RUN_MODE],
      inputModality: [DEFAULT_INPUT_MODALITY],
      voiceName: [DEFAULT_VOICE_NAME],
      languageCode: [DEFAULT_LANGUAGE_CODE],
    });

    // Initialize the form
    this.evalForm = this.fb.group({});

    // Dynamically add controls for each metric
    this.metricsInfo.forEach(metric => {
      const existingMetric = this.evalMetrics.find(m => m.metricName === metric.metricName);
      const isSelected = !!existingMetric;
      const threshold = existingMetric ? existingMetric.threshold : this.getDefaultThreshold(metric);

      this.evalForm.addControl(`${metric.metricName}_selected`, this.fb.control(isSelected));
      
      const interval = metric.metricValueInfo.interval;
      const validators = [Validators.required];
      if (interval) {
        validators.push(
            Validators.min(interval.minValue), Validators.max(interval.maxValue));
      }
      this.evalForm.addControl(
          `${metric.metricName}_threshold`, this.fb.control(threshold, validators));
    });

    // Fallback if metricsInfo is empty, add the hardcoded ones to avoid empty UI if backend fails
    if (this.metricsInfo.length === 0) {
      this.addDefaultControls();
    }
  }

  private addDefaultControls() {
    const defaultMetrics = [
      { name: 'tool_trajectory_avg_score', min: 0, max: 1, default: 1 },
      { name: 'response_match_score', min: 0, max: 1, default: 0.7 }
    ];

    defaultMetrics.forEach(m => {
      const existingMetric = this.evalMetrics.find(em => em.metricName === m.name);
      const isSelected = !!existingMetric;
      const threshold = existingMetric ? existingMetric.threshold : m.default;

      this.evalForm.addControl(`${m.name}_selected`, this.fb.control(isSelected));
      this.evalForm.addControl(`${m.name}_threshold`, this.fb.control(threshold, [
        Validators.required,
        Validators.min(m.min),
        Validators.max(m.max)
      ]));
    });
  }

  private getDefaultThreshold(metric: MetricsInfo): number {
    if (metric.metricName === 'tool_trajectory_avg_score') return 1.0;
    if (metric.metricName === 'response_match_score') return 0.7;
    // Default to the top of the metric's range, which for a score metric means
    // "must be perfect". Metrics without a range are not offered by this
    // dialog, so the fallback only guards against a malformed MetricInfo.
    return metric.metricValueInfo.interval?.maxValue ?? 1.0;
  }

  onReset(): void {
    this.metricsInfo.forEach(metric => {
      const defaultMetric = DEFAULT_EVAL_METRICS.find(m => m.metricName === metric.metricName);
      const isSelected = !!defaultMetric;
      const threshold = defaultMetric ? defaultMetric.threshold : this.getDefaultThreshold(metric);

      this.evalForm.get(`${metric.metricName}_selected`)?.setValue(isSelected);
      this.evalForm.get(`${metric.metricName}_threshold`)?.setValue(threshold);
    });

    if (this.metricsInfo.length === 0) {
      DEFAULT_EVAL_METRICS.forEach(m => {
        this.evalForm.get(`${m.metricName}_selected`)?.setValue(true);
        this.evalForm.get(`${m.metricName}_threshold`)?.setValue(m.threshold);
      });
    }
  }

  get isLive(): boolean {
    return this.runForm.get('runMode')?.value === 'live';
  }

  get audioSimulationEnabled(): boolean {
    return this.isLive &&
        this.runForm.get('inputModality')?.value === 'audio';
  }

  private collectMetrics(): EvalMetric[] {
    const resultMetrics: EvalMetric[] = [];
    const names = this.metricsInfo.length > 0 ?
        this.metricsInfo.map((m) => m.metricName) :
        ['tool_trajectory_avg_score', 'response_match_score'];
    names.forEach((name) => {
      if (this.evalForm.get(`${name}_selected`)?.value) {
        const threshold = this.evalForm.get(`${name}_threshold`)?.value;
        resultMetrics.push({metricName: name, threshold});
      }
    });
    return resultMetrics;
  }

  // Builds the `llm_audio` config from the audio form fields (Gemini TTS model
  // + voice/language), or undefined when audio simulation is off.
  private buildUserSimulatorConfig(): UserSimulatorConfig|undefined {
    if (!this.audioSimulationEnabled) {
      return undefined;
    }
    const raw = this.runForm.getRawValue();
    return {
      type: 'llm_audio',
      audio_model: DEFAULT_AUDIO_MODEL,
      audio_model_configuration: {
        response_modalities: ['AUDIO'],
        speech_config: {
          voice_config: {
            prebuilt_voice_config: {
              voice_name: raw.voiceName || DEFAULT_VOICE_NAME,
            },
          },
          language_code: raw.languageCode || DEFAULT_LANGUAGE_CODE,
        },
      },
    };
  }

  onStart(): void {
    if (!this.evalForm.valid) {
      return;
    }
    this.dialogRef.close({
      metrics: this.collectMetrics(),
      useLive: this.isLive,
      userSimulatorConfig: this.buildUserSimulatorConfig(),
    } as RunEvalDialogResult);
  }

  onCancel(): void {
    this.dialogRef.close(null);
  }
}
