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
import {SafeHtml, SafeUrl} from '@angular/platform-browser';

export const SAFE_VALUES_SERVICE = new InjectionToken<SafeValuesService>(
  'SafeValuesService',
);

/**
 * Needed for 1p JS compiler. A declared interface is needed here because
 * abstract classes with implementations can't be declared.
*/
declare interface SafeValuesServiceInterface {
  windowOpen(window: Window,
    url: string,
    target?: string,
    features?: string
  ): Window | null;
  createObjectUrl(blob: Blob): string;
  openBlobUrl(blob: Blob): Window | null;
  setAnchorHref(a: HTMLAnchorElement, url: string): void;
  bypassSecurityTrustHtml(value: string): SafeHtml;
  bypassSecurityTrustUrl(url: string): SafeUrl;
  openBase64InNewTab(dataUrl: string, mimeType: string): void;
}

/**
 * MIME types a browser parses into a scriptable document.
 *
 * A blob URL inherits the origin of the page that created it, so opening one
 * of these in a tab executes the content with the app's origin and a live
 * `window.opener` handle back into the session. Artifact bytes are untrusted --
 * an agent, a tool, or an upload produced them -- so these are handed to the
 * browser as opaque data rather than as a document.
 */
const SCRIPTABLE_DOCUMENT_TYPES: ReadonlySet<string> = new Set([
  'text/html',
  'application/xhtml+xml',
  'image/svg+xml',
  'text/xml',
  'application/xml',
]);

const OPAQUE_TYPE = 'application/octet-stream';

/**
 * The blob type to use for `mimeType`, downgraded to an opaque type when the
 * browser would otherwise parse it as a scriptable document. Parameters
 * (`text/html; charset=utf-8`) are stripped before comparing.
 */
function blobTypeFor(mimeType: string): string {
  const essence = mimeType.split(';')[0].trim().toLowerCase();
  return SCRIPTABLE_DOCUMENT_TYPES.has(essence) ? OPAQUE_TYPE : mimeType;
}

/**
 * Service to provide safe values for DOM manipulation.
 */
export abstract class SafeValuesService implements SafeValuesServiceInterface {
  abstract windowOpen(window: Window,
    url: string,
    target?: string,
    features?: string
  ): Window | null;

  abstract createObjectUrl(blob: Blob): string;

  abstract openBlobUrl(blob: Blob): Window | null;

  abstract setAnchorHref(a: HTMLAnchorElement, url: string): void;

  abstract bypassSecurityTrustHtml(value: string): SafeHtml;

  abstract bypassSecurityTrustUrl(url: string): SafeUrl;

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

      const blob = new Blob([byteArray], {type: blobTypeFor(mimeType)});

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
