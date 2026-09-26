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
// 1p-ONLY-IMPORTS: import {afterEach, beforeEach, describe, expect, it}

import {URLUtil} from './url-util';

function fakeLocation(href: string) {
  const url = new URL(href);
  return {
    href: url.href,
    origin: url.origin,
    pathname: url.pathname,
    host: url.host,
  };
}

describe('URLUtil', () => {
  afterEach(() => {
    delete (window as any)['runtimeConfig'];
  });

  describe('unprefixed deployment (plain `adk web`)', () => {
    const location = fakeLocation('http://localhost:8080/dev-ui/session/abc');

    it('getBaseUrlWithoutPath returns the server root + dev-ui', () => {
      expect(URLUtil.getBaseUrlWithoutPath(location))
          .toBe('http://localhost:8080/dev-ui/');
    });

    it('getApiServerBaseUrl falls back to same-origin (relative) when unset',
       () => {
         expect(URLUtil.getApiServerBaseUrl(location)).toBe('');
       });

    it('getWSServerUrl falls back to the current host when unset', () => {
      expect(URLUtil.getWSServerUrl(location)).toBe('localhost:8080');
    });
  });

  describe('deployed behind a path-prefixing reverse proxy', () => {
    const location = fakeLocation(
        'https://wap.example.com/agents/my-agent/dev-ui/session/abc');

    it('getBaseUrlWithoutPath preserves the proxy prefix', () => {
      expect(URLUtil.getBaseUrlWithoutPath(location))
          .toBe('https://wap.example.com/agents/my-agent/dev-ui/');
    });

    it('getApiServerBaseUrl defaults to same-origin + the proxy prefix ' +
           'when runtime-config.json was not customized for this deployment',
       () => {
         expect(URLUtil.getApiServerBaseUrl(location))
             .toBe('https://wap.example.com/agents/my-agent');
       });

    it('getWSServerUrl strips the scheme off the inferred prefix', () => {
      expect(URLUtil.getWSServerUrl(location))
          .toBe('wap.example.com/agents/my-agent');
    });

    it('an explicit runtimeConfig.backendUrl still takes precedence', () => {
      (window as any)['runtimeConfig'] = {
        backendUrl: 'https://api.example.com',
      };
      expect(URLUtil.getApiServerBaseUrl(location))
          .toBe('https://api.example.com');
    });
  });
});
