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

import {inject} from '@angular/core';
import {CanActivateFn} from '@angular/router';

import {AuthService} from './auth.service';

/**
 * Route guard that protects routes when OIDC authentication is enabled.
 *
 * When auth is disabled (default), the guard always returns true.
 * When auth is enabled and the user is not authenticated, the guard
 * triggers the OIDC login redirect. APP_INITIALIZER handles initial
 * authentication; this guard is a safety net for late navigation.
 */
export const authGuard: CanActivateFn = () => {
  const authService = inject(AuthService);

  if (!authService.isEnabled) {
    return true;
  }

  if (authService.isAuthenticated()) {
    return true;
  }

  authService.login();
  return false;
};
