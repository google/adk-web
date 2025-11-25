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
import {firstValueFrom, of} from 'rxjs';

// 1p-ONLY-IMPORTS: import {beforeEach, describe, expect, it}
import {FEATURE_FLAG_SERVICE} from './interfaces/feature-flag';
import {MockFeatureFlagService} from './testing/mock-feature-flag.service';
import {UiStateService} from './ui-state.service';
import {initTestBed} from '../../testing/utils';

describe('UiStateService', () => {
  let state: {
    service: UiStateService;
    mockFeatureFlagService: MockFeatureFlagService;
  };

  beforeEach(() => {
    const mockFeatureFlagService = new MockFeatureFlagService();
    mockFeatureFlagService.isLoadingAnimationsEnabledResponse.next(true);

    initTestBed();  // required for 1p compat
    TestBed.configureTestingModule({
      providers: [
        UiStateService,
        {provide: FEATURE_FLAG_SERVICE, useValue: mockFeatureFlagService},
      ],
    });

    state = {
      service: TestBed.inject(UiStateService),
      mockFeatureFlagService,
    };
  });

  it('should be instantiated', () => {
    expect(state.service).toBeTruthy();
  });

  describe('isSessionLoading', () => {
    it('should return true when loading and feature flag is enabled', async () => {
      state.service.setIsSessionLoading(true);
      await expectAsync(firstValueFrom(state.service.isSessionLoading()))
        .toBeResolvedTo(true);
    });

    it('should return false when not loading and feature flag is enabled', async () => {
      state.service.setIsSessionLoading(false);
      await expectAsync(firstValueFrom(state.service.isSessionLoading()))
        .toBeResolvedTo(false);
    });

    it('should return false when loading and feature flag is disabled', async () => {
      state.mockFeatureFlagService.isLoadingAnimationsEnabledResponse.next(false);
      state.service.setIsSessionLoading(true);
      await expectAsync(firstValueFrom(state.service.isSessionLoading()))
        .toBeResolvedTo(false);
    });
  });

  describe('isSessionListLoading', () => {
    it('should return true when loading and feature flag is enabled', async () => {
      state.service.setIsSessionListLoading(true);
      await expectAsync(firstValueFrom(state.service.isSessionListLoading()))
        .toBeResolvedTo(true);
    });

    it('should return false when not loading and feature flag is enabled', async () => {
      state.service.setIsSessionListLoading(false);
      await expectAsync(firstValueFrom(state.service.isSessionListLoading()))
        .toBeResolvedTo(false);
    });

    it('should return false when loading and feature flag is disabled', async () => {
      state.mockFeatureFlagService.isLoadingAnimationsEnabledResponse.next(false);
      state.service.setIsSessionListLoading(true);
      await expectAsync(firstValueFrom(state.service.isSessionListLoading()))
        .toBeResolvedTo(false);
    });
  });

  describe('isEventRequestResponseLoading', () => {
    it('should return true when loading and feature flag is enabled', async () => {
      state.service.setIsEventRequestResponseLoading(true);
      await expectAsync(firstValueFrom(state.service.isEventRequestResponseLoading()))
        .toBeResolvedTo(true);
    });

    it('should return false when not loading and feature flag is enabled', async () => {
      state.service.setIsEventRequestResponseLoading(false);
      await expectAsync(firstValueFrom(state.service.isEventRequestResponseLoading()))
        .toBeResolvedTo(false);
    });

    it('should return false when loading and feature flag is disabled', async () => {
      state.mockFeatureFlagService.isLoadingAnimationsEnabledResponse.next(false);
      state.service.setIsEventRequestResponseLoading(true);
      await expectAsync(firstValueFrom(state.service.isEventRequestResponseLoading()))
        .toBeResolvedTo(false);
    });
  });
});
