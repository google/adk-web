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
import {SafeHtml} from '@angular/platform-browser';

export const SAFE_VALUES_SERVICE = new InjectionToken<SafeValuesService>(
  'SafeValuesService',
);

/**
 * Service to provide safe values for DOM manipulation.
 */
export abstract class SafeValuesService {
  abstract windowOpen(window: Window,
    url: string,
    target?: string,
    features?: string
  ): Window | null;

  abstract createObjectUrl(blob: Blob): string;

  abstract openBlobUrl(blob: Blob): Window | null;

  abstract setAnchorHref(a: HTMLAnchorElement, url: string): void;

  abstract bypassSecurityTrustHtml(value: string): SafeHtml;

  openBase64InNewTab(dataUrl: string, mimeType: string) {
    try {
      if (!dataUrl) {
        return;
      }

      let base64DataString = dataUrl;

      if (dataUrl.startsWith('data:') && dataUrl.includes(';base64,')) {
        base64DataString = base64DataString.substring(
            base64DataString.indexOf(';base64,') + ';base64,'.length);
      }

      if (!mimeType || !base64DataString) {
        return;
      }

      const byteCharacters = atob(base64DataString);
      const byteNumbers = new Array(byteCharacters.length);
      for (let i = 0; i < byteCharacters.length; i++) {
        byteNumbers[i] = byteCharacters.charCodeAt(i);
      }
      const byteArray = new Uint8Array(byteNumbers);

      const blob = new Blob([byteArray], {type: mimeType});

      const newWindow = this.openBlobUrl(blob);
      if (newWindow) {
        newWindow.focus();
      } else {
        alert(
            'Pop-up blocked! Please allow pop-ups for this site to open the data in a new tab.');
      }
    } catch (e) {
      alert(
          'Could not open the data. It might be invalid or too large. Check the browser console for errors.');
    }
  }
}
