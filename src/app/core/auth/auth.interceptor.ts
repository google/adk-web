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
import {HttpEvent, HttpHandler, HttpInterceptor, HttpRequest} from '@angular/common/http';
import {Observable, from, switchMap} from 'rxjs';

import {AuthService} from './auth.service';

/**
 * HTTP interceptor that attaches OIDC Bearer tokens to outgoing API
 * requests when authentication is enabled.
 *
 * When auth is disabled, requests pass through unmodified. When
 * enabled, each request to the backend receives an
 * `Authorization: Bearer <token>` header. This token is validated
 * by Kagenti's Envoy AuthBridge sidecar before reaching the agent.
 */
@Injectable()
export class AuthInterceptor implements HttpInterceptor {
  constructor(private authService: AuthService) {}

  intercept(
      req: HttpRequest<unknown>,
      next: HttpHandler): Observable<HttpEvent<unknown>> {
    if (!this.authService.isEnabled) {
      return next.handle(req);
    }

    return from(this.authService.getToken()).pipe(
        switchMap((token) => {
          if (token) {
            const authReq = req.clone({
              setHeaders: {Authorization: `Bearer ${token}`},
            });
            return next.handle(authReq);
          }
          return next.handle(req);
        }),
    );
  }
}
