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

/** The subset of `Location` these helpers depend on, for testability. */
type LocationLike = Pick<Location, 'href'|'origin'|'pathname'|'host'>;

export class URLUtil {
  /**
   * Get the path this app is mounted under, e.g. "/" for a plain `adk web`
   * deployment or "/agents/my-agent/" when served behind a path-prefixing
   * reverse proxy that forwards ".../agents/my-agent/dev-ui" through
   * unmodified. Derived from the current location rather than assumed,
   * since the app has no other way to learn a proxy prefix stripped
   * upstream of it.
   */
  private static getAppRootPath(location: LocationLike): string {
    const path = location.pathname;
    const devUiIndex = path.indexOf('/dev-ui');
    if (devUiIndex < 0) {
      return '/';
    }
    return path.slice(0, devUiIndex) + '/';
  }

  /**
   * Get the base URL without any path
   * @returns {string} Base URL (protocol + hostname + port)
   */
  static getBaseUrlWithoutPath(location: LocationLike = window.location):
      string {
    // Use the URL constructor for robust URL parsing
    const urlObject = new URL(location.href);

    // Construct base URL using origin property
    // Origin includes protocol, hostname, and port
    return urlObject.origin + URLUtil.getAppRootPath(location) + 'dev-ui/';
  }

  /**
   * Get the base URL without any path
   * @returns {string} Base URL (protocol + hostname + port)
   */
  static getApiServerBaseUrl(location: LocationLike = window.location):
      string {
    const configured = (window as any)['runtimeConfig']?.backendUrl;
    if (configured) {
      return configured;
    }
    // No explicit backendUrl configured (runtime-config.json wasn't
    // customized for this deployment). Fall back to same-origin, but
    // preserve any prefix this app is itself mounted under so API calls
    // still reach a reverse proxy that forwards that prefix through
    // unmodified — rather than always assuming the API lives at the
    // server root.
    const root = URLUtil.getAppRootPath(location);
    return root === '/' ? '' : location.origin + root.slice(0, -1);
  }

  static getWSServerUrl(location: LocationLike = window.location): string {
    let url = URLUtil.getApiServerBaseUrl(location);
    // For adk web, when the api server is not set, use the current host
    if (!url || url == '') {
      return location.host;
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
