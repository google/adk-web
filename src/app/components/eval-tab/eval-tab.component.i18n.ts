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
 * Default English messages for EvalTabComponent.
 */
export const EVAL_TAB_MESSAGES = {
  allEvalSetsHeader: 'All eval sets',
  createNewEvalSetTooltip: 'Create new evaluation set',
  createNewEvalSetTitle: 'Create New Evaluation Set',
  evalSetDescription:
      'An evaluation set is a curated collection of evaluation cases, where each case includes input-output examples for assessing agent performance.',
  createEvalSetButton: 'Create Evaluation Set',
  runEvaluationButton: 'Run Evaluation',
  viewEvalRunHistoryTooltip: 'View eval run history',
  caseIdHeader: 'Case ID',
  resultHeader: 'Result',
  viewEvalRunResultTooltip: 'View eval run result',
  passStatus: 'Pass',
  failStatus: 'Fail',
  passStatusCaps: 'PASS',
  failStatusCaps: 'FAIL',
  passedSuffix: 'Passed',
  failedSuffix: 'Failed',
  addSessionToSetButtonPrefix: 'Add current session to',
};


/**
 * Interface for human-readable messages displayed in the EvalTabComponent.
 */
export type EvalTabMessages = typeof EVAL_TAB_MESSAGES;

/**
 * Injection token for EvalTabComponent messages.
 */
export const EvalTabMessagesInjectionToken =
    new InjectionToken<EvalTabMessages>('Eval Tab Messages', {
      factory: () => EVAL_TAB_MESSAGES,
    });
