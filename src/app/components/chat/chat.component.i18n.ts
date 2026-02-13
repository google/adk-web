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
 * Default English messages for ChatComponent.
 */
export const CHAT_MESSAGES = {
  openPanelTooltip: 'Open panel',
  evalCaseIdLabel: 'Eval Case ID',
  cancelButton: 'Cancel',
  saveButton: 'Save',
  editEvalCaseTooltip: 'Edit current eval case',
  deleteEvalCaseTooltip: 'Delete current eval case',
  sessionIdLabel: 'Session ID',
  userIdLabel: 'User ID',
  loadingSessionLabel: 'Loading session...',
  tokenStreamingLabel: 'Token Streaming',
  liveLabel: 'SSE / Live',
  createNewSessionTooltip: 'Create a new Session',
  newSessionButton: 'New Session',
  deleteSessionTooltip: 'Delete current session',
  exportSessionTooltip: 'Export current session',
  importSessionTooltip: 'Import session',
  loadingAgentsLabel: 'Loading agents, please wait...',
  welcomeMessage: 'Welcome to ADK!',
  selectAgentMessage: 'Select an agent on the left to begin with.',
  failedToLoadAgentsMessage: 'Failed to load agents. To get started, run',
  errorMessageLabel: 'Error message:',
  noAgentsFoundWarning: 'Warning: No agents found in current folder.',
  cannotEditSessionMessage:
      'Chat is disabled to prevent changes to the end user\'s session.',
  readOnlyBadgeLabel: 'Read-only',
  disclosureTooltip:
      'ADK Web is for development purposes. It has access to all the data and should not be used in production.',
  adkWebDeveloperUiMessage: 'ADK Web Developer UI',
};

/**
 * Interface for human-readable messages displayed in the ChatComponent.
 */
export type ChatMessages = typeof CHAT_MESSAGES;

/**
 * Injection token for ChatComponent messages.
 */
export const ChatMessagesInjectionToken =
    new InjectionToken<ChatMessages>('Chat Messages', {
      factory: () => CHAT_MESSAGES,
    });
