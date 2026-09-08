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
import {MatSliderModule} from '@angular/material/slider';
import {NoopAnimationsModule} from '@angular/platform-browser/animations';

import {RunEvalConfigDialogComponent} from './run-eval-config-dialog.component';

const METRICS_INFO = [
  {
    metricName: 'tool_trajectory_avg_score',
    description: 'Tool trajectory score',
    metricValueInfo: {
      interval: {minValue: 0, maxValue: 1, openAtMin: false, openAtMax: false},
    },
  },
  {
    metricName: 'response_match_score',
    description: 'Response match score',
    metricValueInfo: {
      interval: {minValue: 0, maxValue: 1, openAtMin: false, openAtMax: false},
    },
  },
];

async function createComponent(data: any):
    Promise<{
      fixture: ComponentFixture<RunEvalConfigDialogComponent>,
      component: RunEvalConfigDialogComponent,
      dialogRef: jasmine.SpyObj<MatDialogRef<RunEvalConfigDialogComponent>>,
    }> {
  const mockDialogRef = jasmine.createSpyObj('MatDialogRef', ['close']);
  await TestBed.configureTestingModule({
    imports: [
      ReactiveFormsModule,
      MatDialogModule,
      MatSliderModule,
      NoopAnimationsModule,
      RunEvalConfigDialogComponent,
    ],
    providers: [
      {provide: MatDialogRef, useValue: mockDialogRef},
      {provide: MAT_DIALOG_DATA, useValue: data},
    ],
  }).compileComponents();

  const fixture = TestBed.createComponent(RunEvalConfigDialogComponent);
  const component = fixture.componentInstance;
  const dialogRef = TestBed.inject(MatDialogRef) as jasmine.SpyObj<
      MatDialogRef<RunEvalConfigDialogComponent>>;
  fixture.detectChanges();
  return {fixture, component, dialogRef};
}

describe('RunEvalConfigDialogComponent', () => {
  describe('with metricsInfo', () => {
    let component: RunEvalConfigDialogComponent;
    let fixture: ComponentFixture<RunEvalConfigDialogComponent>;
    let dialogRef: jasmine.SpyObj<MatDialogRef<RunEvalConfigDialogComponent>>;

    beforeEach(async () => {
      ({fixture, component, dialogRef} = await createComponent({
         evalMetrics: [
           {metricName: 'tool_trajectory_avg_score', threshold: 1},
           {metricName: 'response_match_score', threshold: 0.7},
         ],
         metricsInfo: METRICS_INFO,
       }));
    });

    it('creates per-metric controls from metricsInfo', () => {
      expect(component.evalForm.get('tool_trajectory_avg_score_selected'))
          .toBeTruthy();
      expect(component.evalForm.get('tool_trajectory_avg_score_threshold')?.value)
          .toBe(1);
      expect(component.evalForm.get('response_match_score_threshold')?.value)
          .toBe(0.7);
    });

    it('closes with null on cancel', () => {
      component.onCancel();
      expect(dialogRef.close).toHaveBeenCalledWith(null);
    });

    it('emits selected metrics with useLive false and no simulator config',
       () => {
         component.evalForm.get('tool_trajectory_avg_score_selected')
             ?.setValue(true);
         component.evalForm.get('tool_trajectory_avg_score_threshold')
             ?.setValue(0.9);
         component.evalForm.get('response_match_score_selected')?.setValue(false);

         component.onStart();

         const arg = dialogRef.close.calls.mostRecent().args[0] as any;
         expect(arg.useLive).toBeFalse();
         expect(arg.userSimulatorConfig).toBeUndefined();
         expect(arg.metrics).toEqual([
           {metricName: 'tool_trajectory_avg_score', threshold: 0.9},
         ]);
       });

    it('emits useLive true without a simulator config for the text modality',
       () => {
         component.runForm.get('runMode')?.setValue('live');
         component.runForm.get('inputModality')?.setValue('text');

         component.onStart();

         const arg = dialogRef.close.calls.mostRecent().args[0] as any;
         expect(arg.useLive).toBeTrue();
         expect(arg.userSimulatorConfig).toBeUndefined();
       });

    it('emits an llm_audio user simulator config for the audio modality', () => {
      component.runForm.get('runMode')?.setValue('live');
      component.runForm.get('inputModality')?.setValue('audio');
      component.runForm.get('voiceName')?.setValue('Puck');
      component.runForm.get('languageCode')?.setValue('en-GB');

      component.onStart();

      const arg = dialogRef.close.calls.mostRecent().args[0] as any;
      expect(arg.useLive).toBeTrue();
      expect(arg.userSimulatorConfig).toEqual({
        type: 'llm_audio',
        audio_model: 'gemini-3.1-flash-tts-preview',
        audio_model_configuration: {
          response_modalities: ['AUDIO'],
          speech_config: {
            voice_config: {
              prebuilt_voice_config: {voice_name: 'Puck'},
            },
            language_code: 'en-GB',
          },
        },
      });
    });

    it('enables audio simulation only for live runs with the audio modality',
       () => {
         // Live on, but text modality selected.
         component.runForm.get('runMode')?.setValue('live');
         component.runForm.get('inputModality')?.setValue('text');
         expect(component.audioSimulationEnabled).toBeFalse();

         // Audio modality but standard (non-live) mode.
         component.runForm.get('runMode')?.setValue('standard');
         component.runForm.get('inputModality')?.setValue('audio');
         expect(component.audioSimulationEnabled).toBeFalse();

         // Live on + audio modality.
         component.runForm.get('runMode')?.setValue('live');
         expect(component.audioSimulationEnabled).toBeTrue();
       });
  });

  describe('with metrics that need no threshold', () => {
    // An informational metric reports a value and never passes or fails, so
    // the backend sends it with requiresThreshold false and no value interval.
    const INFORMATIONAL_METRIC = {
      metricName: 'token_usage_v1',
      description: 'Tokens consumed',
      metricValueInfo: {},
      requiresThreshold: false,
    };

    it('does not offer them for selection', async () => {
      const {component} = await createComponent({
        evalMetrics: [],
        metricsInfo: [...METRICS_INFO, INFORMATIONAL_METRIC],
      });

      expect(component.metricsInfo.map((m) => m.metricName)).toEqual([
        'tool_trajectory_avg_score',
        'response_match_score',
      ]);
      expect(component.evalForm.get('token_usage_v1_selected')).toBeNull();
      expect(component.evalForm.get('token_usage_v1_threshold')).toBeNull();
    });

    it('never emits them, so the backend is not sent a threshold it rejects',
       async () => {
         const {component, dialogRef} = await createComponent({
           evalMetrics: [],
           metricsInfo: [...METRICS_INFO, INFORMATIONAL_METRIC],
         });
         component.evalForm.get('tool_trajectory_avg_score_selected')
             ?.setValue(true);

         component.onStart();

         const arg = dialogRef.close.calls.mostRecent().args[0] as any;
         expect(arg.metrics.map((m: any) => m.metricName)).toEqual([
           'tool_trajectory_avg_score',
         ]);
       });

    it('renders the form rather than failing on the missing interval',
       async () => {
         // Regression test: the threshold slider used to read
         // `metricValueInfo.interval.minValue` unconditionally, so a metric
         // without an interval took the whole dialog down.
         const {fixture} = await createComponent({
           evalMetrics: [],
           metricsInfo: [INFORMATIONAL_METRIC],
         });

         expect(() => fixture.detectChanges()).not.toThrow();
       });
  });

  describe('without metricsInfo (fallback)', () => {
    let component: RunEvalConfigDialogComponent;
    let dialogRef: jasmine.SpyObj<MatDialogRef<RunEvalConfigDialogComponent>>;

    beforeEach(async () => {
      ({component, dialogRef} = await createComponent({
         evalMetrics: [
           {metricName: 'tool_trajectory_avg_score', threshold: 1},
           {metricName: 'response_match_score', threshold: 0.7},
         ],
         metricsInfo: [],
       }));
    });

    it('adds hardcoded fallback metric controls', () => {
      expect(component.evalForm.get('tool_trajectory_avg_score_threshold')?.value)
          .toBe(1);
      expect(component.evalForm.get('response_match_score_threshold')?.value)
          .toBe(0.7);
    });

    it('emits fallback metrics that are selected', () => {
      component.evalForm.get('tool_trajectory_avg_score_selected')
          ?.setValue(true);
      component.evalForm.get('response_match_score_selected')?.setValue(true);

      component.onStart();

      const arg = dialogRef.close.calls.mostRecent().args[0] as any;
      expect(arg.metrics.map((m: any) => m.metricName)).toEqual([
        'tool_trajectory_avg_score',
        'response_match_score',
      ]);
    });
  });
});
