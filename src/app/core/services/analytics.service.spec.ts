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

import { TestBed } from '@angular/core/testing';
import { signal } from '@angular/core';
import { AnalyticsService, DEFAULT_GA_MEASUREMENT_ID } from './analytics.service';
import { TelemetryService } from './telemetry.service';

describe('AnalyticsService', () => {
  let service: AnalyticsService;
  let mockTelemetryService: {
    telemetryEnabled: ReturnType<typeof signal<boolean>>;
  };

  beforeEach(() => {
    mockTelemetryService = {
      telemetryEnabled: signal(false),
    };

    TestBed.configureTestingModule({
      providers: [
        AnalyticsService,
        { provide: TelemetryService, useValue: mockTelemetryService },
      ],
    });

    // Mock window.gtag
    window.gtag = jasmine.createSpy('gtag');

    service = TestBed.inject(AnalyticsService);
    (service as any).measurementId = 'G-TEST123456';
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });

  it('should NOT send events when telemetry consent is false', () => {
    mockTelemetryService.telemetryEnabled.set(false);
    service.sendEvent('test_event');
    expect(window.gtag).not.toHaveBeenCalled();
  });

  it('should NOT set user properties when telemetry consent is false', () => {
    mockTelemetryService.telemetryEnabled.set(false);
    service.setUserProperties({ adk_version: '1.0.0' });
    expect(window.gtag).not.toHaveBeenCalled();
  });

  it('should send events when telemetry consent is true', () => {
    mockTelemetryService.telemetryEnabled.set(true);
    service.sendEvent('chat_session_create');
    expect(window.gtag).toHaveBeenCalledWith('event', 'chat_session_create');
  });

  it('should set user properties when telemetry consent is true', () => {
    mockTelemetryService.telemetryEnabled.set(true);
    service.setUserProperties({ adk_version: '1.0.0', adk_language: 'Python' });
    expect(window.gtag).toHaveBeenCalledWith('set', 'user_properties', {
      adk_version: '1.0.0',
      adk_language: 'Python',
    });
  });

  it('should disable analytics when telemetry consent becomes false', () => {
    mockTelemetryService.telemetryEnabled.set(false);
    TestBed.flushEffects();
    expect(window['ga-disable-G-TEST123456']).toBeTrue();
  });
});
