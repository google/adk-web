/**
 * @license
 * Copyright 2026 Google LLC
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

import { ExecutableCode, CodeExecutionResult, FunctionCall, FunctionResponse, Event } from './types';
import { MediaType } from './types';

export class UiEvent {
  role!: 'user' | 'bot' | string;
  text?: string;
  thought?: boolean;
  isLoading?: boolean;
  isEditing?: boolean;
  evalStatus?: number;
  // The name of the metric that failed for this event (e.g.
  // 'response_match_score'), or empty when the event passed.
  failedMetric?: string;
  attachments?: { file: File; url: string }[];
  renderedContent?: any;
  a2uiData?: any;
  textParts?: Array<{text: string, thought?: boolean}>;
  executableCode?: ExecutableCode;
  codeExecutionResult?: CodeExecutionResult;
  event!: Event;
  inlineData?: {
    mediaType?: MediaType | string;
    data: string;
    name?: string;
    mimeType: string;
    displayName?: string;
  };
  functionCalls?: FunctionCall[];
  functionResponses?: FunctionResponse[];
  actualInvocationToolUses?: any;
  expectedInvocationToolUses?: any;
  actualFinalResponse?: string;
  expectedFinalResponse?: string;
  evalScore?: number;
  evalThreshold?: number;
  invocationIndex?: number;
  finalResponsePartIndex?: number;
  toolUseIndex?: number;
  error?: {
    errorCode?: string;
    errorMessage?: string;
  };

  constructor(init?: Partial<UiEvent>) {
    Object.assign(this, init);
    
    // clean up empty objects in event.actions
    if (this.event?.actions) {
      for (const [key, value] of Object.entries(this.event.actions)) {
        if (value !== null && typeof value === 'object' && Object.keys(value).length === 0) {
          delete (this.event.actions as any)[key];
        }
      }
    }
  }

  get stateDelta(): any {
    return this.event?.actions?.stateDelta;
  }

  get artifactDelta(): any {
    return this.event?.actions?.artifactDelta;
  }

  get route(): any {
    return this.event?.actions?.route;
  }

  get transferToAgent(): any {
    return this.event?.actions?.transferToAgent;
  }

  get nodePath(): string | null {
    return this.event?.nodeInfo?.path || null;
  }

  get bareNodePath(): string | null {
    const path = this.nodePath;
    if (!path) return null;
    return path.split('/').map(segment => segment.split('@')[0]).join('/');
  }

  get author(): string {
    return this.event?.author ?? 'root_agent';
  }
}
