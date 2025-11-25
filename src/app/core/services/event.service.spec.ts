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

import {URLUtil} from '../../../utils/url-util';
import {initTestBed} from '../../testing/utils';

import {EventService} from './event.service';

describe('EventService', () => {
  let service: EventService;
  let httpTestingController: HttpTestingController;
  const EVENT_ID = {
    id: 'trace1',
  };
  beforeEach(() => {
    spyOn(URLUtil, 'getApiServerBaseUrl').and.returnValue('http://test.com');
    initTestBed();  // required for 1p compat
    TestBed.configureTestingModule({
      imports: [HttpClientTestingModule],
      providers: [EventService],
    });
    service = TestBed.inject(EventService);
    httpTestingController = TestBed.inject(HttpTestingController);
  });

  afterEach(() => {
    httpTestingController.verify();
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });

  describe('getEventTrace', () => {
    it('should call GET /debug/trace/{id}', () => {
      service.getEventTrace(EVENT_ID).subscribe();
      const req = httpTestingController.expectOne(
          'http://test.com/debug/trace/trace1',
      );
      expect(req.request.method).toEqual('GET');
      req.flush({});
    });
  });

  describe('getTrace', () => {
    it('should call GET /debug/trace/session/{sessionId}', () => {
      service.getTrace('session1').subscribe();
      const req = httpTestingController.expectOne(
          'http://test.com/debug/trace/session/session1',
      );
      expect(req.request.method).toEqual('GET');
      req.flush({});
    });
  });

  describe('getEvent', () => {
    it('should call GET /apps/{appName}/users/{userId}/sessions/{sessionId}/events/{eventId}/graph',
       () => {
         service.getEvent('user1', 'app1', 'session1', 'event1').subscribe();
         const req = httpTestingController.expectOne(
             'http://test.com/apps/app1/users/user1/sessions/session1/events/event1/graph',
         );
         expect(req.request.method).toEqual('GET');
         req.flush({});
       });
  });
});
