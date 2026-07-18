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

import { inject, Injectable, effect } from '@angular/core';
import { TelemetryService } from './telemetry.service';

declare global {
  interface Window {
    gtag?: (...args: any[]) => void;
    dataLayer?: any[];
    [key: string]: any;
  }
}

// TODO: Replace with production GA4 Measurement ID
export const DEFAULT_GA_MEASUREMENT_ID = '';

@Injectable({
  providedIn: 'root',
})
export class AnalyticsService {
  private readonly telemetryService = inject(TelemetryService);
  private isGaInitialized = false;
  private readonly measurementId = DEFAULT_GA_MEASUREMENT_ID;

  constructor() {
    effect(() => {
      const enabled = this.telemetryService.telemetryEnabled();
      if (enabled) {
        this.enableAnalytics();
      } else {
        this.disableAnalytics();
      }
    });
  }

  /**
   * Initializes GA4 gtag script if telemetry consent is granted.
   */
  private enableAnalytics(): void {
    if (typeof window === 'undefined' || !this.measurementId) return;

    // Enable GA4 tracking
    (window as any)[`ga-disable-${this.measurementId}`] = false;

    if (!this.isGaInitialized) {
      window.dataLayer = window.dataLayer || [];
      window.gtag = window.gtag || function () {
        window.dataLayer?.push(arguments);
      };

      // Load GA4 script
      const script = document.createElement('script');
      script.async = true;
      script.src = `https://www.googletagmanager.com/gtag/js?id=${this.measurementId}`;
      document.head.appendChild(script);

      window.gtag('js', new Date());
      window.gtag('config', this.measurementId);
      this.isGaInitialized = true;
    }
  }

  /**
   * Disables GA4 analytics tracking.
   */
  private disableAnalytics(): void {
    if (typeof window !== 'undefined' && this.measurementId) {
      (window as any)[`ga-disable-${this.measurementId}`] = true;
    }
  }

  /**
   * Sets GA4 User Properties (e.g. adk_version, adk_language).
   */
  setUserProperties(properties: Record<string, any>): void {
    if (!this.telemetryService.telemetryEnabled() || !this.measurementId) return;
    if (typeof window !== 'undefined' && window.gtag) {
      window.gtag('set', 'user_properties', properties);
    }
  }

  /**
   * Sends a standalone custom event without extra parameters.
   */
  sendEvent(eventName: string): void {
    if (!this.telemetryService.telemetryEnabled() || !this.measurementId) return;
    if (typeof window !== 'undefined' && window.gtag) {
      window.gtag('event', eventName);
    }
  }
}
