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

import {FunctionCall, FunctionResponse} from './types';

/** The call ADK sends to ask the user to approve another tool call. */
export const REQUEST_CONFIRMATION_TOOL = 'adk_request_confirmation';

/** What a tool returns while its call waits for approval. */
const APPROVAL_REQUESTED_ERROR =
    'This tool call requires confirmation, please approve or reject.';

/** What a tool returns when the user rejected its call. */
const REJECTED_ERROR = 'This tool call is rejected.';

/**
 * The hint ADK uses when a tool asks for confirmation without its own. It is
 * written for developers, so the UI shows its own title instead.
 */
const DEFAULT_HINT_PATTERN =
    /^Please approve or reject the tool call \S+\(\) by responding with a FunctionResponse/;

/** A tool call waiting for the user's approval. */
export interface ConfirmationRequest {
  /** The call to approve. */
  call: FunctionCall;
  /** What the tool says about the call, or '' for ADK's default hint. */
  hint: string;
  /** Data the tool asks the user to confirm, if it sent any. */
  payload: unknown;
}

/** Where a tool call stands on approval. */
export type ConfirmationStatus = 'requested'|'approved'|'rejected';

/**
 * Returns the call an `adk_request_confirmation` call asks to approve, or null
 * for other calls.
 */
export function getConfirmationRequest(fc: FunctionCall|undefined):
    ConfirmationRequest|null {
  if (fc?.name !== REQUEST_CONFIRMATION_TOOL) return null;
  const original = fc.args?.['originalFunctionCall'];
  if (typeof original?.name !== 'string') return null;
  const confirmation = fc.args?.['toolConfirmation'] ?? {};
  const hint = typeof confirmation.hint === 'string' &&
          !DEFAULT_HINT_PATTERN.test(confirmation.hint) ?
      confirmation.hint :
      '';
  return {
    call: {id: original.id, name: original.name, args: original.args ?? {}},
    hint,
    payload: confirmation.payload,
  };
}

function parseResponse(response: {[key: string]: unknown}|undefined):
    {[key: string]: unknown}|undefined {
  // ADK clients may wrap the confirmation as `{response: "<json>"}`.
  const wrapped = response?.['response'];
  if (typeof wrapped !== 'string') return response;
  try {
    return JSON.parse(wrapped) as {[key: string]: unknown};
  } catch {
    return response;
  }
}

/**
 * Returns the approval status a function response reports: the user's answer
 * to an `adk_request_confirmation` call, or the placeholder a tool returns
 * while its call waits for approval or after it was rejected. Returns null for
 * other responses.
 */
export function getConfirmationStatus(fr: FunctionResponse|undefined):
    ConfirmationStatus|null {
  if (!fr) return null;
  if (fr.name === REQUEST_CONFIRMATION_TOOL) {
    const confirmed = parseResponse(fr.response)?.['confirmed'];
    if (typeof confirmed !== 'boolean') return null;
    return confirmed ? 'approved' : 'rejected';
  }
  const error = fr.response?.['error'];
  if (error === APPROVAL_REQUESTED_ERROR) return 'requested';
  if (error === REJECTED_ERROR) return 'rejected';
  return null;
}
