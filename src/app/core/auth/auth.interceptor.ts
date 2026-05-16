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
import {HttpInterceptorFn, HttpRequest, HttpHandlerFn, HttpEvent} from '@angular/common/http';
import {Observable, from, switchMap, throwError} from 'rxjs';

import {AuthService} from './auth.service';

/**
 * Functional HTTP interceptor that attaches OIDC Bearer tokens to
 * outgoing API requests when authentication is enabled.
 *
 * When auth is disabled, requests pass through unmodified. When
 * enabled, each request receives an `Authorization: Bearer <token>`
 * header. Fails closed: if auth is enabled but no token is available,
 * the request is rejected rather than sent without credentials.
 */
export const authInterceptorFn: HttpInterceptorFn = (
  req: HttpRequest<unknown>,
  next: HttpHandlerFn,
): Observable<HttpEvent<unknown>> => {
  const authService = inject(AuthService);

  if (!authService.isEnabled) {
    return next(req);
  }

  return from(authService.getToken()).pipe(
    switchMap((token) => {
      if (token) {
        const authReq = req.clone({
          setHeaders: {Authorization: `Bearer ${token}`},
        });
        return next(authReq);
      }
      return throwError(
        () => new Error('Auth is enabled but no token is available'),
      );
    }),
  );
};
