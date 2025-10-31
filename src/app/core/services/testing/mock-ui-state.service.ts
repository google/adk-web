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

import {BehaviorSubject} from 'rxjs';

import {UI_STATE_SERVICE, UiStateService as UiStateServiceInterface} from '../interfaces/ui-state';

/**
 * Mock UI state service.
 */
export class MockUiStateService implements UiStateServiceInterface {
  readonly isSessionLoadingResponse = new BehaviorSubject<boolean>(false);
  readonly isSessionListLoadingResponse = new BehaviorSubject<boolean>(false);
  readonly isEventRequestResponseLoadingResponse = new BehaviorSubject<boolean>(
      false,
  );

  readonly isSessionLoading =
      jasmine.createSpy('isSessionLoading')
          .and.returnValue(this.isSessionLoadingResponse);
  readonly isSessionListLoading =
      jasmine.createSpy('isSessionListLoading')
          .and.returnValue(this.isSessionListLoadingResponse);
  readonly isEventRequestResponseLoading =
      jasmine.createSpy('isEventRequestResponseLoading')
          .and.returnValue(this.isEventRequestResponseLoadingResponse);

  readonly setIsSessionLoading = jasmine.createSpy('setIsSessionLoading');
  readonly setIsSessionListLoading =
      jasmine.createSpy('setIsSessionListLoading');
  readonly setIsEventRequestResponseLoading =
      jasmine.createSpy('setIsEventRequestResponseLoading');
}

/**
 * Provider for the mock UI state service.
 */
export const MOCK_UI_STATE_SERVICE_PROVIDER = {
  provide: UI_STATE_SERVICE,
  useClass: MockUiStateService,
};
