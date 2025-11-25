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
  criterion?: unknown;
}

export declare interface MetricValueInfo {
  defaultThreshold?: number;
  minThreshold?: number;
  maxThreshold?: number;
  step?: number;
}

export declare interface MetricInfo {
  metricName: string;
  description?: string;
  metricValueInfo?: MetricValueInfo;
}

export declare interface EvalMetricConfig extends EvalMetric {
  description?: string;
  metricValueInfo?: MetricValueInfo;
  criterion?: unknown;
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
}

export declare interface EvalCase {
  evalId: string;
  conversation: Invocation[];
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
