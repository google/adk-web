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

import {HttpClient} from '@angular/common/http';
import {computed, inject, Injectable, signal} from '@angular/core';
import {firstValueFrom} from 'rxjs';

import {RuntimeConfigUtil} from '../../../utils/runtime-config-util';
import {URLUtil} from '../../../utils/url-util';

export interface TelemetryConfigResponse {
  telemetry: boolean|null;
}

@Injectable({
  providedIn: 'root',
})
export class TelemetryService {
  private readonly http = inject(HttpClient);

  // State signals
  // undefined: initializing, null: unset/no decision, true: opted-in, false:
  // opted-out
  readonly telemetryStatus = signal<boolean|null|undefined>(undefined);
  readonly telemetryEnabled = computed(() => this.telemetryStatus() === true);

  constructor() {
    this.init();
  }

  private init(): void {
    const runtimeConfig = RuntimeConfigUtil.getRuntimeConfig();
    if (runtimeConfig && runtimeConfig.telemetry !== undefined) {
      this.telemetryStatus.set(runtimeConfig.telemetry);
    }

    if (typeof document !== 'undefined') {
      document.addEventListener('visibilitychange', () => {
        if (document.visibilityState === 'visible') {
          this.fetchTelemetryStatus();
        }
      });
    }
  }

  async fetchTelemetryStatus(): Promise<boolean|null> {
    const baseUrl = URLUtil.getApiServerBaseUrl();
    try {
      const res = await firstValueFrom(this.http.get<TelemetryConfigResponse>(
          `${baseUrl}/api/config/telemetry`));
      if (res && res.telemetry !== undefined) {
        this.telemetryStatus.set(res.telemetry);
        return res.telemetry;
      }
    } catch (e) {
      console.error('Failed to fetch telemetry status:', e);
    }
    return this.telemetryStatus() ?? null;
  }

  async setTelemetry(enabled: boolean): Promise<void> {
    const previousStatus = this.telemetryStatus();
    this.telemetryStatus.set(enabled);  // Optimistic UI update
    const baseUrl = URLUtil.getApiServerBaseUrl();
    try {
      await firstValueFrom(this.http.post<TelemetryConfigResponse>(
          `${baseUrl}/api/config/telemetry`,
          {telemetry: enabled},
          {
            headers: {'X-ADK-Telemetry-Request': 'true'},
          },
          ));
    } catch (e) {
      console.error('Failed to save telemetry status:', e);
      this.telemetryStatus.set(previousStatus);  // Rollback on failure
    }
  }
}
