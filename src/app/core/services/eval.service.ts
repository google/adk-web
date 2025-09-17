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

import {HttpClient} from '@angular/common/http';
import {Injectable, InjectionToken} from '@angular/core';
import {Observable} from 'rxjs';

import {URLUtil} from '../../../utils/url-util';
import {EvalCase} from '../models/Eval';

export const EVAL_SERVICE = new InjectionToken<EvalService>('EvalService');

@Injectable({
  providedIn: 'root',
})
export class EvalService {
  apiServerDomain = URLUtil.getApiServerBaseUrl();
  constructor(private http: HttpClient) {}

  getEvalSets(appName: string) {
    if (this.apiServerDomain != undefined) {
      const url = this.apiServerDomain + `/apps/${appName}/eval_sets`;
      return this.http.get<any>(url);
    }
    return new Observable<any>();
  }

  createNewEvalSet(appName: string, evalSetId: string) {
    if (this.apiServerDomain != undefined) {
      const url =
      this.apiServerDomain + `/apps/${appName}/eval_sets/${evalSetId}`;
    return this.http.post<any>(url, {});
    }
    return new Observable<any>();
  }

  listEvalCases(appName: string, evalSetId: string) {
    if (this.apiServerDomain != undefined) {
      const url =
      this.apiServerDomain + `/apps/${appName}/eval_sets/${evalSetId}/evals`;
      return this.http.get<any>(url, {});
    }
    return new Observable<any>();
  }

  addCurrentSession(
      appName: string,
      evalSetId: string,
      evalId: string,
      sessionId: string,
      userId: string,
  ) {
    const url =
      this.apiServerDomain +
      `/apps/${appName}/eval_sets/${evalSetId}/add_session`;
    return this.http.post<any>(url, {
      evalId: evalId,
      sessionId: sessionId,
      userId: userId,
    });
  }

  runEval(
    appName: string,
    evalSetId: string,
    evalIds: string[],
    evalMetrics: any[],
  ) {
    const url =
      this.apiServerDomain + `/apps/${appName}/eval_sets/${evalSetId}/run_eval`;
    return this.http.post<any>(url, {
      evalIds: evalIds,
      evalMetrics: evalMetrics,
    });
  }

  listEvalResults(appName: string) {
    if (this.apiServerDomain != undefined) {
      const url = this.apiServerDomain + `/apps/${appName}/eval_results`;

      return this.http.get<any>(url, {});
    }
    return new Observable<any>();
  }

  getEvalResult(appName: string, evalResultId: string) {
    if (this.apiServerDomain != undefined) {
      const url =
        this.apiServerDomain + `/apps/${appName}/eval_results/${evalResultId}`;
      return this.http.get<any>(url, {});
    }
    return new Observable<any>();
  }

  getEvalCase(appName: string, evalSetId: string, evalCaseId: string) {
    if (this.apiServerDomain != undefined) {
      const url =
        this.apiServerDomain +
        `/apps/${appName}/eval_sets/${evalSetId}/evals/${evalCaseId}`;
      return this.http.get<any>(url, {});
    }
    return new Observable<any>();
  }

  updateEvalCase(
      appName: string, evalSetId: string, evalCaseId: string,
      updatedEvalCase: EvalCase) {
    const url = this.apiServerDomain +
        `/apps/${appName}/eval_sets/${evalSetId}/evals/${evalCaseId}`;
    return this.http.put<any>(url, {
      evalId: evalCaseId,
      conversation: updatedEvalCase.conversation,
      sessionInput: updatedEvalCase.sessionInput,
      creationTimestamp: updatedEvalCase.creationTimestamp,
    });
  }

  deleteEvalCase(appName: string, evalSetId: string, evalCaseId: string) {
    const url = this.apiServerDomain +
        `/apps/${appName}/eval_sets/${evalSetId}/evals/${evalCaseId}`;
    return this.http.delete<any>(url, {});
  }
}
