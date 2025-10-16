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

import {Injectable} from '@angular/core';

import {LocalFileService} from './interfaces/localfile';

/**
 * Service to provide methods to handle local files.
 */
@Injectable({
  providedIn: 'root',
})
export class LocalFileServiceImpl implements LocalFileService {
  async createMessagePartFromFile(file: File): Promise<any> {
    return {
      inlineData: {
        displayName: file.name,
        data: await this.readFileAsBytes(file),
        mimeType: file.type,
      },
    };
  }

  private readFileAsBytes(file: File): Promise<ArrayBuffer> {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = (e: any) => {
        const base64Data = e.target.result.split(',')[1];
        resolve(base64Data);
      };
      reader.onerror = reject;
      reader.readAsDataURL(file);  // Read as raw bytes
    });
  }
}
