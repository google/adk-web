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

import {Injectable} from '@angular/core';
import {of, ReplaySubject} from 'rxjs';

import {EvalService} from '../eval.service';

@Injectable()
export class MockEvalService implements Partial<EvalService> {
  getEvalSetsResponse = new ReplaySubject<any[]>(1);
  getEvalSets = jasmine.createSpy('getEvalSets')
                    .and.returnValue(this.getEvalSetsResponse);
  createNewEvalSetResponse = new ReplaySubject<any>(1);
  createNewEvalSet = jasmine.createSpy('createNewEvalSet')
                         .and.returnValue(this.createNewEvalSetResponse);
  listEvalCasesResponse = new ReplaySubject<any[]>(1);
  listEvalCases = jasmine.createSpy('listEvalCases')
                      .and.returnValue(this.listEvalCasesResponse);
  addCurrentSessionResponse = new ReplaySubject<any>(1);
  addCurrentSession = jasmine.createSpy('addCurrentSession')
                          .and.returnValue(this.addCurrentSessionResponse);
  runEvalResponse = new ReplaySubject<any>(1);
  runEval = jasmine.createSpy('runEval').and.returnValue(this.runEvalResponse);
  listEvalResultsResponse = new ReplaySubject<any[]>(1);
  listEvalResults = jasmine.createSpy('listEvalResults')
                        .and.returnValue(this.listEvalResultsResponse);
  getEvalResultResponse = new ReplaySubject<any>(1);
  getEvalResult = jasmine.createSpy('getEvalResult')
                      .and.returnValue(this.getEvalResultResponse);
  getEvalCaseResponse = new ReplaySubject<any>(1);
  getEvalCase = jasmine.createSpy('getEvalCase')
                    .and.returnValue(this.getEvalCaseResponse);
  updateEvalCaseResponse = new ReplaySubject<any>(1);
  updateEvalCase = jasmine.createSpy('updateEvalCase')
                       .and.returnValue(this.updateEvalCaseResponse);
  deleteEvalCaseResponse = new ReplaySubject<any>(1);
  deleteEvalCase = jasmine.createSpy('deleteEvalCase')
                       .and.returnValue(this.deleteEvalCaseResponse);
}
