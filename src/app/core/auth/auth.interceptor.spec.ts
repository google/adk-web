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

import {HttpClient, provideHttpClient, withInterceptors} from '@angular/common/http';
import {HttpTestingController, provideHttpClientTesting} from '@angular/common/http/testing';
import {TestBed} from '@angular/core/testing';
// 1p-ONLY-IMPORTS: import {afterEach, beforeEach, describe, expect, it}

import {initTestBed} from '../../testing/utils';
import {AuthService} from './auth.service';
import {authInterceptorFn} from './auth.interceptor';

describe('authInterceptorFn', () => {
  let httpClient: HttpClient;
  let httpTesting: HttpTestingController;
  let authServiceSpy: jasmine.SpyObj<AuthService>;

  function configureModule(isEnabled: boolean) {
    authServiceSpy = jasmine.createSpyObj(
        'AuthService', ['getToken'], {isEnabled});
    initTestBed();
    TestBed.configureTestingModule({
      providers: [
        provideHttpClient(withInterceptors([authInterceptorFn])),
        provideHttpClientTesting(),
        {provide: AuthService, useValue: authServiceSpy},
      ],
    });
    httpClient = TestBed.inject(HttpClient);
    httpTesting = TestBed.inject(HttpTestingController);
  }

  afterEach(() => {
    httpTesting.verify();
  });

  describe('auth disabled', () => {
    beforeEach(() => {
      configureModule(false);
    });

    it('passes requests through without Authorization header', () => {
      httpClient.get('/api/test').subscribe();
      const req = httpTesting.expectOne('/api/test');
      expect(req.request.headers.has('Authorization')).toBeFalse();
      req.flush({});
    });

    it('does not call getToken', () => {
      httpClient.get('/api/test').subscribe();
      const req = httpTesting.expectOne('/api/test');
      expect(authServiceSpy.getToken).not.toHaveBeenCalled();
      req.flush({});
    });
  });

  describe('auth enabled', () => {
    beforeEach(() => {
      configureModule(true);
    });

    it('adds Authorization header when token is available',
       (done: DoneFn) => {
         authServiceSpy.getToken.and.resolveTo('test-token-123');

         httpClient.get('/api/test').subscribe({
           next: () => done(),
           error: done.fail,
         });

         setTimeout(() => {
           const req = httpTesting.expectOne('/api/test');
           expect(req.request.headers.get('Authorization'))
               .toBe('Bearer test-token-123');
           req.flush({});
         });
       });

    it('rejects request when no token is available', (done: DoneFn) => {
      authServiceSpy.getToken.and.resolveTo('');

      httpClient.get('/api/test').subscribe({
        next: () => done.fail('Expected error'),
        error: (err) => {
          expect(err.message).toContain('no token');
          done();
        },
      });
    });
  });
});
