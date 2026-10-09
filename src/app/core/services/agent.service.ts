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

import { HttpClient, HttpXsrfTokenExtractor } from '@angular/common/http';
import { DOCUMENT, inject, Injectable, NgZone } from '@angular/core';
import { BehaviorSubject, Observable, of } from 'rxjs';
import { URLUtil } from '../../../utils/url-util';
import { AgentRunRequest } from '../models/AgentRunRequest';
import { LlmResponse } from '../models/types';
import { AgentService as AgentServiceInterface } from './interfaces/agent';

@Injectable({
  providedIn: 'root',
})
export class AgentService implements AgentServiceInterface {
  apiServerDomain = URLUtil.getApiServerBaseUrl();
  private _currentApp = new BehaviorSubject<string>('');
  currentApp = this._currentApp.asObservable();
  private isLoading = new BehaviorSubject<boolean>(false);
  private readonly document = inject(DOCUMENT);
  private readonly xsrfTokenExtractor = inject(HttpXsrfTokenExtractor);

  constructor(
    private http: HttpClient,
    private zone: NgZone,
  ) { }

  getApp(): Observable<string> {
    return this.currentApp;
  }

  setApp(name: string) {
    this._currentApp.next(name);
  }

  getLoadingState(): BehaviorSubject<boolean> {
    return this.isLoading;
  }

  runSse(req: AgentRunRequest): Observable<LlmResponse> {
    const url = this.apiServerDomain + `/run_sse`;
    this.isLoading.next(true);
    return new Observable<LlmResponse>((observer) => {
      const self = this;
      const controller = new AbortController();
      const signal = controller.signal;
      let reader: ReadableStreamDefaultReader<Uint8Array> | undefined;
      const headers: Record<string, string> = {
        'Content-Type': 'application/json',
        'Accept': 'text/event-stream',
      };

      // Fetch bypasses HttpClient's default XSRF header handling.
      if (this.isSameOrigin(url)) {
        const token = this.xsrfTokenExtractor.getToken();
        if (token !== null) {
          headers['X-XSRF-TOKEN'] = token;
        }
      }

      fetch(url, {
        method: 'POST',
        headers,
        body: JSON.stringify(req),
        signal,
      })
        .then((response) => {
          reader = response.body?.getReader();
          const decoder = new TextDecoder('utf-8');
          let lastData = '';

          const read = () => {
            reader?.read()
              .then(({ done, value }) => {
                this.isLoading.next(true);
                if (done) {
                  this.isLoading.next(false);
                  return observer.complete();
                }
                const chunk = decoder.decode(value, { stream: true });
                lastData += chunk;
                try {
                  const lines = lastData.split(/\r?\n/).filter(
                    (line) => line.startsWith('data:'));
                  lines.forEach((line) => {
                    const data = line.replace(/^data:\s*/, '');
                    const llmResponse = JSON.parse(data) as LlmResponse;
                    self.zone.run(() => observer.next(llmResponse));
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
                if (signal.aborted) {
                  return;
                }
                self.zone.run(() => observer.error(err));
              });
          };

          read();
        })
        .catch((err) => {
          if (signal.aborted) {
            return;
          }
          self.zone.run(() => observer.error(err));
        });

      return () => {
        controller.abort();
        reader?.cancel();
        this.isLoading.next(false);
      };
    });
  }

  private isSameOrigin(url: string): boolean {
    try {
      return new URL(url, this.document.baseURI).origin ===
        this.document.location?.origin;
    } catch {
      // Let fetch report invalid URLs without attaching the token.
      return false;
    }
  }

  listApps(): Observable<string[]> {
    if (this.apiServerDomain != undefined) {
      const url = this.apiServerDomain + `/list-apps?relative_path=./`;
      return this.http.get<string[]>(url);
    }
    return new Observable<[]>();
  }

  getVersion(): Observable<any> {
    if (this.apiServerDomain != undefined) {
      const url = this.apiServerDomain + `/version`;
      return this.http.get<any>(url);
    }
    return new Observable<any>();
  }

  agentBuild(appName: string, req: any): Observable<boolean> {
    if (this.apiServerDomain != undefined) {
      const url =
        this.apiServerDomain + `/dev/apps/${appName}/builder/save`;
      return this.http.post<any>(url, req);
    }
    return new Observable<false>();
  }

  agentBuildTmp(appName: string, req: any): Observable<boolean> {
    if (this.apiServerDomain != undefined) {
      const url =
        this.apiServerDomain + `/dev/apps/${appName}/builder/save?tmp=true`;
      return this.http.post<any>(url, req);
    }
    return new Observable<false>();
  }

  getAgentBuilder(agentName: string) {
    if (this.apiServerDomain != undefined) {
      const url =
        this.apiServerDomain + `/dev/apps/${agentName}/builder?ts=${Date.now()}`
      return this.http.get(url, {
        responseType: 'text'
      });
    }
    return new Observable<"">();
  }

  getAgentBuilderTmp(agentName: string) {
    if (this.apiServerDomain != undefined) {
      const url =
        this.apiServerDomain + `/dev/apps/${agentName}/builder?ts=${Date.now()}&tmp=true`
      return this.http.get(url, {
        responseType: 'text'
      });
    }
    return new Observable<"">();
  }

  getSubAgentBuilder(appName: string, relativePath: string) {
    if (this.apiServerDomain != undefined) {
      let url =
        this.apiServerDomain + `/dev/apps/${appName}/builder?ts=${Date.now()}&file_path=${relativePath}&tmp=true`
      return this.http.get(url, {
        responseType: 'text'
      });
    }
    return new Observable<"">();
  }

  agentChangeCancel(appName: string) {
    if (this.apiServerDomain != undefined) {
      let url =
        this.apiServerDomain + `/dev/apps/${appName}/builder/cancel`
      return this.http.post<any>(url, {});
    }
    return new Observable<false>();
  }

  getAppInfo(appName: string) {
    if (this.apiServerDomain != undefined) {
      let url = this.apiServerDomain + `/dev/apps/${appName}/build_graph`
      return this.http.get<any>(url);
    }
    return new Observable<''>();
  }

  getAppGraphImage(appName: string, darkMode: boolean, node?: string): Observable<any> {
    if (this.apiServerDomain != undefined) {
      const url = this.apiServerDomain + `/dev/apps/${appName}/build_graph_image`;
      const params: any = { dark_mode: darkMode };
      if (node) {
        params.node = node;
      }
      return this.http.get<any>(url, { params });
    }
    return new Observable<any>();
  }


}
