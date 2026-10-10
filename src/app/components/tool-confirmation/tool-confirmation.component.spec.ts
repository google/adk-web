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

import {ComponentFixture, TestBed} from '@angular/core/testing';
// 1p-ONLY-IMPORTS: import {beforeEach, describe, expect, it}

import {initTestBed} from '../../testing/utils';
import {MARKDOWN_COMPONENT} from '../markdown/markdown.component.interface';
import {MockMarkdownComponent} from '../markdown/testing/mock-markdown.component';
import {PendingFunctionCall, ToolConfirmationComponent} from './tool-confirmation.component';

describe('ToolConfirmationComponent', () => {
  let fixture: ComponentFixture<ToolConfirmationComponent>;

  beforeEach(async () => {
    initTestBed();
    await TestBed.configureTestingModule({
      imports: [ToolConfirmationComponent],
      providers: [{provide: MARKDOWN_COMPONENT, useValue: MockMarkdownComponent}],
    }).compileComponents();
    fixture = TestBed.createComponent(ToolConfirmationComponent);
  });

  function query(selector: string): HTMLElement|null {
    return fixture.nativeElement.querySelector(selector);
  }

  function text(selector: string): string|undefined {
    return query(selector)?.textContent?.trim().replace(/\s+/g, ' ');
  }

  function confirmationCall(
      originalFunctionCall: object, toolConfirmation: object): PendingFunctionCall {
    return {
      id: 'confirm-1',
      name: 'adk_request_confirmation',
      args: {originalFunctionCall, toolConfirmation},
      functionCallEventId: 'event-1',
    };
  }

  it('shows a shell command to approve the way shell calls are shown', () => {
    fixture.componentRef.setInput('functionCall', confirmationCall(
        {id: 'fc-1', name: 'execute_bash', args: {command: 'ls -la'}},
        {hint: 'Please approve or reject the bash command: ls -la', confirmed: false}));
    fixture.detectChanges();

    expect(text('.confirmation-title')).toBe('Allow execute_bash?');
    expect(text('.confirmation-hint'))
        .toBe('Please approve or reject the bash command: ls -la');
    expect(text('.shell-command-line')).toBe('$ ls -la');
    expect(query('.confirmation-payload')).toBeNull();
  });

  it('hides ADK\'s default hint and shows the payload the tool sent', () => {
    fixture.componentRef.setInput('functionCall', confirmationCall(
        {id: 'fc-1', name: 'issue_refund', args: {amount: 25}}, {
          hint: 'Please approve or reject the tool call issue_refund() by' +
              ' responding with a FunctionResponse with an expected' +
              ' ToolConfirmation payload.',
          confirmed: false,
          payload: {amount: 25, currency: 'USD'},
        }));
    fixture.detectChanges();

    expect(query('.confirmation-hint')).toBeNull();
    expect(text('.confirmation-payload')).toContain('currency');
  });

  it('sends the approval with the tool\'s payload and hides the buttons', () => {
    const call = confirmationCall(
        {id: 'fc-1', name: 'issue_refund', args: {amount: 25}},
        {hint: 'Refund?', confirmed: false, payload: {amount: 25, currency: 'USD'}});
    fixture.componentRef.setInput('functionCall', call);
    fixture.detectChanges();
    let sent: unknown;
    fixture.componentInstance.responseComplete.subscribe(content => {
      sent = content;
    });

    query('.confirmation-approve')!.click();
    fixture.detectChanges();

    expect(sent).toEqual({
      role: 'user',
      parts: [{
        functionResponse: {
          id: 'confirm-1',
          name: 'adk_request_confirmation',
          response: {confirmed: true, payload: {amount: 25, currency: 'USD'}},
        },
      }],
      functionCallEventId: 'event-1',
    });
    expect(call.responseStatus).toBe('sent');
    expect(query('.confirmation-card')).toBeNull();
  });

  it('sends a rejection with the call\'s args when the tool sent no payload', () => {
    fixture.componentRef.setInput('functionCall', confirmationCall(
        {id: 'fc-1', name: 'delete_file', args: {name: 'notes.txt'}},
        {hint: '', confirmed: false}));
    fixture.detectChanges();
    let sent: {parts: Array<{functionResponse: {response: unknown}}>}|undefined;
    fixture.componentInstance.responseComplete.subscribe(content => {
      sent = content as typeof sent;
    });

    query('.confirmation-reject')!.click();

    expect(sent?.parts[0].functionResponse.response)
        .toEqual({confirmed: false, payload: {name: 'notes.txt'}});
  });

  it('shows the user\'s answer and a tool\'s approval placeholders', () => {
    fixture.componentRef.setInput('functionResponse', {
      name: 'adk_request_confirmation',
      response: {confirmed: true},
    });
    fixture.detectChanges();
    expect(text('.confirmation-status.status-approved')).toBe('check_circle Approved');

    fixture.componentRef.setInput('functionResponse', {
      name: 'execute_bash',
      response: {error: 'This tool call requires confirmation, please approve or reject.'},
    });
    fixture.detectChanges();
    expect(text('.confirmation-status.status-requested'))
        .toBe('pending Approval requested');

    fixture.componentRef.setInput('functionResponse', {
      name: 'execute_bash',
      response: {error: 'This tool call is rejected.'},
    });
    fixture.detectChanges();
    expect(text('.confirmation-status.status-rejected')).toBe('block Rejected');
  });
});
