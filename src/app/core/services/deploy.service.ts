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

import {HttpClient} from '@angular/common/http';
import {inject, Injectable, NgZone} from '@angular/core';
import {Observable} from 'rxjs';

import {URLUtil} from '../../../utils/url-util';
import {DeployConfig, DeployDefaults, DeployEvent, DeployResult, DeployTarget} from '../models/Deploy';

import {DeployService as DeployServiceInterface} from './interfaces/deploy';

/**
 * Marks the final line of the deploy response body. Everything before it is
 * the deploy's own console output; the remainder is a JSON DeployResult.
 * Must match `_RESULT_MARKER` in `cli/dev_deploy.py`.
 */
const RESULT_MARKER = '__ADK_DEPLOY_RESULT__';

@Injectable({providedIn: 'root'})
export class DeployService implements DeployServiceInterface {
  private readonly http = inject(HttpClient);
  private readonly zone = inject(NgZone);

  apiServerDomain = URLUtil.getApiServerBaseUrl();

  getDeployDefaults(appName: string): Observable<DeployDefaults> {
    const url =
        `${this.apiServerDomain}/dev/apps/${appName}/deploy/defaults`;
    return this.http.get<DeployDefaults>(url);
  }

  deploy(appName: string, target: DeployTarget, config: DeployConfig):
      Observable<DeployEvent> {
    // The target is a path segment rather than a body field so each route
    // keeps its own request schema, matching the three CLI subcommands.
    const url =
        `${this.apiServerDomain}/dev/apps/${appName}/deploy/${target}`;

    return new Observable<DeployEvent>((observer) => {
      const abort = new AbortController();
      // HttpClient buffers the whole body, so this uses fetch to read the
      // response as it arrives, the same way TestsService.runTests does.
      fetch(url, {
        method: 'POST',
        headers: {'Content-Type': 'application/json'},
        body: JSON.stringify(config),
        signal: abort.signal,
      })
          .then(async (response) => {
            if (!response.ok) {
              throw new Error(await this.describeError(response));
            }
            if (!response.body) {
              throw new Error('The deploy response had no body.');
            }

            const reader = response.body.getReader();
            const decoder = new TextDecoder('utf-8');
            let pending = '';
            let resultText = '';
            let sawMarker = false;

            const emitLog = (text: string) => {
              if (text) {
                this.zone.run(() => observer.next({kind: 'log', text}));
              }
            };

            for (;;) {
              const {done, value} = await reader.read();
              if (done) {
                break;
              }
              const chunk = decoder.decode(value, {stream: true});
              if (sawMarker) {
                resultText += chunk;
                continue;
              }

              pending += chunk;
              const at = pending.indexOf(RESULT_MARKER);
              if (at >= 0) {
                emitLog(pending.slice(0, at));
                resultText = pending.slice(at + RESULT_MARKER.length);
                pending = '';
                sawMarker = true;
              } else {
                // Hold back the last few characters: the marker itself may be
                // split across two chunks, and half of it must not be shown
                // as log output.
                const safe = pending.length - RESULT_MARKER.length;
                if (safe > 0) {
                  emitLog(pending.slice(0, safe));
                  pending = pending.slice(safe);
                }
              }
            }

            if (!sawMarker) {
              // The stream ended without a verdict. The deploy is not
              // necessarily dead: the server keeps it running when a client
              // goes away, so say nothing about its outcome.
              emitLog(pending);
              this.zone.run(() => observer.complete());
              return;
            }

            let result: DeployResult;
            try {
              result = JSON.parse(resultText.trim()) as DeployResult;
            } catch {
              throw new Error(
                  `Could not parse the deploy result: ${resultText.trim()}`);
            }
            this.zone.run(() => {
              observer.next({kind: 'result', result});
              observer.complete();
            });
          })
          .catch((err) => {
            if (abort.signal.aborted) {
              this.zone.run(() => observer.complete());
              return;
            }
            this.zone.run(() => observer.error(err));
          });

      // Unsubscribing stops us reading the stream. It does NOT stop the
      // deploy, which the server deliberately lets run to completion so that
      // a half-created Agent Runtime is never left behind.
      return () => abort.abort();
    });
  }

  /** Turns a non-2xx response into a message worth showing the user. */
  private async describeError(response: Response): Promise<string> {
    let detail = '';
    try {
      const body = await response.json();
      detail = typeof body?.detail === 'string' ?
          body.detail :
          JSON.stringify(body?.detail ?? '');
    } catch {
      detail = '';
    }
    if (response.status === 404) {
      return detail ||
          'Deploy is unavailable. It only exists on the local `adk web` ' +
              'server, not on a deployed one.';
    }
    return detail || `Deploy request failed with HTTP ${response.status}.`;
  }
}
