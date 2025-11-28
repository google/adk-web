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

import {inject, Injectable} from '@angular/core';
import {ActivatedRoute} from '@angular/router';
import {Observable, of, pipe} from 'rxjs';
import {map} from 'rxjs/operators';
import {A2A_CARD, EDIT_FUNCTION_ARGS, FeatureFlagService as FeatureFlagServiceInterface, IMPORT_SESSION, SESSION_URL} from './interfaces/feature-flag';

@Injectable({
  providedIn: 'root'
})
export class FeatureFlagService implements FeatureFlagServiceInterface {
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

  isApplicationSelectorEnabled(): Observable<boolean> {
    return of(true);
  }

  isAlwaysOnSidePanelEnabled(): Observable<boolean> {
    return of(false);
  }

  isTraceEnabled(): Observable<boolean> {
    return of(true);
  }

  isArtifactsTabEnabled(): Observable<boolean> {
    return of(true);
  }

  isEvalEnabled(): Observable<boolean> {
    return of(true);
  }

  isTokenStreamingEnabled(): Observable<boolean> {
    return of(true);
  }

  isMessageFileUploadEnabled(): Observable<boolean> {
    return of(true);
  }

  isManualStateUpdateEnabled(): Observable<boolean> {
    return of(true);
  }

  isBidiStreamingEnabled(): Observable<boolean> {
    return of(true);
  }

  isExportSessionEnabled(): Observable<boolean> {
    return of(true);
  }

  isEventFilteringEnabled(): Observable<boolean> {
    return of(false);
  }

  isDeleteSessionEnabled(): Observable<boolean> {
    return of(true);
  }

  isLoadingAnimationsEnabled(): Observable<boolean> {
    return of(true);
  }

  isSessionsTabReorderingEnabled(): Observable<boolean> {
    return of(false);
  }

  isSessionFilteringEnabled(): Observable<boolean> {
    return of(false);
  }

  isSessionReloadOnNewMessageEnabled(): Observable<boolean> {
    return of(false);
  }

  isUserIdOnToolbarEnabled(): Observable<boolean> {
    return of(true);
  }

  isFeedbackServiceEnabled(): Observable<boolean> {
    return of(false);
  }
}
