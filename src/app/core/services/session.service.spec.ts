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

import {SessionService} from './session.service';

const API_SERVER_BASE_URL = 'http://test.com';
const USER_ID = 'user1';
const APP_NAME = 'app1';
const SESSION_ID = 'session1';
const SESSIONS_PATH = `/apps/${APP_NAME}/users/${USER_ID}/sessions`;
const SESSION_PATH =
    `/apps/${APP_NAME}/users/${USER_ID}/sessions/${SESSION_ID}`;
const METHOD_GET = 'GET';
const METHOD_POST = 'POST';
const METHOD_DELETE = 'DELETE';

describe('SessionService', () => {
  let service: SessionService;
  let httpTestingController: HttpTestingController;

  beforeEach(() => {
    spyOn(URLUtil, 'getApiServerBaseUrl').and.returnValue(API_SERVER_BASE_URL);
    initTestBed();  // required for 1p compat
    TestBed.configureTestingModule({
      imports: [HttpClientTestingModule],
      providers: [SessionService],
    });
    service = TestBed.inject(SessionService);
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

  describe('createSession', () => {
    it('should call POST /apps/{appName}/users/{userId}/sessions with null body',
       () => {
         service.createSession(USER_ID, APP_NAME).subscribe();
         const req = httpTestingController.expectOne(
             API_SERVER_BASE_URL + SESSIONS_PATH,
         );
         expect(req.request.method).toEqual(METHOD_POST);
         expect(req.request.body).toBeNull();
         req.flush({});
       });

    it('should return empty observable if no api domain', async () => {
      service.apiServerDomain = '';
      const resultP = firstValueFrom(service.createSession(USER_ID, APP_NAME));
      const req = httpTestingController.expectOne(SESSIONS_PATH);
      req.flush(null);
      const result = await resultP;
      expect(result).toBeNull();
    });
  });

  describe('listSessions', () => {
    it('should call GET /apps/{appName}/users/{userId}/sessions', () => {
      service.listSessions(USER_ID, APP_NAME).subscribe();
      const req = httpTestingController.expectOne(
          API_SERVER_BASE_URL + SESSIONS_PATH,
      );
      expect(req.request.method).toEqual(METHOD_GET);
      req.flush([]);
    });

    it('should return empty observable if no api domain', async () => {
      service.apiServerDomain = '';
      const resultP = firstValueFrom(service.listSessions(USER_ID, APP_NAME));
      const req = httpTestingController.expectOne(SESSIONS_PATH);
      req.flush([]);
      const result = await resultP;
      expect(result).toEqual({
        items: [],
        nextPageToken: '',
      });
    });
  });

  describe('deleteSession', () => {
    it('should call DELETE /apps/{appName}/users/{userId}/sessions/{sessionId}',
       () => {
         service.deleteSession(USER_ID, APP_NAME, SESSION_ID).subscribe();
         const req = httpTestingController.expectOne(
             API_SERVER_BASE_URL + SESSION_PATH,
         );
         expect(req.request.method).toEqual(METHOD_DELETE);
         req.flush({});
       });
  });

  describe('getSession', () => {
    it('should call GET /apps/{appName}/users/{userId}/sessions/{sessionId}',
       () => {
         service.getSession(USER_ID, APP_NAME, SESSION_ID).subscribe();
         const req = httpTestingController.expectOne(
             API_SERVER_BASE_URL + SESSION_PATH,
         );
         expect(req.request.method).toEqual(METHOD_GET);
         req.flush({});
       });
  });

  describe('importSession', () => {
    it('should call POST /apps/{appName}/users/{userId}/sessions with correct body',
       () => {
         const events = [{type: 'some-event'}];
         service.importSession(USER_ID, APP_NAME, events).subscribe();
         const req = httpTestingController.expectOne(
             API_SERVER_BASE_URL + SESSIONS_PATH,
         );
         expect(req.request.method).toEqual(METHOD_POST);
         expect(req.request.body).toEqual({
           appName: APP_NAME,
           userId: USER_ID,
           events,
         });
         req.flush({});
       });

    it('should return empty observable if no api domain', async () => {
      service.apiServerDomain = '';
      const resultP = firstValueFrom(
          service.importSession(USER_ID, APP_NAME, []),
      );
      const req = httpTestingController.expectOne(SESSIONS_PATH);
      req.flush(null);
      const result = await resultP;
      expect(result).toBeNull();
    });
  });
});
