/**
 * @license
 * Copyright 2026 Google LLC
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

/**
 * Dev-server proxy: forwards API paths to the ADK backend so the browser only
 * ever talks to the dev server's own origin. That keeps every request
 * same-origin, which is why no --allow_origins is needed on the backend.
 *
 * Point it somewhere else with ADK_BACKEND:
 *   ADK_BACKEND=http://127.0.0.1:9000 npm run serve
 *
 * Changes to this file require restarting `ng serve`.
 */

// 127.0.0.1 rather than localhost: Node 17+ may resolve localhost to ::1
// first, while `adk web` binds 127.0.0.1 by default -> ECONNREFUSED.
const target = process.env.ADK_BACKEND ?? 'http://127.0.0.1:8000';

// Deliberately no `changeOrigin`. The backend derives an expected origin from
// the Host header and compares it against Origin, rejecting state-changing
// requests that disagree. Rewriting Host makes every POST/PATCH/DELETE 403.
const api = (extra = {}) => ({target, secure: false, ...extra});

export default {
  '/list-apps': api(),
  '/version': api(),
  '/health': api(),
  // `ws: true` is what makes the upgrade work; without it the handshake times
  // out. Keep specific paths above '/run' for readability.
  '/run_live': api({ws: true}),
  '/run_sse': api(),
  '/run': api(),
  '/apps': api(),
  '/apps/**': api(),
  '/dev': api(),
  '/dev/**': api(),
  '/config': api(),
  '/config/**': api(),
  '/agent-identity': api(),
  '/agent-identity/**': api(),
};
