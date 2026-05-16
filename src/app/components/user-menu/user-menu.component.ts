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

import {Component, inject} from '@angular/core';
import {MatIconButton} from '@angular/material/button';
import {MatIcon} from '@angular/material/icon';
import {MatMenuModule} from '@angular/material/menu';
import {MatTooltip} from '@angular/material/tooltip';

import {AuthService, UserInfo} from '../../core/auth/auth.service';

/**
 * User menu component for authenticated sessions.
 *
 * When OIDC auth is enabled, displays the authenticated user's name
 * and provides a logout button. When auth is disabled, this component
 * renders nothing -- the existing user ID editor in the chat toolbar
 * remains visible instead.
 *
 * Designed to integrate with Kagenti-managed deployments where
 * Keycloak provides OIDC authentication.
 */
@Component({
  selector: 'app-auth-user-menu',
  standalone: true,
  imports: [MatIconButton, MatIcon, MatMenuModule, MatTooltip],
  template: `
    @if (authService.isEnabled && authService.isAuthenticated()) {
      <button
        mat-icon-button
        class="toolbar-icon-button user-avatar-button"
        [matMenuTriggerFor]="authUserMenu"
        [matTooltip]="userInfo?.name || 'User'"
        aria-label="Authenticated user menu"
      >
        <mat-icon>verified_user</mat-icon>
      </button>
      <mat-menu #authUserMenu="matMenu" xPosition="before" panelClass="user-avatar-menu">
        <div class="auth-user-menu-panel" (click)="$event.stopPropagation()">
          <div class="auth-user-header">
            <mat-icon class="auth-user-icon">account_circle</mat-icon>
            <div class="auth-user-info">
              <span class="auth-user-name">{{ userInfo?.name }}</span>
              <span class="auth-user-email">{{ userInfo?.email }}</span>
            </div>
          </div>
          @if (userInfo?.roles?.length) {
            <div class="auth-user-roles">
              @for (role of userInfo?.roles; track role) {
                <span class="auth-role-chip">{{ role }}</span>
              }
            </div>
          }
          <div class="auth-user-actions">
            <button mat-icon-button (click)="logout()" matTooltip="Sign out" aria-label="Sign out">
              <mat-icon>logout</mat-icon>
            </button>
          </div>
        </div>
      </mat-menu>
    }
  `,
  styles: [`
    .auth-user-menu-panel {
      padding: 16px;
      min-width: 240px;
    }
    .auth-user-header {
      display: flex;
      align-items: center;
      gap: 12px;
      margin-bottom: 12px;
    }
    .auth-user-icon {
      font-size: 40px;
      width: 40px;
      height: 40px;
      color: var(--mat-sys-primary);
    }
    .auth-user-info {
      display: flex;
      flex-direction: column;
    }
    .auth-user-name {
      font-weight: 500;
      font-size: 14px;
      color: var(--mat-sys-on-surface);
    }
    .auth-user-email {
      font-size: 12px;
      color: var(--mat-sys-on-surface-variant);
    }
    .auth-user-roles {
      display: flex;
      flex-wrap: wrap;
      gap: 4px;
      margin-bottom: 12px;
      padding-top: 8px;
      border-top: 1px solid var(--mat-sys-outline-variant);
    }
    .auth-role-chip {
      font-size: 11px;
      padding: 2px 8px;
      border-radius: 12px;
      background: var(--mat-sys-surface-container-high);
      color: var(--mat-sys-on-surface-variant);
    }
    .auth-user-actions {
      display: flex;
      justify-content: flex-end;
      padding-top: 8px;
      border-top: 1px solid var(--mat-sys-outline-variant);
    }
  `],
})
export class AuthUserMenuComponent {
  protected readonly authService = inject(AuthService);

  get userInfo(): UserInfo | null {
    return this.authService.getUserInfo();
  }

  async logout(): Promise<void> {
    await this.authService.logout();
  }
}
