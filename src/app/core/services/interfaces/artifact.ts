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
import {Part} from '../../models/types';

import {InjectionToken} from '@angular/core';
import {Observable} from 'rxjs';

export const ARTIFACT_SERVICE = new InjectionToken<ArtifactService>('ArtifactService');

/**
 * Service to provide methods to handle artifacts.
 */
export declare abstract class ArtifactService {
  abstract getLatestArtifact(
    userId: string,
    appName: string,
    sessionId: string,
    artifactName: string,
  ): Observable<any>;
  abstract getArtifactVersion(
    userId: string,
    appName: string,
    sessionId: string,
    artifactName: string,
    versionId: string,
  ): Observable<Part>;
}
