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

import {AuthConfig} from '../models/RuntimeConfig';
import {RuntimeConfigUtil} from '../../../utils/runtime-config-util';

declare global {
  interface Window {
    __ADK_CONFIG__?: {auth?: AuthConfig};
  }
}

/**
 * Resolves auth configuration from available sources.
 *
 * Priority order:
 *   1. window.__ADK_CONFIG__.auth  (Kubernetes ConfigMap injection)
 *   2. runtime-config.json auth    (standard runtime config)
 *
 * This allows container deployments to enable OIDC auth without
 * rebuilding the application -- just mount a ConfigMap with a script
 * that sets window.__ADK_CONFIG__.
 */
export function resolveAuthConfig(): AuthConfig | undefined {
  const adkConfig = window.__ADK_CONFIG__;
  if (adkConfig?.auth?.enabled) {
    return adkConfig.auth;
  }

  const runtimeConfig = RuntimeConfigUtil.getRuntimeConfig();
  return runtimeConfig?.auth;
}
