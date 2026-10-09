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
import {firstValueFrom} from 'rxjs';
import {toArray} from 'rxjs/operators';

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

    describe('XSRF protection', () => {
      const token = 'test-xsrf-token';
      let fetchSpy: jasmine.Spy<typeof window.fetch>;

      beforeEach(() => {
        service.apiServerDomain = '';
        document.cookie = `XSRF-TOKEN=${token}; Path=/; SameSite=Strict`;
        fetchSpy = spyOn(window, 'fetch').and.callFake(
            async () => new Response(''));
      });

      afterEach(() => {
        document.cookie = 'XSRF-TOKEN=; Path=/; Max-Age=0';
      });

      it('uses the same token as an ordinary HttpClient POST', async () => {
        service.agentChangeCancel(TEST_APP_NAME).subscribe();
        const request = httpTestingController.expectOne(
            `/dev/apps/${TEST_APP_NAME}/builder/cancel`);
        const httpToken = request.request.headers.get('X-XSRF-TOKEN');
        expect(httpToken).toBe(token);
        request.flush(true);

        await firstValueFrom(service.runSse(RUN_SSE_PAYLOAD).pipe(toArray()));
        const options = fetchSpy.calls.mostRecent().args[1];
        expect(new Headers(options?.headers).get('X-XSRF-TOKEN'))
            .toBe(httpToken);
      });

      for (const [kind, getBaseUrl] of [
        ['root-relative', () => ''],
        ['path-relative', () => 'api'],
        ['absolute same-origin', () => window.location.origin],
        ['protocol-relative same-origin', () => `//${window.location.host}`],
      ] as const) {
        it(`includes the token for a ${kind} URL`, async () => {
          service.apiServerDomain = getBaseUrl();
          await firstValueFrom(service.runSse(RUN_SSE_PAYLOAD).pipe(toArray()));
          const [url, options] = fetchSpy.calls.mostRecent().args;
          expect(url).toBe(service.apiServerDomain + RUN_SSE_PATH);
          expect(new Headers(options?.headers).get('X-XSRF-TOKEN')).toBe(token);
        });
      }

      for (const [kind, getBaseUrl] of [
        ['another host', () => 'https://example.invalid'],
        ['a protocol-relative external URL', () => '//example.invalid'],
        ['a different port', () => {
          const url = new URL(window.location.origin);
          url.port = url.port === '8000' ? '8001' : '8000';
          return url.origin;
        }],
        ['a different scheme', () => {
          const url = new URL(window.location.origin);
          url.protocol = url.protocol === 'https:' ? 'http:' : 'https:';
          return url.origin;
        }],
      ] as const) {
        it(`does not send the token to ${kind}`, async () => {
          service.apiServerDomain = getBaseUrl();
          await firstValueFrom(service.runSse(RUN_SSE_PAYLOAD).pipe(toArray()));
          const options = fetchSpy.calls.mostRecent().args[1];
          expect(new Headers(options?.headers).has('X-XSRF-TOKEN')).toBeFalse();
        });
      }

      it('omits the header when the cookie is absent', async () => {
        document.cookie = 'XSRF-TOKEN=; Path=/; Max-Age=0';
        await firstValueFrom(service.runSse(RUN_SSE_PAYLOAD).pipe(toArray()));
        const options = fetchSpy.calls.mostRecent().args[1];
        expect(new Headers(options?.headers).has('X-XSRF-TOKEN')).toBeFalse();
      });

      it('reads the latest token for every subscription', async () => {
        const responses = service.runSse(RUN_SSE_PAYLOAD);
        for (const currentToken of ['updated-xsrf-token', 'rotated-xsrf-token']) {
          document.cookie = `XSRF-TOKEN=${currentToken}; Path=/; SameSite=Strict`;
          await firstValueFrom(responses.pipe(toArray()));
          const options = fetchSpy.calls.mostRecent().args[1];
          expect(new Headers(options?.headers).get('X-XSRF-TOKEN'))
              .toBe(currentToken);
        }
        expect(fetchSpy).toHaveBeenCalledTimes(2);
      });

      it('uses the decoded cookie value', async () => {
        const encodedToken = 'token+with/encoded=characters';
        document.cookie =
            `XSRF-TOKEN=${encodeURIComponent(encodedToken)}; Path=/`;
        await firstValueFrom(service.runSse(RUN_SSE_PAYLOAD).pipe(toArray()));
        const options = fetchSpy.calls.mostRecent().args[1];
        expect(new Headers(options?.headers).get('X-XSRF-TOKEN'))
            .toBe(encodedToken);
      });

      it('respects a cross-origin document base URL', async () => {
        spyOnProperty(document, 'baseURI', 'get')
            .and.returnValue('https://example.invalid/dev-ui/');
        await firstValueFrom(service.runSse(RUN_SSE_PAYLOAD).pipe(toArray()));
        const options = fetchSpy.calls.mostRecent().args[1];
        expect(new Headers(options?.headers).has('X-XSRF-TOKEN')).toBeFalse();
      });

      it('preserves fetch errors for an invalid URL', async () => {
        service.apiServerDomain = 'http://[';
        fetchSpy.and.rejectWith(new TypeError('Invalid URL'));
        await expectAsync(firstValueFrom(service.runSse(RUN_SSE_PAYLOAD)))
            .toBeRejectedWithError(TypeError, 'Invalid URL');
        expect(fetchSpy).toHaveBeenCalledTimes(1);
        const options = fetchSpy.calls.mostRecent().args[1];
        expect(new Headers(options?.headers).has('X-XSRF-TOKEN')).toBeFalse();
        expect(service.getLoadingState().value).toBeFalse();
      });

      it('aborts the request when unsubscribed', () => {
        fetchSpy.and.returnValue(new Promise<Response>(() => {}));
        const subscription = service.runSse(RUN_SSE_PAYLOAD).subscribe();
        const options = fetchSpy.calls.mostRecent().args[1];
        expect(new Headers(options?.headers).get('X-XSRF-TOKEN')).toBe(token);
        subscription.unsubscribe();
        expect(options?.signal?.aborted).toBeTrue();
        expect(service.getLoadingState().value).toBeFalse();
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
