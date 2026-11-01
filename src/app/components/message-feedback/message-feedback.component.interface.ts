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

import {InjectionToken, InputSignal, Type} from '@angular/core';

/**
 * Represents a component to be used to collect feedback on a message, in place
 * of the built-in one. Feedback UX varies by product, and an embedder already
 * supplies the feedback backend through `FEEDBACK_SERVICE`.
 */
export const MESSAGE_FEEDBACK_COMPONENT =
    new InjectionToken<Type<MessageFeedbackComponentInterface>>(
        'MESSAGE_FEEDBACK_COMPONENT',
    );

/**
 * Interface for the message feedback component. The message is identified by
 * the session it belongs to and the event that carries it.
 */
export interface MessageFeedbackComponentInterface {
  sessionName: InputSignal<string>;
  eventId: InputSignal<string>;
}