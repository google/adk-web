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
import Keycloak from 'keycloak-js';

import {AuthConfig} from '../models/RuntimeConfig';
import {resolveAuthConfig} from './auth.config';

export interface UserInfo {
  name: string;
  email: string;
  userId: string;
  roles: string[];
}

/**
 * OIDC authentication service for ADK Web UI.
 *
 * When auth is enabled in runtime-config.json, this service manages
 * the Keycloak/OIDC lifecycle: login, token management, refresh, and
 * logout. When auth is disabled, all methods are no-ops and
 * isAuthenticated() returns true.
 *
 * Designed for enterprise deployments where agents are managed by
 * Kagenti with SPIFFE/SPIRE zero-trust security.
 */
@Injectable({providedIn: 'root'})
export class AuthService {
  private keycloak: Keycloak | null = null;
  private authConfig: AuthConfig | undefined;
  private initialized = false;

  get isEnabled(): boolean {
    return !!this.authConfig?.enabled;
  }

  /**
   * Initialize the auth service. Must be called before the app renders.
   * When auth is disabled, resolves immediately.
   */
  async init(): Promise<void> {
    const config = resolveAuthConfig();
    this.authConfig = config;

    if (!this.authConfig?.enabled) {
      this.initialized = true;
      return;
    }

    this.keycloak = new Keycloak({
      url: this.authConfig.oidcUrl,
      realm: this.authConfig.oidcRealm,
      clientId: this.authConfig.oidcClientId,
    });

    try {
      const authenticated = await this.keycloak.init({
        onLoad: 'login-required',
        checkLoginIframe: false,
        silentCheckSsoRedirectUri:
            this.authConfig.silentRefresh !== false
                ? `${window.location.origin}/silent-check-sso.html`
                : undefined,
      });

      if (!authenticated) {
        await this.keycloak.login();
      }

      // Set up automatic token refresh
      this.keycloak.onTokenExpired = () => {
        this.keycloak?.updateToken(30).catch(() => {
          console.warn('Token refresh failed, redirecting to login');
          this.keycloak?.login();
        });
      };

      this.initialized = true;
    } catch (err) {
      console.error('OIDC initialization failed:', err);
      throw err;
    }
  }

  isAuthenticated(): boolean {
    if (!this.isEnabled) return true;
    return this.keycloak?.authenticated ?? false;
  }

  async getToken(): Promise<string | undefined> {
    if (!this.isEnabled || !this.keycloak) return undefined;

    try {
      await this.keycloak.updateToken(5);
    } catch {
      // Token refresh failed, will be caught by onTokenExpired
    }
    return this.keycloak.token;
  }

  getUserInfo(): UserInfo | null {
    if (!this.isEnabled || !this.keycloak?.tokenParsed) return null;

    const parsed = this.keycloak.tokenParsed;
    return {
      name: (parsed as any)['name'] ??
          (parsed as any)['preferred_username'] ?? 'User',
      email: (parsed as any)['email'] ?? '',
      userId: parsed.sub ?? '',
      roles: (parsed as any)['realm_access']?.['roles'] ?? [],
    };
  }

  async logout(): Promise<void> {
    if (!this.isEnabled || !this.keycloak) return;
    await this.keycloak.logout({redirectUri: window.location.origin});
  }
}
