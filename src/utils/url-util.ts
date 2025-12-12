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

import {env} from '../env/env';

export class URLUtil {
  /**
   * Get the app base URL as defined by the document <base> tag (or origin).
   * This avoids hard coded paths so OAuth redirect URIs always match the
   * actual deployment location.
   */
  static getBaseUrlWithoutPath(): string {
    const baseElement = document.querySelector('base');
    if (baseElement?.href) {
      return baseElement.href;
    }

    const urlObject = new URL(window.location.href);
    return `${urlObject.origin}/`;
  }

  /**
   * Get the base URL without any path
   * @returns {string} Base URL (protocol + hostname + port)
   */
  static getApiServerBaseUrl(): string {
    return (window as any)['runtimeConfig']?.backendUrl || '';
  }

  static getWSServerUrl(): string {
    let url = URLUtil.getApiServerBaseUrl();
    // For adk web, when the api server is not set, use the current host
    if (!url || url == '') {
      return window.location.host;
    }

    // For local development, api server address is passed in runtime_config
    if (url.startsWith('http://')) {
      return url.slice('http://'.length);
    } else if (url.startsWith('https://')) {
      return url.slice('https://'.length);
    } else {
      return url;
    }
  }
}
