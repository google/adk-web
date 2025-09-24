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
import {firstValueFrom} from 'rxjs';

import {URLUtil} from '../../../utils/url-util';
import {createFakeLlmResponse} from '../models/testing/fake_genai_types';
import {LlmResponse} from '../models/types';

import {AgentService} from './agent.service';

const API_SERVER_BASE_URL = 'http://test.com';
const LIST_APPS_PATH = '/list-apps?relative_path=./';
const RUN_SSE_PATH = '/run_sse';
const TEST_APP_NAME = 'test-app';
const SESSION_ID = '123';
const USER_ID = 'test-user';
const NEW_MESSAGE = 'test-message';
const METHOD_GET = 'GET';
const METHOD_POST = 'POST';
const HEADER_CONTENT_TYPE = 'Content-Type';
const APPLICATION_JSON = 'application/json';
const HEADER_ACCEPT = 'Accept';
const TEXT_EVENT_STREAM = 'text/event-stream';
const RUN_SSE_PAYLOAD = {
  sessionId: SESSION_ID,
  appName: TEST_APP_NAME,
  userId: USER_ID,
  newMessage: NEW_MESSAGE,
};

describe('AgentService', () => {
  let service: AgentService;
  let httpTestingController: HttpTestingController;

  beforeEach(() => {
    spyOn(URLUtil, 'getApiServerBaseUrl').and.returnValue(API_SERVER_BASE_URL);
    TestBed.configureTestingModule({
      imports: [HttpClientTestingModule],
      providers: [AgentService],
    });
    service = TestBed.inject(AgentService);
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

  describe('App', () => {
    it('should set the current app name', async () => {
      service.setApp(TEST_APP_NAME);
      const app = await firstValueFrom(service.getApp());
      expect(app).toBe(TEST_APP_NAME);
    });

    it('should return an observable with the current app name', async () => {
      service.setApp('test-app-2');
      const app = await firstValueFrom(service.getApp());
      expect(app).toBe('test-app-2');
    });
  });

  describe('LoadingState', () => {
    it('should return loading state behavior subject', () => {
      expect(service.getLoadingState().value).toBeFalse();
    });
  });

  describe('listApps', () => {
    it('should call list-apps endpoint with correct url', () => {
      service.listApps().subscribe();
      const req = httpTestingController.expectOne(
          API_SERVER_BASE_URL + LIST_APPS_PATH,
      );
      expect(req.request.method).toEqual(METHOD_GET);
      req.flush([]);
    });

    it('should return list of apps from http get', async () => {
      const appsPromise = firstValueFrom(service.listApps());
      const req = httpTestingController.expectOne(
          API_SERVER_BASE_URL + LIST_APPS_PATH,
      );
      req.flush(['app1', 'app2']);
      const apps = await appsPromise;
      expect(apps).toEqual(['app1', 'app2']);
    });

    it('should return an empty observable if apiServerDomain is not set',
       async () => {
         service.apiServerDomain = '';
         const appsPromise = firstValueFrom(service.listApps());
         const req = httpTestingController.expectOne(LIST_APPS_PATH);
         req.flush([]);
         const apps = await appsPromise;
         expect(apps).toEqual([]);
       });
  });

  describe('runSse', () => {
    it('should set loading state to true when called', () => {
      spyOn(window, 'fetch').and.resolveTo(new Response());
      service.runSse(RUN_SSE_PAYLOAD).subscribe();
      expect(service.getLoadingState().value).toBeTrue();
    });

    it('should make a POST request to /run_sse with correct arguments', () => {
      spyOn(window, 'fetch').and.resolveTo(new Response());
      service.runSse(RUN_SSE_PAYLOAD).subscribe();
      expect(window.fetch)
          .toHaveBeenCalledWith(API_SERVER_BASE_URL + RUN_SSE_PATH, {
            method: METHOD_POST,
            headers: {
              [HEADER_CONTENT_TYPE]: APPLICATION_JSON,
              [HEADER_ACCEPT]: TEXT_EVENT_STREAM,
            },
            body: JSON.stringify(RUN_SSE_PAYLOAD),
          });
    });

    it('should emit LlmResponses received from fetch', (done) => {
      const fakeResponse1 = createFakeLlmResponse();
      const fakeResponse2 = createFakeLlmResponse({
        content: {role: 'model', parts: [{text: 'fake response 2'}]},
      });
      const mockBody = new ReadableStream({
        start(controller) {
          const encoder = new TextEncoder();
          controller.enqueue(
            encoder.encode(`data: ${JSON.stringify(fakeResponse1)}\n`),
          );
          controller.enqueue(
            encoder.encode(`data: ${JSON.stringify(fakeResponse2)}\n`),
          );
          controller.close();
        },
      });
      spyOn(window, 'fetch').and.resolveTo(new Response(mockBody));
      const results: LlmResponse[] = [];
      service.runSse(RUN_SSE_PAYLOAD).subscribe({
        next: (data) => {
          results.push(data);
        },
        complete: () => {
          expect(results).toEqual([fakeResponse1, fakeResponse2]);
          done();
        },
      });
    });

    it('should set loading state to false when fetch is done', (done) => {
      const mockBody = new ReadableStream({
        start(controller) {
          controller.close();
        },
      });
      spyOn(window, 'fetch').and.resolveTo(new Response(mockBody));
      service.runSse(RUN_SSE_PAYLOAD).subscribe({
        complete: () => {
          expect(service.getLoadingState().value).toBeFalse();
          done();
        },
      });
    });

    it('should emit error if fetch fails', (done) => {
      spyOn(window, 'fetch').and.rejectWith(new Error('Fetch failed'));
      service.runSse(RUN_SSE_PAYLOAD).subscribe({
        error: (err) => {
          expect(err.message).toBe('Fetch failed');
          done();
        },
      });
    });

    it('should handle incomplete JSON chunks', (done) => {
      const fakeResponse = createFakeLlmResponse();
      const fakeResponseJson = JSON.stringify(fakeResponse);
      const mid = Math.floor(fakeResponseJson.length / 2);
      const chunk1 = fakeResponseJson.substring(0, mid);
      const chunk2 = fakeResponseJson.substring(mid);

      const mockBody = new ReadableStream({
        start(controller) {
          const encoder = new TextEncoder();
          controller.enqueue(encoder.encode(`data: ${chunk1}`));
          controller.enqueue(encoder.encode(`${chunk2}\n`));
          controller.close();
        },
      });
      spyOn(window, 'fetch').and.resolveTo(new Response(mockBody));
      const results: LlmResponse[] = [];
      service.runSse(RUN_SSE_PAYLOAD).subscribe({
        next: (data) => {
          results.push(data);
        },
        complete: () => {
          expect(results).toEqual([fakeResponse]);
          done();
        },
      });
    });
  });
});
