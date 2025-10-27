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
import {ActivatedRoute, Params} from '@angular/router';
// 1p-ONLY-IMPORTS: import {beforeEach, describe, expect, it,}
import {BehaviorSubject, firstValueFrom} from 'rxjs';

import {initTestBed} from '../../testing/utils';

import {FeatureFlagService} from './feature-flag.service';
import {A2A_CARD, EDIT_FUNCTION_ARGS, IMPORT_SESSION,} from './interfaces/feature-flag';

class MockActivatedRoute {
  queryParams = new BehaviorSubject<Params>({});
}

describe('FeatureFlagService', () => {
  let service: FeatureFlagService;
  let activatedRoute: MockActivatedRoute;

  beforeEach(() => {
    activatedRoute = new MockActivatedRoute();
    initTestBed();  // required for 1p compat
    TestBed.configureTestingModule({
      providers: [
        FeatureFlagService,
        {provide: ActivatedRoute, useValue: activatedRoute},
      ],
    });
    service = TestBed.inject(FeatureFlagService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });

  describe('isImportSessionEnabled', () => {
    it('should return true if \'import_session\' query param is \'true\'',
       async () => {
         activatedRoute.queryParams.next({[IMPORT_SESSION]: 'true'});
         const isEnabled =
             await firstValueFrom(service.isImportSessionEnabled());
         expect(isEnabled).toBeTrue();
       });

    it('should return false if \'import_session\' query param is not \'true\'',
       async () => {
         activatedRoute.queryParams.next({});
         const isEnabled =
             await firstValueFrom(service.isImportSessionEnabled());
         expect(isEnabled).toBeFalse();
       });
  });

  describe('isEditFunctionArgsEnabled', () => {
    it('should return true if \'edit_function_args\' query param is \'true\'',
       async () => {
         activatedRoute.queryParams.next({[EDIT_FUNCTION_ARGS]: 'true'});
         const isEnabled = await firstValueFrom(
             service.isEditFunctionArgsEnabled(),
         );
         expect(isEnabled).toBeTrue();
       });

    it('should return false if \'edit_function_args\' query param is not \'true\'',
       async () => {
         activatedRoute.queryParams.next({});
         const isEnabled = await firstValueFrom(
             service.isEditFunctionArgsEnabled(),
         );
         expect(isEnabled).toBeFalse();
       });
  });

  describe('isSessionUrlEnabled', () => {
    it('should return true', async () => {
      const isEnabled = await firstValueFrom(service.isSessionUrlEnabled());
      expect(isEnabled).toBeTrue();
    });
  });

  describe('isA2ACardEnabled', () => {
    it('should return true if \'a2a_card\' query param is \'true\'',
       async () => {
         activatedRoute.queryParams.next({[A2A_CARD]: 'true'});
         const isEnabled = await firstValueFrom(service.isA2ACardEnabled());
         expect(isEnabled).toBeTrue();
       });

    it('should return false if \'a2a_card\' query param is not \'true\'',
       async () => {
         activatedRoute.queryParams.next({});
         const isEnabled = await firstValueFrom(service.isA2ACardEnabled());
         expect(isEnabled).toBeFalse();
       });
  });
});
