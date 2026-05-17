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

import {TestBed} from '@angular/core/testing';
// 1p-ONLY-IMPORTS: import {beforeEach, describe, expect, it}

import {initTestBed} from '../../testing/utils';
import {AuthService} from './auth.service';
import {authGuard} from './auth.guard';

describe('authGuard', () => {
  let authServiceSpy: jasmine.SpyObj<AuthService>;

  function configureModule(
      isEnabled: boolean, isAuthenticated: boolean = true) {
    authServiceSpy = jasmine.createSpyObj(
        'AuthService', ['login', 'isAuthenticated'],
        {isEnabled});
    authServiceSpy.isAuthenticated.and.returnValue(isAuthenticated);
    authServiceSpy.login.and.resolveTo();
    initTestBed();
    TestBed.configureTestingModule({
      providers: [
        {provide: AuthService, useValue: authServiceSpy},
      ],
    });
  }

  it('returns true when auth is disabled', () => {
    configureModule(false);
    const result = TestBed.runInInjectionContext(() => authGuard(
        {} as any, {} as any));
    expect(result).toBeTrue();
  });

  it('returns true when auth is enabled and user is authenticated', () => {
    configureModule(true, true);
    const result = TestBed.runInInjectionContext(() => authGuard(
        {} as any, {} as any));
    expect(result).toBeTrue();
  });

  it('calls login and returns false when not authenticated', () => {
    configureModule(true, false);
    const result = TestBed.runInInjectionContext(() => authGuard(
        {} as any, {} as any));
    expect(result).toBeFalse();
    expect(authServiceSpy.login).toHaveBeenCalled();
  });
});
