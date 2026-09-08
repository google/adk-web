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

/**
 * @interface EvalMetric
 * @description Represents a single evaluation metric and its associated
 * threshold.
 */
export declare interface EvalMetric {
  metricName: string;
  threshold: number;
}

export const DEFAULT_EVAL_METRICS: EvalMetric[] = [
  {
    metricName: 'tool_trajectory_avg_score',
    threshold: 1,
  },
  {
    metricName: 'response_match_score',
    threshold: 0.7,
  }
];

export declare interface MetricValueInfo {
  // Absent for metrics whose value is unbounded, such as the informational
  // efficiency metrics (token and call counts).
  interval?: {
    minValue: number;
    openAtMin: boolean;
    maxValue: number;
    openAtMax: boolean;
  };
}

export declare interface MetricsInfo {
  metricName: string;
  description: string;
  metricValueInfo: MetricValueInfo;
  // False for metrics that report a value without passing or failing. Such a
  // metric has no threshold to configure and no interval to bound one by.
  requiresThreshold?: boolean;
}

export declare interface Invocation {
  invocationId: string;
  userContent: Content;
  finalResponse?: Content;
  intermediateData?: IntermediateData;
  creationTimestamp: number;
}

export declare interface Content {
  parts?: any[];
  role?: string|null;
}

export declare interface IntermediateData {
  toolUses: any[];
  intermediateResponses: any[];
  invocationEvents?: any[];
}

export declare interface EvalCase {
  evalId: string;
  conversation?: Invocation[];
  events?: any[];
  sessionInput: any;
  creationTimestamp: number;
}

export declare interface EvalSet {
  evalSetId: string;
  name?: string;
  description?: string;
  evalCases: EvalCase[];
  creationTimestamp: number;
}

/** Eval verdict values returned by the backend (`evalStatus`/`finalEvalStatus`). */
export enum EvalStatus {
  PASSED = 1,
  FAILED = 2,
  NOT_EVALUATED = 3,
  // The metric reported a value but reached no verdict, so it is neither a
  // pass nor a failure. Distinct from NOT_EVALUATED, which means the metric
  // produced nothing at all.
  INFORMATIONAL = 4,
}

export declare interface EvaluationResult {
  setId: string;
  evalId: string;
  finalEvalStatus: number;
  evalMetricResults: any[];
  overallEvalMetricResults: any[];
  evalMetricResultPerInvocation?: any[];
  sessionId: string;
  sessionDetails: any;
  // The user id the eval ran under. Needed to fetch the run's session.
  userId?: string;
}

// Audio user-simulator config, mirroring the adk-python `UserSimulatorConfig`
// union. Only the `llm_audio` subset (the field the UI sends) is modelled;
// text-generation fields are defaulted by the backend.

/** Voice/language selection for a synthesized user turn. */
export declare interface SpeechConfig {
  voice_config: {
    prebuilt_voice_config: {
      voice_name: string;
    };
  };
  language_code?: string;
}

/** Sent as `user_simulator_config` to synthesize the simulated user's turns. */
export declare interface LlmAudioUserSimulatorConfig {
  type: 'llm_audio';
  // A Gemini TTS model name, or 'cloud_tts' for Google Cloud Text-to-Speech.
  audio_model?: string;
  audio_model_configuration?: {
    response_modalities?: string[];
    speech_config: SpeechConfig;
  };
}

export type UserSimulatorConfig = LlmAudioUserSimulatorConfig;

/** The Gemini TTS model the audio user simulator uses by default. */
export const DEFAULT_AUDIO_MODEL = 'gemini-3.1-flash-tts-preview';

/** Prebuilt Gemini TTS voice names offered by the run dialog. */
export const AUDIO_SIMULATOR_VOICES: string[] = [
  'Kore',
  'Puck',
  'Charon',
  'Aoede',
  'Fenrir',
];
