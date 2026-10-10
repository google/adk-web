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

// 1p-ONLY-IMPORTS: import {describe, expect, it}
import {getConfirmationRequest, getConfirmationStatus} from './ToolConfirmation';

describe('ToolConfirmation', () => {
  describe('getConfirmationRequest', () => {
    it('reads the call to approve, its hint, and its payload', () => {
      expect(getConfirmationRequest({
        name: 'adk_request_confirmation',
        args: {
          originalFunctionCall: {id: 'fc-1', name: 'issue_refund', args: {amount: 25}},
          toolConfirmation: {
            hint: 'Approve a refund of $25.00?',
            confirmed: false,
            payload: {amount: 25, currency: 'USD'},
          },
        },
      })).toEqual({
        call: {id: 'fc-1', name: 'issue_refund', args: {amount: 25}},
        hint: 'Approve a refund of $25.00?',
        payload: {amount: 25, currency: 'USD'},
      });
    });

    it('drops the default hint ADK writes for developers', () => {
      expect(getConfirmationRequest({
        name: 'adk_request_confirmation',
        args: {
          originalFunctionCall: {id: 'fc-1', name: 'delete_file', args: {name: 'a'}},
          toolConfirmation: {
            hint: 'Please approve or reject the tool call delete_file() by' +
                ' responding with a FunctionResponse with an expected' +
                ' ToolConfirmation payload.',
            confirmed: false,
          },
        },
      })).toEqual({
        call: {id: 'fc-1', name: 'delete_file', args: {name: 'a'}},
        hint: '',
        payload: undefined,
      });
    });

    it('returns null for other calls', () => {
      expect(getConfirmationRequest({name: 'execute_bash', args: {command: 'ls'}}))
          .toBeNull();
      expect(getConfirmationRequest({name: 'adk_request_confirmation', args: {}}))
          .toBeNull();
    });
  });

  describe('getConfirmationStatus', () => {
    it('reads the user\'s answer', () => {
      expect(getConfirmationStatus({
        name: 'adk_request_confirmation',
        response: {confirmed: true, payload: {}},
      })).toBe('approved');
      expect(getConfirmationStatus({
        name: 'adk_request_confirmation',
        response: {confirmed: false},
      })).toBe('rejected');
      expect(getConfirmationStatus({
        name: 'adk_request_confirmation',
        response: {response: '{"confirmed": true}'},
      })).toBe('approved');
    });

    it('reads the placeholders a tool returns around approval', () => {
      expect(getConfirmationStatus({
        name: 'execute_bash',
        response: {error: 'This tool call requires confirmation, please approve or reject.'},
      })).toBe('requested');
      expect(getConfirmationStatus({
        name: 'delete_file',
        response: {error: 'This tool call is rejected.'},
      })).toBe('rejected');
    });

    it('returns null for other responses', () => {
      expect(getConfirmationStatus({name: 'execute_bash', response: {error: 'boom'}}))
          .toBeNull();
      expect(getConfirmationStatus({name: 'adk_request_confirmation', response: {}}))
          .toBeNull();
      expect(getConfirmationStatus(undefined)).toBeNull();
    });
  });
});
