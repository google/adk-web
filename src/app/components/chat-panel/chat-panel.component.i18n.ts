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
 * Default English messages for ChatPanelComponent.
 */
export const CHAT_PANEL_MESSAGES = {
  cancelEditingTooltip: 'Cancel editing',
  saveEvalMessageTooltip: 'Save eval case message',
  thoughtChipLabel: 'Thought',
  outcomeLabel: 'Outcome',
  outputLabel: 'Output',
  actualToolUsesLabel: 'Actual tool uses:',
  expectedToolUsesLabel: 'Expected tool uses:',
  actualResponseLabel: 'Actual response:',
  expectedResponseLabel: 'Expected response:',
  matchScoreLabel: 'Match score',
  thresholdLabel: 'Threshold',
  evalPassLabel: 'Pass',
  evalFailLabel: 'Fail',
  editEvalMessageTooltip: 'Edit eval case message',
  deleteEvalMessageTooltip: 'Delete eval case message',
  editFunctionArgsTooltip: 'Edit function arguments',
  typeMessagePlaceholder: 'Type a Message...',
  uploadFileTooltip: 'Upload local file',
  moreOptionsTooltip: 'More options',
  updateStateMenuLabel: 'Update state',
  updateStateMenuTooltip: 'Update the session state',
  turnOffMicTooltip: 'Turn off microphone',
  useMicTooltip: 'Use microphone',
  turnOffCamTooltip: 'Turn off camera',
  useCamTooltip: 'Use camera',
  updatedSessionStateChipLabel: 'Updated session state',
};


/**
 * Interface for human-readable messages displayed in the ChatPanelComponent.
 */
export type ChatPanelMessages = typeof CHAT_PANEL_MESSAGES;

/**
 * Injection token for ChatPanelComponent messages.
 */
export const ChatPanelMessagesInjectionToken =
    new InjectionToken<ChatPanelMessages>('Chat Panel Messages', {
      factory: () => CHAT_PANEL_MESSAGES,
    });
