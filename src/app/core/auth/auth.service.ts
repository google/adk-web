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
import {UserManager, UserManagerSettings, User} from 'oidc-client-ts';

import {AuthConfig} from '../models/RuntimeConfig';
import {resolveAuthConfig} from './auth.config';

export interface UserInfo {
  name: string;
  email: string;
  userId: string;
  roles: string[];
}

export interface OidcUserProfile {
  name?: string;
  preferred_username?: string;
  email?: string;
  realm_access?: {roles?: string[]};
}

/**
 * OIDC authentication service for ADK Web UI.
 *
 * When auth is enabled in runtime-config.json, this service manages
 * the OIDC lifecycle via oidc-client-ts: login, token management,
 * silent refresh, and logout. When auth is disabled, all methods are
 * no-ops and isAuthenticated() returns true.
 *
 * Designed for enterprise deployments where agents are managed by
 * Kagenti with SPIFFE/SPIRE zero-trust security.
 */
@Injectable({providedIn: 'root'})
export class AuthService {
  private userManager: UserManager | null = null;
  private authConfig: AuthConfig | undefined;
  private initialized = false;
  private initPromise: Promise<void> | null = null;
  private currentUser: User | null = null;

  get isEnabled(): boolean {
    return !!this.authConfig?.enabled;
  }

  async init(): Promise<void> {
    if (this.initialized) return;
    if (this.initPromise) return this.initPromise;

    this.initPromise = this.doInit();
    return this.initPromise;
  }

  private async doInit(): Promise<void> {
    const config = resolveAuthConfig();
    this.authConfig = config;

    if (!this.authConfig?.enabled) {
      this.initialized = true;
      return;
    }

    const settings: UserManagerSettings = {
      authority: this.authConfig.authority,
      client_id: this.authConfig.clientId,
      redirect_uri: window.location.origin,
      post_logout_redirect_uri:
        this.authConfig.postLogoutRedirectUri ?? window.location.origin,
      response_type: 'code',
      scope: this.authConfig.scopes ?? 'openid profile email',
      automaticSilentRenew: this.authConfig.silentRefresh !== false,
      silent_redirect_uri:
        window.location.origin + '/silent-check-sso.html',
    };

    this.userManager = new UserManager(settings);

    try {
      if (
        window.location.search.includes('code=') ||
        window.location.hash.includes('code=')
      ) {
        const user = await this.userManager.signinCallback();
        this.currentUser = user as User;
        window.history.replaceState({}, document.title, window.location.pathname);
      }

      if (!this.currentUser) {
        this.currentUser = await this.userManager.getUser();
      }

      if (!this.currentUser || this.currentUser.expired) {
        await this.userManager.signinRedirect();
        return;
      }

      this.initialized = true;

      this.userManager.events.addUserLoaded((user: User) => {
        this.currentUser = user;
      });

      this.userManager.events.addSilentRenewError(() => {
        this.userManager?.signinRedirect();
      });
    } catch (err) {
      console.error('OIDC initialization failed:', err);
      throw err;
    }
  }

  isAuthenticated(): boolean {
    if (!this.isEnabled) return true;
    return this.currentUser != null && !this.currentUser.expired;
  }

  async getToken(): Promise<string> {
    if (!this.isEnabled) return '';

    if (this.currentUser && !this.currentUser.expired) {
      return this.currentUser.access_token;
    }

    try {
      const user = await this.userManager!.signinSilent();
      this.currentUser = user;
      return user!.access_token;
    } catch {
      this.userManager?.signinRedirect();
      throw new Error('Token refresh failed');
    }
  }

  getUserInfo(): UserInfo | null {
    if (!this.isEnabled || !this.currentUser) return null;

    const profile = this.currentUser.profile as OidcUserProfile;
    return {
      name: profile.name ?? profile.preferred_username ?? 'User',
      email: profile.email ?? '',
      userId: this.currentUser.profile.sub ?? '',
      roles: profile.realm_access?.roles ?? [],
    };
  }

  async login(): Promise<void> {
    await this.userManager?.signinRedirect();
  }

  async logout(): Promise<void> {
    if (!this.isEnabled || !this.userManager) return;
    await this.userManager.signoutRedirect({
      post_logout_redirect_uri:
        this.authConfig?.postLogoutRedirectUri ?? window.location.origin,
    });
  }
}
