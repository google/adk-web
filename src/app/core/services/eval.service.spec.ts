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

import {HttpClientTestingModule, HttpTestingController,} from '@angular/common/http/testing';
import {TestBed} from '@angular/core/testing';
// 1p-ONLY-IMPORTS: import {beforeEach, describe, expect, it,}
import {firstValueFrom} from 'rxjs';

import {URLUtil} from '../../../utils/url-util';
import {initTestBed} from '../../testing/utils';
import {EvalCase} from '../models/Eval';

import {EvalService} from './eval.service';

const API_SERVER_BASE_URL = 'http://test.com';
const APP_NAME = 'app1';
const EVAL_SET_ID = 'set1';
const EVAL_CASE_ID = 'case1';
const EVAL_ID = 'eval1';
const EVAL_RESULT_ID = 'result1';
const USER_ID = 'user1';
const SESSION_ID = 'session1';
const EVAL_SETS_PATH = `/apps/${APP_NAME}/eval_sets`;
const EVAL_SET_PATH = `${EVAL_SETS_PATH}/${EVAL_SET_ID}`;
const EVAL_CASES_PATH = `${EVAL_SET_PATH}/evals`;
const EVAL_CASE_PATH = `${EVAL_CASES_PATH}/${EVAL_CASE_ID}`;
const EVAL_RESULTS_PATH = `/apps/${APP_NAME}/eval_results`;
const EVAL_RESULT_PATH = `${EVAL_RESULTS_PATH}/${EVAL_RESULT_ID}`;
const ADD_SESSION_PATH = `${EVAL_SET_PATH}/add_session`;
const RUN_EVAL_PATH = `${EVAL_SET_PATH}/run_eval`;

describe('EvalService', () => {
  let service: EvalService;
  let httpTestingController: HttpTestingController;

  beforeEach(() => {
    spyOn(URLUtil, 'getApiServerBaseUrl').and.returnValue(API_SERVER_BASE_URL);
    initTestBed();  // required for 1p compat
    TestBed.configureTestingModule({
      imports: [HttpClientTestingModule],
      providers: [EvalService],
    });
    service = TestBed.inject(EvalService);
    httpTestingController = TestBed.inject(HttpTestingController);
  });

  afterEach(() => {
    if (service.apiServerDomain) {
      httpTestingController.verify();
    }
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });

  describe('getEvalSets', () => {
    it('should call GET /apps/{appName}/eval_sets', () => {
      service.getEvalSets(APP_NAME).subscribe();
      const req = httpTestingController.expectOne(
          API_SERVER_BASE_URL + EVAL_SETS_PATH,
      );
      expect(req.request.method).toEqual('GET');
      req.flush({});
    });

    it('should return empty observable if no api domain', async () => {
      service.apiServerDomain = '';
      const resultP = firstValueFrom(service.getEvalSets(APP_NAME));
      const req = httpTestingController.expectOne(EVAL_SETS_PATH);
      req.flush(null);
      const result = await resultP;
      expect(result).toBeNull();
    });
  });

  describe('createNewEvalSet', () => {
    it('should call POST /apps/{appName}/eval_sets/{evalSetId}', () => {
      service.createNewEvalSet(APP_NAME, EVAL_SET_ID).subscribe();
      const req = httpTestingController.expectOne(
          API_SERVER_BASE_URL + EVAL_SET_PATH,
      );
      expect(req.request.method).toEqual('POST');
      req.flush({});
    });

    it('should return empty observable if no api domain', async () => {
      service.apiServerDomain = '';
      const resultP = firstValueFrom(
          service.createNewEvalSet(APP_NAME, EVAL_SET_ID),
      );
      const req = httpTestingController.expectOne(EVAL_SET_PATH);
      req.flush(null);
      const result = await resultP;
      expect(result).toBeNull();
    });
  });

  describe('listEvalCases', () => {
    it('should call GET /apps/{appName}/eval_sets/{evalSetId}/evals', () => {
      service.listEvalCases(APP_NAME, EVAL_SET_ID).subscribe();
      const req = httpTestingController.expectOne(
          API_SERVER_BASE_URL + EVAL_CASES_PATH,
      );
      expect(req.request.method).toEqual('GET');
      req.flush({});
    });

    it('should return empty observable if no api domain', async () => {
      service.apiServerDomain = '';
      const resultP =
          firstValueFrom(service.listEvalCases(APP_NAME, EVAL_SET_ID));
      const req = httpTestingController.expectOne(EVAL_CASES_PATH);
      req.flush(null);
      const result = await resultP;
      expect(result).toBeNull();
    });
  });

  describe('addCurrentSession', () => {
    it('should call POST /apps/{appName}/eval_sets/{evalSetId}/add_session with correct body',
       () => {
         service
             .addCurrentSession(
                 APP_NAME, EVAL_SET_ID, EVAL_ID, SESSION_ID, USER_ID)
             .subscribe();
         const req = httpTestingController.expectOne(
             API_SERVER_BASE_URL + ADD_SESSION_PATH,
         );
         expect(req.request.method).toEqual('POST');
         expect(req.request.body).toEqual({
           evalId: EVAL_ID,
           sessionId: SESSION_ID,
           userId: USER_ID,
         });
         req.flush({});
       });
  });

  describe('runEval', () => {
    it('should call POST /apps/{appName}/eval_sets/{evalSetId}/run_eval with correct body',
       () => {
         service.runEval(APP_NAME, EVAL_SET_ID, [EVAL_ID], [{}]).subscribe();
         const req = httpTestingController.expectOne(
             API_SERVER_BASE_URL + RUN_EVAL_PATH,
         );
         expect(req.request.method).toEqual('POST');
         expect(req.request.body).toEqual({
           evalIds: [EVAL_ID],
           evalMetrics: [{}],
         });
         req.flush({});
       });
  });

  describe('listEvalResults', () => {
    it('should call GET /apps/{appName}/eval_results', () => {
      service.listEvalResults(APP_NAME).subscribe();
      const req = httpTestingController.expectOne(
          API_SERVER_BASE_URL + EVAL_RESULTS_PATH,
      );
      expect(req.request.method).toEqual('GET');
      req.flush({});
    });

    it('should return empty observable if no api domain', async () => {
      service.apiServerDomain = '';
      const resultP = firstValueFrom(service.listEvalResults(APP_NAME));
      const req = httpTestingController.expectOne(EVAL_RESULTS_PATH);
      req.flush(null);
      const result = await resultP;
      expect(result).toBeNull();
    });
  });

  describe('getEvalResult', () => {
    it('should call GET /apps/{appName}/eval_results/{evalResultId}', () => {
      service.getEvalResult(APP_NAME, EVAL_RESULT_ID).subscribe();
      const req = httpTestingController.expectOne(
          API_SERVER_BASE_URL + EVAL_RESULT_PATH,
      );
      expect(req.request.method).toEqual('GET');
      req.flush({});
    });

    it('should return empty observable if no api domain', async () => {
      service.apiServerDomain = '';
      const resultP = firstValueFrom(
          service.getEvalResult(APP_NAME, EVAL_RESULT_ID),
      );
      const req = httpTestingController.expectOne(EVAL_RESULT_PATH);
      req.flush(null);
      const result = await resultP;
      expect(result).toBeNull();
    });
  });

  describe('getEvalCase', () => {
    it('should call GET /apps/{appName}/eval_sets/{evalSetId}/evals/{evalCaseId}',
       () => {
         service.getEvalCase(APP_NAME, EVAL_SET_ID, EVAL_CASE_ID).subscribe();
         const req = httpTestingController.expectOne(
             API_SERVER_BASE_URL + EVAL_CASE_PATH,
         );
         expect(req.request.method).toEqual('GET');
         req.flush({});
       });

    it('should return empty observable if no api domain', async () => {
      service.apiServerDomain = '';
      const resultP = firstValueFrom(
          service.getEvalCase(APP_NAME, EVAL_SET_ID, EVAL_CASE_ID),
      );
      const req = httpTestingController.expectOne(
          EVAL_CASE_PATH,
      );
      req.flush(null);
      const result = await resultP;
      expect(result).toBeNull();
    });
  });

  describe('updateEvalCase', () => {
    it('should call PUT /apps/{appName}/eval_sets/{evalSetId}/evals/{evalCaseId} with correct body',
       () => {
         const evalCase: EvalCase = {
           evalId: EVAL_CASE_ID,
           conversation: [],
           sessionInput: {},
           creationTimestamp: 123,
         };
         service.updateEvalCase(APP_NAME, EVAL_SET_ID, EVAL_CASE_ID, evalCase)
             .subscribe();
         const req = httpTestingController.expectOne(
             API_SERVER_BASE_URL + EVAL_CASE_PATH,
         );
         expect(req.request.method).toEqual('PUT');
         expect(req.request.body).toEqual({
           evalId: EVAL_CASE_ID,
           conversation: [],
           sessionInput: {},
           creationTimestamp: 123,
         });
         req.flush({});
       });
  });

  describe('deleteEvalCase', () => {
    it('should call DELETE /apps/{appName}/eval_sets/{evalSetId}/evals/{evalCaseId}',
       () => {
         service.deleteEvalCase(APP_NAME, EVAL_SET_ID, EVAL_CASE_ID)
             .subscribe();
         const req = httpTestingController.expectOne(
             API_SERVER_BASE_URL + EVAL_CASE_PATH,
         );
         expect(req.request.method).toEqual('DELETE');
         req.flush({});
       });
  });
});
