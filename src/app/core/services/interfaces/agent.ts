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

import {InjectionToken} from '@angular/core';
import {BehaviorSubject, Observable, of} from 'rxjs';
import {AgentRunRequest} from '../../models/AgentRunRequest';
import {LlmResponse} from '../../models/types';

export const AGENT_SERVICE = new InjectionToken<AgentService>('AgentService');

/**
 * Service to provide methods to handle agent.
 */
export abstract class AgentService {
  abstract getApp(): Observable<string>;
  abstract setApp(name: string): void;
  abstract getLoadingState(): BehaviorSubject<boolean>;
  abstract runSse(req: AgentRunRequest): Observable<LlmResponse>;
  abstract listApps(): Observable<string[]>;
  getAgentBuilderTmp(agentName: string): Observable<string> {
    console.warn('unimplemented');
    return of('');
  }
  getAgentBuilder(agentName: string): Observable<string> {
    console.warn('unimplemented');
    return of('');
  }
  getSubAgentBuilder(appName: string, relativePath: string): Observable<string> {
    console.warn('unimplemented');
    return of('');
  }
  agentChangeCancel(appName: string): any {
    console.warn('unimplemented');
    return undefined;
  }
  agentBuildTmp(req: any): Observable<boolean> {
    console.warn('unimplemented');
    return of(false);
  }
  agentBuild(req: any): Observable<boolean> {
    console.warn('unimplemented');
    return of(false);
  }
}
