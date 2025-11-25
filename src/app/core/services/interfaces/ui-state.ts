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

import {InjectionToken} from '@angular/core';
import {Observable} from 'rxjs';

// Injection token for the UI state service.
export const UI_STATE_SERVICE =
    new InjectionToken<UiStateService>('UiStateService');

/**
 * Service to provide methods to handle traces.
 */
export declare abstract class UiStateService {
  abstract isSessionLoading(): Observable<boolean>;
  abstract setIsSessionLoading(isLoading: boolean): void;
  abstract isSessionListLoading(): Observable<boolean>;
  abstract setIsSessionListLoading(isLoading: boolean): void;
  abstract isEventRequestResponseLoading(): Observable<boolean>;
  abstract setIsEventRequestResponseLoading(isLoading: boolean): void;
}
