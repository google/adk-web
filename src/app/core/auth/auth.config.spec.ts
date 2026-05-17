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

// 1p-ONLY-IMPORTS: import {afterEach, beforeEach, describe, expect, it}

import {AuthConfig} from '../models/RuntimeConfig';
import {RuntimeConfigUtil} from '../../../utils/runtime-config-util';
import {resolveAuthConfig} from './auth.config';

const VALID_AUTH_CONFIG: AuthConfig = {
  enabled: true,
  authority: 'https://keycloak.example.com/realms/test',
  clientId: 'adk-web',
};

describe('resolveAuthConfig', () => {
  let originalAdkConfig: any;
  let getRuntimeConfigSpy: jasmine.Spy;

  beforeEach(() => {
    originalAdkConfig = (window as any)['__ADK_CONFIG__'];
    delete (window as any)['__ADK_CONFIG__'];
    getRuntimeConfigSpy =
        spyOn(RuntimeConfigUtil, 'getRuntimeConfig').and.returnValue(
            undefined as any);
  });

  afterEach(() => {
    if (originalAdkConfig !== undefined) {
      (window as any)['__ADK_CONFIG__'] = originalAdkConfig;
    } else {
      delete (window as any)['__ADK_CONFIG__'];
    }
  });

  it('returns undefined when no config is available', () => {
    expect(resolveAuthConfig()).toBeUndefined();
  });

  it('returns auth from __ADK_CONFIG__ when set with enabled=true', () => {
    (window as any)['__ADK_CONFIG__'] = {auth: VALID_AUTH_CONFIG};

    const result = resolveAuthConfig();

    expect(result).toEqual(VALID_AUTH_CONFIG);
  });

  it('falls through __ADK_CONFIG__ when auth.enabled is false', () => {
    const runtimeAuth: AuthConfig = {
      enabled: true,
      authority: 'https://runtime.example.com/realms/test',
      clientId: 'runtime-client',
    };
    (window as any)['__ADK_CONFIG__'] = {
      auth: {enabled: false, authority: '', clientId: ''},
    };
    getRuntimeConfigSpy.and.returnValue({
      backendUrl: '',
      auth: runtimeAuth,
    });

    const result = resolveAuthConfig();

    expect(result).toEqual(runtimeAuth);
  });

  it('returns auth from runtime config when __ADK_CONFIG__ is absent', () => {
    const runtimeAuth: AuthConfig = {
      enabled: true,
      authority: 'https://okta.example.com',
      clientId: 'okta-client',
    };
    getRuntimeConfigSpy.and.returnValue({
      backendUrl: 'http://localhost:8080',
      auth: runtimeAuth,
    });

    const result = resolveAuthConfig();

    expect(result).toEqual(runtimeAuth);
  });

  it('__ADK_CONFIG__ takes priority over runtime config', () => {
    const adkAuth: AuthConfig = {
      enabled: true,
      authority: 'https://adk.example.com',
      clientId: 'adk-client',
    };
    const runtimeAuth: AuthConfig = {
      enabled: true,
      authority: 'https://runtime.example.com',
      clientId: 'runtime-client',
    };
    (window as any)['__ADK_CONFIG__'] = {auth: adkAuth};
    getRuntimeConfigSpy.and.returnValue({
      backendUrl: '',
      auth: runtimeAuth,
    });

    const result = resolveAuthConfig();

    expect(result).toEqual(adkAuth);
  });

  it('returns undefined when runtime config has no auth', () => {
    getRuntimeConfigSpy.and.returnValue({
      backendUrl: 'http://localhost:8080',
    });

    expect(resolveAuthConfig()).toBeUndefined();
  });
});
