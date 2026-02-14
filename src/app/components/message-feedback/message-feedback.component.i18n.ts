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
 * Default English messages for MessageFeedbackComponent.
 */
export const MESSAGE_FEEDBACK_MESSAGES = {
  goodResponseTooltip: 'Good response',
  badResponseTooltip: 'Bad response',
  feedbackAdditionalLabel: 'Additional feedback (Optional)',
  feedbackCommentPlaceholderDown: 'Share what could be improved in the response',
  feedbackCommentPlaceholderUp: 'Share what you liked about the response',
  feedbackCancelButton: 'Cancel',
  feedbackSubmitButton: 'Submit',
  feedbackDialogTitle: 'Reasons for feedback (Select all that apply)',
  feedbackReasonHallucination: 'Hallucinated libraries / APIs etc',
  feedbackReasonIncomplete: 'Incomplete answer',
  feedbackReasonFollowup: 'Didn\'t understand followup',
  feedbackReasonFactual: 'Factual errors',
  feedbackReasonLinks: 'Broken/incorrect links',
  feedbackReasonIrrelevant: 'Irrelevant information',
  feedbackReasonRepetitive: 'Repetitive',
  feedbackReasonAccurate: 'Accurate info',
  feedbackReasonHelpful: 'Helpful',
  feedbackReasonConcise: 'Concise',
  feedbackReasonUnderstanding: 'Good understanding',
  feedbackReasonClear: 'Clear and easy to follow',
};

/**
 * Interface for human-readable messages displayed in the MessageFeedbackComponent.
 */
export type MessageFeedbackMessages = typeof MESSAGE_FEEDBACK_MESSAGES;

/**
 * Injection token for MessageFeedbackComponent messages.
 */
export const MessageFeedbackMessagesInjectionToken =
    new InjectionToken<MessageFeedbackMessages>('Message Feedback Messages', {
      factory: () => MESSAGE_FEEDBACK_MESSAGES,
    });
