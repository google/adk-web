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
 * Default English messages for StateTabComponent.
 */
export const STATE_TAB_MESSAGES = {
  stateIsEmpty: 'State is empty',
};


/**
 * Interface for human-readable messages displayed in the StateTabComponent.
 */
export type StateTabMessages = typeof STATE_TAB_MESSAGES;

/**
 * Injection token for StateTabComponent messages.
 */
export const StateTabMessagesInjectionToken =
    new InjectionToken<StateTabMessages>('State Tab Messages', {
      factory: () => STATE_TAB_MESSAGES,
    });
