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

import {HttpClientTestingModule, HttpTestingController} from '@angular/common/http/testing';
import {TestBed} from '@angular/core/testing';
// 1p-ONLY-IMPORTS: import {beforeEach, describe, expect, it}

import {RuntimeConfigUtil} from '../../../utils/runtime-config-util';
import {URLUtil} from '../../../utils/url-util';
import {initTestBed} from '../../testing/utils';

import {TelemetryService} from './telemetry.service';

const API_SERVER_BASE_URL = 'http://test.com';

describe('TelemetryService', () => {
  let service: TelemetryService;
  let httpTestingController: HttpTestingController;

  beforeEach(() => {
    spyOn(URLUtil, 'getApiServerBaseUrl').and.returnValue(API_SERVER_BASE_URL);
    spyOn(RuntimeConfigUtil, 'getRuntimeConfig').and.returnValue({
      backendUrl: 'http://test.com',
      telemetry: true,
    });
    initTestBed();
    TestBed.configureTestingModule({
      imports: [HttpClientTestingModule],
      providers: [TelemetryService],
    });
    service = TestBed.inject(TelemetryService);
    httpTestingController = TestBed.inject(HttpTestingController);
  });

  afterEach(() => {
    httpTestingController.verify();
  });

  it('should load initial status from runtimeConfig', () => {
    expect(service.telemetryStatus()).toBe(true);
    expect(service.telemetryEnabled()).toBe(true);
  });

  it('should fetch data from API', async () => {
    const promise = service.fetchTelemetryStatus();

    const req = httpTestingController.expectOne(
        `${API_SERVER_BASE_URL}/api/config/telemetry`);
    expect(req.request.method).toBe('GET');
    req.flush({telemetry: false});

    const status = await promise;
    expect(status).toBe(false);
    expect(service.telemetryStatus()).toBe(false);
    expect(service.telemetryEnabled()).toBe(false);
  });

  it('should save data to API', async () => {
    const promise = service.setTelemetry(true);

    const req = httpTestingController.expectOne(
        `${API_SERVER_BASE_URL}/api/config/telemetry`);
    expect(req.request.method).toBe('POST');
    expect(req.request.headers.get('X-ADK-Telemetry-Request')).toBe('true');
    expect(req.request.body).toEqual({telemetry: true});
    req.flush({telemetry: true});

    await promise;
    expect(service.telemetryStatus()).toBe(true);
  });

  it('should rollback telemetry status on API failure', async () => {
    service.telemetryStatus.set(false);

    const promise = service.setTelemetry(true);
    expect(service.telemetryStatus()).toBe(true);

    const req = httpTestingController.expectOne(
        `${API_SERVER_BASE_URL}/api/config/telemetry`);
    expect(req.request.method).toBe('POST');
    req.error(new ProgressEvent('Network error'));

    await promise;
    expect(service.telemetryStatus()).toBe(false);
  });
});
