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
import * as authConfigModule from './auth.config';

import {AuthService} from './auth.service';

describe('AuthService', () => {
  let service: AuthService;

  beforeEach(() => {
    spyOn(authConfigModule, 'resolveAuthConfig').and.returnValue(undefined);
    initTestBed();
    TestBed.configureTestingModule({
      providers: [AuthService],
    });
    service = TestBed.inject(AuthService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });

  describe('auth disabled (default)', () => {
    beforeEach(async () => {
      await service.init();
    });

    it('isEnabled should be false', () => {
      expect(service.isEnabled).toBeFalse();
    });

    it('isAuthenticated should return true when disabled', () => {
      expect(service.isAuthenticated()).toBeTrue();
    });

    it('getToken should return empty string', async () => {
      const token = await service.getToken();
      expect(token).toBe('');
    });

    it('getUserInfo should return null', () => {
      expect(service.getUserInfo()).toBeNull();
    });

    it('init should resolve immediately', async () => {
      await expectAsync(service.init()).toBeResolved();
    });

    it('login should resolve without error', async () => {
      await expectAsync(service.login()).toBeResolved();
    });

    it('logout should resolve without error', async () => {
      await expectAsync(service.logout()).toBeResolved();
    });
  });

  describe('init idempotency', () => {
    it('second init call returns same promise', () => {
      const p1 = service.init();
      const p2 = service.init();
      expect(p1).toBe(p2);
    });

    it('init after completion is a no-op', async () => {
      await service.init();
      await expectAsync(service.init()).toBeResolved();
    });
  });
});
