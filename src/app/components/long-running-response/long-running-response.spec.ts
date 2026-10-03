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
import {By} from '@angular/platform-browser';

import {initTestBed} from '../../testing/utils';
import {MarkdownComponent} from '../markdown/markdown.component';
import {MockMarkdownComponent} from '../markdown/testing/mock-markdown.component';

import {LongRunningResponseComponent} from './long-running-response';

describe('LongRunningResponseComponent tool confirmation', () => {
  let fixture: ComponentFixture<LongRunningResponseComponent>;
  let responseComplete: jasmine.Spy;

  beforeEach(async () => {
    initTestBed();
    await TestBed
        .configureTestingModule({imports: [LongRunningResponseComponent]})
        .overrideComponent(LongRunningResponseComponent, {
          remove: {imports: [MarkdownComponent]},
          add: {imports: [MockMarkdownComponent]},
        })
        .compileComponents();
    fixture = TestBed.createComponent(LongRunningResponseComponent);
    responseComplete = jasmine.createSpy('responseComplete');
    fixture.componentInstance.responseComplete.subscribe(responseComplete);
  });

  async function showConfirmation(payload: unknown, prompt?: string) {
    fixture.componentRef.setInput('functionCall', {
      id: 'confirmation-call',
      name: 'adk_request_confirmation',
      functionCallEventId: 'confirmation-event',
      responseStatus: 'pending',
      args: {
        prompt,
        originalFunctionCall: {name: 'request_time_off', args: {days: 5}},
        toolConfirmation: {hint: 'Please enter the approved days.', payload},
      },
    });
    fixture.detectChanges();
    await fixture.whenStable();
  }

  function textarea(): HTMLTextAreaElement {
    return fixture.debugElement.query(By.css('textarea')).nativeElement;
  }

  function submitButton(): HTMLButtonElement {
    return fixture.debugElement.query(By.css('.confirmation-footer button'))
        .nativeElement;
  }

  async function enterPayload(value: string) {
    textarea().value = value;
    textarea().dispatchEvent(new Event('input'));
    fixture.detectChanges();
    await fixture.whenStable();
    fixture.detectChanges();
  }

  function expectResponse(confirmed: boolean, payload: unknown) {
    expect(responseComplete).toHaveBeenCalledOnceWith({
      role: 'user',
      parts: [{
        functionResponse: {
          id: 'confirmation-call',
          name: 'adk_request_confirmation',
          response: {confirmed, payload},
        },
      }],
      functionCallEventId: 'confirmation-event',
    });
  }

  for (const prompt of [undefined, 'Please review this request.']) {
    describe(prompt ? 'with a message' : 'without a message', () => {
      it('edits the requested payload and submits the confirmation', async () => {
        await showConfirmation({approved_days: 0}, prompt);

        expect(JSON.parse(textarea().value)).toEqual({approved_days: 0});
        expect(textarea().labels?.[0].textContent).toContain('Payload');
        await enterPayload('{"approved_days": 3}');
        const checkbox: HTMLInputElement =
            fixture.debugElement.query(By.css('input[type="checkbox"]'))
                .nativeElement;
        checkbox.click();
        submitButton().click();

        expectResponse(true, {approved_days: 3});
        expect(fixture.componentInstance.functionCall.responseStatus).toBe('sent');
        expect(fixture.debugElement.query(By.css('textarea'))).toBeNull();
      });

      it('keeps invalid JSON editable until it is corrected', async () => {
        await showConfirmation({approved_days: 0}, prompt);
        await enterPayload('{"approved_days":');

        expect(submitButton().disabled).toBeTrue();
        expect(textarea().getAttribute('aria-invalid')).toBe('true');
        const error = fixture.debugElement.query(By.css('[role="alert"]'));
        expect(error.nativeElement.textContent).toContain('valid JSON');
        expect(textarea().getAttribute('aria-describedby'))
            .toBe(error.nativeElement.id);
        submitButton().click();
        fixture.componentInstance.onSend();
        expect(responseComplete).not.toHaveBeenCalled();
        expect(fixture.componentInstance.functionCall.responseStatus)
            .toBe('pending');
        expect(textarea().value).toBe('{"approved_days":');

        await enterPayload('{"approved_days": 2}');

        expect(submitButton().disabled).toBeFalse();
        expect(fixture.debugElement.query(By.css('[role="alert"]'))).toBeNull();
        submitButton().click();
        expectResponse(false, {approved_days: 2});
      });

      for (const payload of [undefined, null]) {
        it(`preserves simple confirmation when payload is ${payload}`, async () => {
          await showConfirmation(payload, prompt);

          expect(fixture.debugElement.query(By.css('textarea'))).toBeNull();
          expect(submitButton().disabled).toBeFalse();
          submitButton().click();
          expectResponse(false, {days: 5});
        });
      }
    });
  }

  for (const payload of [false, 0, '', [], ['first'], {}]) {
    it(`allows a provided ${JSON.stringify(payload)} payload`, async () => {
      await showConfirmation(payload);

      expect(JSON.parse(textarea().value)).toEqual(payload);
      submitButton().click();
      expectResponse(false, payload);
    });
  }

  for (const payload of [null, false, 0, '', ['first', {nested: true}]]) {
    it(`submits JSON value ${JSON.stringify(payload)} entered by the user`, async () => {
      await showConfirmation({approved_days: 0});
      await enterPayload(JSON.stringify(payload));

      expect(submitButton().disabled).toBeFalse();
      submitButton().click();
      expectResponse(false, payload);
    });
  }

  it('treats empty input as invalid rather than sending the original args', async () => {
    await showConfirmation({approved_days: 0});
    await enterPayload('');

    expect(submitButton().disabled).toBeTrue();
    fixture.componentInstance.onSend();
    expect(responseComplete).not.toHaveBeenCalled();
    expect(fixture.componentInstance.functionCall.responseStatus).toBe('pending');
  });

  it('resets a validation error for a new confirmation request', async () => {
    await showConfirmation({approved_days: 0});
    await enterPayload('{');
    await showConfirmation({user_name: ''});

    expect(JSON.parse(textarea().value)).toEqual({user_name: ''});
    expect(submitButton().disabled).toBeFalse();
    expect(fixture.debugElement.query(By.css('[role="alert"]'))).toBeNull();
  });
});
