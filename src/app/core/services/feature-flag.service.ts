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

import {inject, Injectable, InjectionToken} from '@angular/core';
import {ActivatedRoute} from '@angular/router';
import {Observable, of, pipe} from 'rxjs';
import {map} from 'rxjs/operators';

export const IMPORT_SESSION = 'import_session';
export const EDIT_FUNCTION_ARGS = 'edit_function_args';
export const SESSION_URL = 'session_url';
export const A2A_CARD = 'a2a_card';

export const FEATURE_FLAG_SERVICE = new InjectionToken<FeatureFlagService>('FeatureFlagService');

@Injectable({
  providedIn: 'root'
})
export class FeatureFlagService {
  private route = inject(ActivatedRoute);

  constructor() {}

  isImportSessionEnabled(): Observable<boolean> {
    return this.route.queryParams.pipe(
        map((params) => params[IMPORT_SESSION] === 'true'),
    );
  }

  isEditFunctionArgsEnabled(): Observable<boolean> {
    return this.route.queryParams.pipe(
        map((params) => params[EDIT_FUNCTION_ARGS] === 'true'),
    );
  }

  isSessionUrlEnabled(): Observable<boolean> {
    return of(true);
  }

  isA2ACardEnabled(): Observable<boolean> {
    return this.route.queryParams.pipe(
        map((params) => params[A2A_CARD] === 'true'),
    );
  }
}
