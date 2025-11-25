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
 * Default English messages for EditJsonDialogComponent.
 */
export const EDIT_JSON_DIALOG_MESSAGES = {
  cancelButton: 'Cancel',
  saveButton: 'Save',
  invalidJsonAlert: 'Invalid JSON: ',
};


/**
 * Interface for human-readable messages displayed in the EditJsonDialogComponent.
 */
export type EditJsonDialogMessages = typeof EDIT_JSON_DIALOG_MESSAGES;

/**
 * Injection token for EditJsonDialogComponent messages.
 */
export const EditJsonDialogMessagesInjectionToken =
    new InjectionToken<EditJsonDialogMessages>('Edit Json Dialog Messages', {
      factory: () => EDIT_JSON_DIALOG_MESSAGES,
    });
