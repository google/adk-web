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

// ADK Event types, see:
// https://github.com/google/adk-python/blob/632bf8b0bcf18ff4e4505e4e5f4c626510f366a2/src/google/adk/events/event.py#L30
// TODO: Replace with genai TS types when they're available.
export declare interface Blob {
  mimeType?: string;
  data: string;
}

export declare interface FunctionCall {
  id?: string;
  name: string;
  args: {[key: string]: any};
  needsResponse?: boolean;
}

export declare interface FunctionResponse {
  id?: string;
  name: string;
  response: {[key: string]: any};
}

export declare interface FileData {
  mimeType: string;
  fileUri: string;
}

export declare interface ExecutableCode {
  language: 'UNKNOWN'|'PYTHON';
  code: string;
}

export declare interface CodeExecutionResult {
  outcome: 'UNKNOWN'|'OK'|'FAILED'|'DEADLINE_EXCEEDED';
  output: string;
}

export declare interface Part {
  text?: string;
  inlineData?: Blob;
  functionCall?: FunctionCall;
  functionResponse?: FunctionResponse;
  thought?: boolean;
  fileData?: FileData;
  executableCode?: ExecutableCode;
  codeExecutionResult?: CodeExecutionResult;
}

export declare interface GenAiContent {
  role: string;
  parts: Part[];
}

export declare interface LlmRequest {
  contents: GenAiContent[];
}

export declare interface LlmResponse {
  content: GenAiContent;
  error?: string;
  errorMessage?: string;
  errorCode?: string;
  longRunningToolIds?: string[];
}

export enum NodeStatus {
  INACTIVE = 0,
  PENDING = 1,
  RUNNING = 2,
  COMPLETED = 3,
  INTERRUPTED = 4,
  FAILED = 5
}

export declare interface NodeState {
  status: NodeStatus;
  input?: any;
  triggered_by?: string;
  retry_count?: number;
  interrupts?: string[];
  resume_inputs?: {[key: string]: any};
  run_id?: string;
  parent_run_id?: string;
  source_node_name?: string;
}

export declare interface AgentState {
  nodes?: {[key: string]: NodeState};
}

export declare interface EventActions {
  message?: string;
  artifactDelta?: any;
  stateDelta?: any;
  functionCall?: FunctionCall;
  functionResponse?: FunctionResponse;
  finishReason?: string;
  agentState?: AgentState;
  endOfAgent?: boolean;
  route?: any;
  transferToAgent?: any;
}

export declare interface Event extends LlmResponse {
  id: string;
  author?: string
  invocationId?: string;
  actions?: EventActions;
  longRunningToolIds?: string[];
  branch?: string;
  timestamp?: number;
  nodeInfo?: { path?: string;[key: string]: any; };
  data?: any;
  output?: { result?: any; };
  inputTranscription?: { text: string; finished?: boolean; };
  outputTranscription?: { text: string; finished?: boolean; };
  usageMetadata?: any;
  interrupted?: boolean;
  turnComplete?: boolean;
  partial?: boolean;
}

export interface ComputerUsePayload {
  image?: {data: string; mimetype?: string;};
  url?: string;
}