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
import {Injectable, NgZone, InjectionToken} from '@angular/core';
import {BehaviorSubject, Observable, of} from 'rxjs';
import {URLUtil} from '../../../utils/url-util';
import {AgentRunRequest} from '../models/AgentRunRequest';

export const AGENT_SERVICE = new InjectionToken<AgentService>('AgentService');

@Injectable({
  providedIn: 'root',
})
export class AgentService {
  apiServerDomain = URLUtil.getApiServerBaseUrl();
  private _currentApp = new BehaviorSubject<string>('');
  currentApp = this._currentApp.asObservable();
  private isLoading = new BehaviorSubject<boolean>(false);

  constructor(
    private http: HttpClient,
    private zone: NgZone,
  ) {}

  getApp(): Observable<string> {
    return this.currentApp;
  }

  setApp(name: string) {
    this._currentApp.next(name);
  }

  getLoadingState(): BehaviorSubject<boolean> {
    return this.isLoading;
  }

  runSse(req: AgentRunRequest) {
    const url = this.apiServerDomain + `/run_sse`;
    this.isLoading.next(true);
    return new Observable<string>((observer) => {
      const self = this;
      fetch(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'text/event-stream',
        },
        body: JSON.stringify(req),
      })
        .then((response) => {
          const reader = response.body?.getReader();
          const decoder = new TextDecoder('utf-8');
          let lastData = '';

          const read = () => {
            reader?.read()
                .then(({done, value}) => {
                  this.isLoading.next(true);
                  if (done) {
                    this.isLoading.next(false);
                    return observer.complete();
                  }
                  const chunk = decoder.decode(value, {stream: true});
                  lastData += chunk;
                  try {
                    const lines = lastData.split(/\r?\n/).filter(
                        (line) => line.startsWith('data:'));
                    lines.forEach((line) => {
                      const data = line.replace(/^data:\s*/, '');
                      JSON.parse(data);
                      self.zone.run(() => observer.next(data));
                    });
                    lastData = '';
                  } catch (e) {
                    // the data is not a valid json, it could be an incomplete
                    // chunk. we ignore it and wait for the next chunk.
                    if (e instanceof SyntaxError) {
                      read();
                    }
                  }
                  read();  // Read the next chunk
                })
                .catch((err) => {
                  self.zone.run(() => observer.error(err));
                });
          };

          read();
        })
        .catch((err) => {
          self.zone.run(() => observer.error(err));
        });
    });
  }

  listApps(): Observable<string[]> {
    if (this.apiServerDomain != undefined) {
      const url = this.apiServerDomain + `/list-apps?relative_path=./`;
      return this.http.get<string[]>(url);
    }
    return new Observable<[]>();
  }
}
