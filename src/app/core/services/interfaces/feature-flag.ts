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

export const IMPORT_SESSION = 'import_session';
export const EDIT_FUNCTION_ARGS = 'edit_function_args';
export const SESSION_URL = 'session_url';
export const A2A_CARD = 'a2a_card';

export const FEATURE_FLAG_SERVICE = new InjectionToken<FeatureFlagService>('FeatureFlagService');

/**
 * Service to provide methods to handle feature flags.
 */
export declare abstract class FeatureFlagService {
  abstract isImportSessionEnabled(): Observable<boolean>;
  abstract isEditFunctionArgsEnabled(): Observable<boolean>;
  abstract isSessionUrlEnabled(): Observable<boolean>;
  abstract isA2ACardEnabled(): Observable<boolean>;
  abstract isApplicationSelectorEnabled(): Observable<boolean>;
  abstract isAlwaysOnSidePanelEnabled(): Observable<boolean>;
  abstract isTraceEnabled(): Observable<boolean>;
  abstract isArtifactsTabEnabled(): Observable<boolean>;
  abstract isEvalEnabled(): Observable<boolean>;
  abstract isTokenStreamingEnabled(): Observable<boolean>;
  abstract isMessageFileUploadEnabled(): Observable<boolean>;
  abstract isManualStateUpdateEnabled(): Observable<boolean>;
  abstract isBidiStreamingEnabled(): Observable<boolean>;
  abstract isExportSessionEnabled(): Observable<boolean>;
  abstract isEventFilteringEnabled(): Observable<boolean>;
  abstract isDeleteSessionEnabled(): Observable<boolean>;
  abstract isLoadingAnimationsEnabled(): Observable<boolean>;
  abstract isSessionsTabReorderingEnabled(): Observable<boolean>;
  abstract isSessionFilteringEnabled(): Observable<boolean>;
  abstract isSessionReloadOnNewMessageEnabled(): Observable<boolean>;
  abstract isUserIdOnToolbarEnabled(): Observable<boolean>;
}
