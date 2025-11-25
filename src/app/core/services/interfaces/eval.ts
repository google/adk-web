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
import {Observable} from 'rxjs';
import {EvalCase} from '../../models/Eval';

export const EVAL_SERVICE = new InjectionToken<EvalService>('EvalService');

/**
 * Service to provide methods to handle evals.
 */
export declare abstract class EvalService {
  abstract getEvalSets(appName: string): Observable<any>;
  abstract createNewEvalSet(appName: string, evalSetId: string): Observable<any>;
  abstract listEvalCases(appName: string, evalSetId: string): Observable<any>;
  abstract addCurrentSession(
    appName: string,
    evalSetId: string,
    evalId: string,
    sessionId: string,
    userId: string,
  ): Observable<any>;
  abstract runEval(
    appName: string,
    evalSetId: string,
    evalIds: string[],
    evalMetrics: any[],
  ): Observable<any>;
  abstract listEvalResults(appName: string): Observable<any>;
  abstract getEvalResult(appName: string, evalResultId: string): Observable<any>;
  abstract getEvalCase(
    appName: string,
    evalSetId: string,
    evalCaseId: string,
  ): Observable<any>;
  abstract updateEvalCase(
    appName: string,
    evalSetId: string,
    evalCaseId: string,
    updatedEvalCase: EvalCase,
  ): Observable<any>;
  abstract deleteEvalCase(
    appName: string,
    evalSetId: string,
    evalCaseId: string,
  ): Observable<any>;
}
