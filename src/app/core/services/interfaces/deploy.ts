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

import {DeployConfig, DeployDefaults, DeployEvent, DeployTarget} from '../../models/Deploy';

/**
 * Deploys agents to a hosted environment.
 *
 * Backed by dev-only endpoints, so it is unavailable whenever the UI is served
 * from a deployed container. Callers should treat an error from `deploy` as
 * "deploy is not offered here" rather than a failure worth retrying.
 */
export declare abstract class DeployService {
  /**
   * Resolves what the deploy form should be prefilled with, reading sources
   * the browser cannot see: the agent's `.env`, its
   * `.agent_engine_config.json`, and the local gcloud config. One call serves
   * every target.
   */
  abstract getDeployDefaults(appName: string): Observable<DeployDefaults>;

  /**
   * Deploys an agent to the given target.
   *
   * Emits log events as the deploy runs and exactly one result event at the
   * end. The observable completing without a result event means the stream was
   * cut short; the deploy itself may still be running on the server.
   */
  abstract deploy(
      appName: string,
      target: DeployTarget,
      config: DeployConfig,
      ): Observable<DeployEvent>;
}

/** Injection token for deploy service. */
export const DEPLOY_SERVICE = new InjectionToken<DeployService>(
    'DeployService',
);
