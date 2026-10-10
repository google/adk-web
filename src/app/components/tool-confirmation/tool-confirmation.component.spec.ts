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
    const payload = query('textarea') as HTMLTextAreaElement;
    expect(JSON.parse(payload.value)).toEqual({amount: 25, currency: 'USD'});
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

  describe('editable confirmation payload', () => {
    let responseComplete: jasmine.Spy;

    beforeEach(() => {
      responseComplete = jasmine.createSpy('responseComplete');
      fixture.componentInstance.responseComplete.subscribe(responseComplete);
    });

    function showPayload(payload: unknown) {
      const call = confirmationCall(
          {name: 'request_time_off', args: {days: 5}},
          {hint: 'Please enter the approved days.', payload});
      fixture.componentRef.setInput('functionCall', call);
      fixture.detectChanges();
      return call;
    }

    function textarea(): HTMLTextAreaElement {
      return query('textarea') as HTMLTextAreaElement;
    }

    function button(confirmed: boolean): HTMLButtonElement {
      return query(confirmed ? '.confirmation-approve' : '.confirmation-reject') as
          HTMLButtonElement;
    }

    function enterPayload(value: string) {
      textarea().value = value;
      textarea().dispatchEvent(new Event('input'));
      fixture.detectChanges();
    }

    function expectResponse(confirmed: boolean, payload: unknown) {
      expect(responseComplete).toHaveBeenCalledOnceWith({
        role: 'user',
        parts: [{
          functionResponse: {
            id: 'confirm-1',
            name: 'adk_request_confirmation',
            response: {confirmed, payload},
          },
        }],
        functionCallEventId: 'event-1',
      });
    }

    for (const confirmed of [true, false]) {
      it(`submits the edited payload with confirmed=${confirmed}`, () => {
        const call = showPayload({approved_days: 0});

        expect(JSON.parse(textarea().value)).toEqual({approved_days: 0});
        expect(textarea().labels?.[0].textContent).toContain('Payload');
        enterPayload('{"approved_days": 3}');
        button(confirmed).click();
        fixture.detectChanges();

        expectResponse(confirmed, {approved_days: 3});
        expect(call.responseStatus).toBe('sent');
        expect(query('textarea')).toBeNull();
      });

      it(`blocks invalid JSON and recovers for confirmed=${confirmed}`, () => {
        const call = showPayload({approved_days: 0});
        enterPayload('{"approved_days":');

        expect(button(true).disabled).toBeTrue();
        expect(button(false).disabled).toBeTrue();
        expect(textarea().getAttribute('aria-invalid')).toBe('true');
        const error = query('[role="alert"]')!;
        expect(error.textContent).toContain('valid JSON');
        expect(textarea().getAttribute('aria-describedby')).toBe(error.id);
        button(confirmed).click();
        (fixture.componentInstance as unknown as {
          respond(confirmed: boolean): void;
        }).respond(confirmed);
        expect(responseComplete).not.toHaveBeenCalled();
        expect(call.responseStatus).not.toBe('sent');
        expect(textarea().value).toBe('{"approved_days":');

        enterPayload('{"approved_days": 2}');

        expect(button(confirmed).disabled).toBeFalse();
        expect(query('[role="alert"]')).toBeNull();
        button(confirmed).click();
        expectResponse(confirmed, {approved_days: 2});
      });

      for (const payload of [undefined, null]) {
        it(`keeps simple ${payload} confirmation with confirmed=${confirmed}`, () => {
          showPayload(payload);

          expect(query('textarea')).toBeNull();
          expect(button(confirmed).disabled).toBeFalse();
          button(confirmed).click();
          expectResponse(confirmed, {days: 5});
        });
      }
    }

    for (const payload of [false, 0, '', [], ['first'], {}]) {
      it(`edits a provided ${JSON.stringify(payload)} payload`, () => {
        showPayload(payload);

        expect(JSON.parse(textarea().value)).toEqual(payload);
        button(true).click();
        expectResponse(true, payload);
      });
    }

    for (const payload of [null, false, 0, '', ['first', {nested: true}]]) {
      it(`submits entered JSON ${JSON.stringify(payload)}`, () => {
        showPayload({approved_days: 0});
        enterPayload(JSON.stringify(payload));

        expect(button(true).disabled).toBeFalse();
        button(true).click();
        expectResponse(true, payload);
      });
    }

    it('does not replace empty input with the original arguments', () => {
      const call = showPayload({approved_days: 0});
      enterPayload('');

      expect(button(true).disabled).toBeTrue();
      (fixture.componentInstance as unknown as {
        respond(confirmed: boolean): void;
      }).respond(true);
      expect(responseComplete).not.toHaveBeenCalled();
      expect(call.responseStatus).not.toBe('sent');
    });

    it('resets invalid input for a different confirmation request', () => {
      showPayload({approved_days: 0});
      enterPayload('{');
      showPayload({user_name: ''});

      expect(JSON.parse(textarea().value)).toEqual({user_name: ''});
      expect(button(true).disabled).toBeFalse();
      expect(query('[role="alert"]')).toBeNull();
    });
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
