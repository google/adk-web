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

import {Injectable, InjectionToken} from '@angular/core';
import {objectUrlFromSafeSource} from 'safevalues/dom';
import {setAnchorHref} from 'safevalues/dom';

export const DOWNLOAD_SERVICE = new InjectionToken<DownloadService>('DownloadService');

@Injectable({
  providedIn: 'root',
})
export class DownloadService {
  downloadBase64Data(data: string, mimeType: string, fileName = 'image.png') {
    try {
      const a = document.createElement('a');
      a.href = data;
      a.download = fileName;

      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
    } catch (error) {
      console.error('Error downloading base64 data:', error);
      throw error;
    }
  }

  downloadObjectAsJson(data: object, filename = 'session.json'): void {
    const jsonString = JSON.stringify(data, null, 2);

    const blob = new Blob([jsonString], {type: 'application/octet-stream'});

    const url = objectUrlFromSafeSource(blob);

    const a = document.createElement('a');
    setAnchorHref(a, url);
    a.download = filename;

    document.body.appendChild(a);

    a.click();

    document.body.removeChild(a);
    URL.revokeObjectURL(url.toString());
  }
}
