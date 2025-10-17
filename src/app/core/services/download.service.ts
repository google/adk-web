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
import {Injectable, inject} from '@angular/core';
import {DownloadService as DownloadServiceInterface} from './interfaces/download';
import {SAFE_VALUES_SERVICE} from './interfaces/safevalues';

@Injectable({
  providedIn: 'root',
})
export class DownloadService implements DownloadServiceInterface {
  private readonly safeValuesService = inject(SAFE_VALUES_SERVICE);

  downloadBase64Data(data: string, mimeType: string, fileName = 'image.png') {
    try {
      const a = document.createElement('a');
      this.safeValuesService.setAnchorHref(a, data);
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

    const url = this.safeValuesService.createObjectUrl(blob);

    const a = document.createElement('a');
    this.safeValuesService.setAnchorHref(a, url);
    a.download = filename;

    document.body.appendChild(a);

    a.click();

    document.body.removeChild(a);
    URL.revokeObjectURL(url.toString());
  }
}
