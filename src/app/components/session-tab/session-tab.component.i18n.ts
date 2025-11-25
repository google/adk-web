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

import {InjectionToken} from '@angular/core';

/**
 * Default English messages for SessionTabComponent.
 */
export const SESSION_TAB_MESSAGES = {
  noSessionsFound: 'No sessions found',
  readonlyChip: 'Read-only',
  filterSessionsLabel: 'Search using session ID',
};


/**
 * Interface for human-readable messages displayed in the SessionTabComponent.
 */
export type SessionTabMessages = typeof SESSION_TAB_MESSAGES;

/**
 * Injection token for SessionTabComponent messages.
 */
export const SessionTabMessagesInjectionToken =
    new InjectionToken<SessionTabMessages>('Session Tab Messages', {
      factory: () => SESSION_TAB_MESSAGES,
    });
