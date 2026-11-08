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
// 1p-ONLY-IMPORTS: import {beforeEach, describe, expect, it}
import {firstValueFrom, Subject} from 'rxjs';
import {switchMap, toArray} from 'rxjs/operators';

import {URLUtil} from '../../../utils/url-util';
import {
  fakeAsync,
  initTestBed,
} from '../../testing/utils';
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
  newMessage: {parts: [{text: NEW_MESSAGE}], role: 'user'},
};

describe('AgentService', () => {
  let service: AgentService;
  let httpTestingController: HttpTestingController;

  beforeEach(() => {
    spyOn(URLUtil, 'getApiServerBaseUrl').and.returnValue(API_SERVER_BASE_URL);
    initTestBed();  // required for 1p compat
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

  it('should be created', async () => {
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
    it('should return loading state behavior subject', async () => {
      expect(service.getLoadingState().value).toBeFalse();
    });
  });

  describe('listApps', () => {
    it('should call list-apps endpoint with correct url', async () => {
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
    it('should set loading state to true when called', async () => {
      spyOn(window, 'fetch').and.resolveTo(new Response());
      service.runSse(RUN_SSE_PAYLOAD).subscribe();
      expect(service.getLoadingState().value).toBeTrue();
    });

    it('should make a POST request to /run_sse with correct arguments', async () => {
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
            signal: jasmine.any(AbortSignal),
          });
    });

    it(
        'should emit LlmResponses received from fetch', async () => {
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

          const results = await firstValueFrom(
              service.runSse(RUN_SSE_PAYLOAD).pipe(toArray()),
          );

          expect(results).toEqual([fakeResponse1, fakeResponse2]);
    });

    it(
        'should set loading state to false when fetch is done', async () => {
          const mockBody = new ReadableStream({
            start(controller) {
              controller.close();
            },
          });
          spyOn(window, 'fetch').and.resolveTo(new Response(mockBody));

          await firstValueFrom(service.runSse(RUN_SSE_PAYLOAD).pipe(toArray()));

          expect(service.getLoadingState().value).toBeFalse();
        });


    it('should emit error if fetch fails', async () => {
      spyOn(window, 'fetch').and.rejectWith(new Error('Fetch failed'));

      await expectAsync(
        firstValueFrom(service.runSse(RUN_SSE_PAYLOAD)),
      ).toBeRejectedWithError('Fetch failed');
    });

    it('should handle incomplete JSON chunks', async () => {
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

      const results = await firstValueFrom(
          service.runSse(RUN_SSE_PAYLOAD).pipe(toArray()),
      );

      expect(results).toEqual([fakeResponse]);
    });

    for (const {name, chunks} of [
      {
        name: 'an event split after a complete event',
        chunks: ['data: {"id":"1"}\n\ndata: {"id":', '"2"}\n\n'],
      },
      {
        name: 'a chunk boundary inside the data: prefix',
        chunks: ['data: {"id":"1"}\n\nda', 'ta: {"id":"2"}\n\n'],
      },
      {
        name: 'CRLF line endings split between chunks',
        chunks: ['data: {"id":"1"}\r', '\n\r', '\ndata: {"id":', '"2"}\r\n\r\n'],
      },
      {
        name: 'comment lines and no trailing newline',
        chunks: [': ping\n\nevent: message\ndata: {"id":"1"}\n\ndata: {"id":"2"}'],
      },
      {
        name: 'a malformed data: line between events',
        chunks: ['data: {"id":"1"}\n\ndata: {oops\n\ndata: {"id":"2"}\n\n'],
      },
    ]) {
      it(`should emit each event once for ${name}`, async () => {
        const mockBody = new ReadableStream({
          start(controller) {
            const encoder = new TextEncoder();
            for (const chunk of chunks) {
              controller.enqueue(encoder.encode(chunk));
            }
            controller.close();
          },
        });
        spyOn(window, 'fetch').and.resolveTo(new Response(mockBody));

        const results = await firstValueFrom(
            service.runSse(RUN_SSE_PAYLOAD).pipe(toArray()),
        );

        expect(results as unknown[]).toEqual([{id: '1'}, {id: '2'}]);
      });
    }

    it(
        'should skip a truncated last event and complete', async () => {
          const mockBody = new ReadableStream({
            start(controller) {
              controller.enqueue(
                  new TextEncoder().encode('data: {"id":"1"}\n\ndata: {"id":'),
              );
              controller.close();
            },
          });
          spyOn(window, 'fetch').and.resolveTo(new Response(mockBody));

          const results = await firstValueFrom(
              service.runSse(RUN_SSE_PAYLOAD).pipe(toArray()),
          );

          expect(results as unknown[]).toEqual([{id: '1'}]);
          expect(service.getLoadingState().value).toBeFalse();
        });

    it(
        'should keep loading on for a run that replaces an unsubscribed one',
        async () => {
          const firstBody = new ReadableStream({
            start(controller) {
              controller.enqueue(new TextEncoder().encode('data: {"id":"1"}\n\n'));
            },
          });
          spyOn(window, 'fetch').and.returnValues(
              Promise.resolve(new Response(firstBody)),
              Promise.resolve(new Response(new ReadableStream())),
          );
          const flush = async () => {
            for (let i = 0; i < 10; i++) {
              await new Promise((resolve) => setTimeout(resolve));
            }
          };
          const trigger = new Subject<void>();
          const loading: boolean[] = [];
          const subscription =
              trigger.pipe(switchMap(() => service.runSse(RUN_SSE_PAYLOAD)))
                  .subscribe();
          trigger.next();
          await flush();

          const loadingSubscription =
              service.getLoadingState().subscribe((value) => loading.push(value));
          trigger.next();
          await flush();
          loadingSubscription.unsubscribe();
          subscription.unsubscribe();

          expect(loading).toEqual([true, false, true]);
        });
  });

  describe('Agent Builder Endpoints', () => {
    it('should call getAgentBuilder with correct URL structure', () => {
      service.getAgentBuilder(TEST_APP_NAME).subscribe();
      const req = httpTestingController.expectOne(req => 
        req.url.startsWith(`${API_SERVER_BASE_URL}/dev/apps/${TEST_APP_NAME}/builder`) && !req.url.includes('tmp=true')
      );
      expect(req.request.method).toEqual('GET');
      req.flush('builder-data');
    });

    it('should call getAgentBuilderTmp with correct URL structure and tmp flag', () => {
      service.getAgentBuilderTmp(TEST_APP_NAME).subscribe();
      const req = httpTestingController.expectOne(req => 
        req.url.startsWith(`${API_SERVER_BASE_URL}/dev/apps/${TEST_APP_NAME}/builder`) && req.url.includes('tmp=true')
      );
      expect(req.request.method).toEqual('GET');
      req.flush('builder-data-tmp');
    });

    it('should call getSubAgentBuilder with correct URL structure, tmp, and file_path parameters', () => {
      const relativePath = 'subagents/my-subagent.py';
      service.getSubAgentBuilder(TEST_APP_NAME, relativePath).subscribe();
      const req = httpTestingController.expectOne(req => 
        req.url.startsWith(`${API_SERVER_BASE_URL}/dev/apps/${TEST_APP_NAME}/builder`) &&
        req.url.includes('tmp=true') &&
        req.url.includes(`file_path=${relativePath}`)
      );
      expect(req.request.method).toEqual('GET');
      req.flush('subagent-builder-data');
    });

    it('should call agentChangeCancel with correct URL structure and POST method', () => {
      service.agentChangeCancel(TEST_APP_NAME).subscribe();
      const req = httpTestingController.expectOne(
        `${API_SERVER_BASE_URL}/dev/apps/${TEST_APP_NAME}/builder/cancel`
      );
      expect(req.request.method).toEqual('POST');
      req.flush(true);
    });
  });
});
