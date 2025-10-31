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
 * Default English messages for SidePanelComponent.
 */
export const SIDE_PANEL_MESSAGES = {
  agentDevelopmentKitLabel: 'Agent Development Kit',
  collapsePanelTooltip: 'Collapse panel',
  traceTabLabel: 'Trace',
  eventsTabLabel: 'Events',
  stateTabLabel: 'State',
  artifactsTabLabel: 'Artifacts',
  sessionsTabLabel: 'Sessions',
  evalTabLabel: 'Eval',
  selectEventAriaLabel: 'Select event',
  eventDetailsTabLabel: 'Event',
  requestDetailsTabLabel: 'Request',
  responseDetailsTabLabel: 'Response',
  responseIsNotAvailable: 'Response is not available',
  requestIsNotAvailable: 'Request is not available',
};

/**
 * Interface for human-readable messages displayed in the SidePanelComponent.
 */
export type SidePanelMessages = typeof SIDE_PANEL_MESSAGES;

/**
 * Injection token for SidePanelComponent messages.
 */
export const SidePanelMessagesInjectionToken =
    new InjectionToken<SidePanelMessages>('Side Panel Messages', {
      factory: () => SIDE_PANEL_MESSAGES,
    });
