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

import {ComponentFixture, TestBed} from '@angular/core/testing';
import {By} from '@angular/platform-browser';
// 1p-ONLY-IMPORTS: import {beforeEach, describe, expect, it,}
import {BehaviorSubject, NEVER, of} from 'rxjs';

import {Feedback, FEEDBACK_SERVICE} from '../../core/services/interfaces/feedback';
import {MockFeedbackService} from '../../core/services/testing/mock-feedback.service';
import {initTestBed} from '../../testing/utils';

import {MessageFeedbackComponent} from './message-feedback.component';

describe('MessageFeedbackComponent', () => {
  let mockFeedbackService: MockFeedbackService;
  let fixture: ComponentFixture<MessageFeedbackComponent>;
  let getFeedback$: BehaviorSubject<Feedback|undefined>;

   /** 0 is the thumbs-up button, 1 the thumbs-down one. */
  const button = (index: number): HTMLElement =>
      fixture.debugElement.queryAll(
          By.css('.feedback-buttons button'))[index].nativeElement;
  const isSelected = (index: number): boolean =>
      button(index).classList.contains('selected');
  /** The ligature the button renders; its icon is its only text content. */
  const iconName = (index: number): string => button(index).textContent!.trim();

  beforeEach(async () => {
    mockFeedbackService = new MockFeedbackService();
    getFeedback$ = new BehaviorSubject<Feedback|undefined>(undefined);
    mockFeedbackService.getFeedback.and.returnValue(getFeedback$);
    mockFeedbackService.sendFeedback.and.returnValue(of(undefined));
    mockFeedbackService.deleteFeedback.and.returnValue(of(undefined));
    mockFeedbackService.getPositiveFeedbackReasons.and.returnValue(of([]));
    mockFeedbackService.getNegativeFeedbackReasons.and.returnValue(of([]));

    initTestBed();
    await TestBed
        .configureTestingModule({
          imports: [MessageFeedbackComponent],
          providers: [
            {provide: FEEDBACK_SERVICE, useValue: mockFeedbackService},
          ],
        })
        .compileComponents();

    fixture = TestBed.createComponent(MessageFeedbackComponent);
    fixture.componentRef.setInput('sessionName', 'test-session');
    fixture.componentRef.setInput('eventId', 'test-event');
    fixture.detectChanges();
  });

  it('should show existing UP feedback on load', async () => {
    getFeedback$.next({id: 'f1', direction: 'up', comment: ''});
    fixture.detectChanges();
    await fixture.whenStable();

    expect(iconName(0)).toBe('thumb_up_filled');
    expect(isSelected(0)).toBeTrue();
    expect(isSelected(1)).toBeFalse();
  });

  it('should show existing DOWN feedback on load', async () => {
    getFeedback$.next({id: 'f1', direction: 'down', comment: ''});
    fixture.detectChanges();
    await fixture.whenStable();

    expect(iconName(1)).toBe('thumb_down_filled');
    expect(isSelected(1)).toBeTrue();
    expect(isSelected(0)).toBeFalse();
  });

  it('should delete feedback if the same feedback button is clicked',
     async () => {
       getFeedback$.next({id: 'f1', direction: 'up', comment: ''});
       mockFeedbackService.deleteFeedback.and.callFake(() => {
         getFeedback$.next(undefined);
         return of(undefined);
       });
       fixture.detectChanges();

       expect(isSelected(0)).toBeTrue();
       button(0).click();
       fixture.detectChanges();

       expect(mockFeedbackService.deleteFeedback)
           .toHaveBeenCalledWith(
               'test-session',
               'test-event',
           );
       expect(isSelected(0)).toBeFalse();
     });

  it('should submit "up" feedback and show detailed panel when "up" button is clicked',
     () => {
       expect(fixture.debugElement.query(By.css('.feedback-details-container')))
           .toBeFalsy();

       fixture.debugElement.queryAll(By.css('.feedback-buttons button'))[0]
           .nativeElement.click();
       fixture.detectChanges();

       expect(fixture.debugElement.query(By.css('.feedback-details-container')))
           .toBeTruthy();
       expect(mockFeedbackService.sendFeedback)
           .toHaveBeenCalledWith(
               'test-session', 'test-event', {direction: 'up'});
     });

  it('should submit "down" feedback and show detailed panel when "down" button is clicked',
     () => {
       expect(fixture.debugElement.query(By.css('.feedback-details-container')))
           .toBeFalsy();

       fixture.debugElement.queryAll(By.css('.feedback-buttons button'))[1]
           .nativeElement.click();
       fixture.detectChanges();

       expect(fixture.debugElement.query(By.css('.feedback-details-container')))
           .toBeTruthy();
       expect(fixture.debugElement.query(By.css('.feedback-buttons')))
           .toBeTruthy();
       expect(mockFeedbackService.sendFeedback)
           .toHaveBeenCalledWith(
               'test-session', 'test-event', {direction: 'down'});
     });

  it('should toggle between detailed feedback directions', () => {
    button(1).click();  // Open down panel
    fixture.detectChanges();
    expect(isSelected(1)).toBeTrue();


    button(0).click();  // Switch to up
    fixture.detectChanges();

    expect(isSelected(0)).toBeTrue();
    expect(isSelected(1)).toBeFalse();
    expect(fixture.debugElement.query(By.css('.feedback-details-container')))
        .toBeTruthy();
    expect(mockFeedbackService.sendFeedback)
        .toHaveBeenCalledWith('test-session', 'test-event', {direction: 'up'});
  });

  it('should call sendFeedback when detailed feedback is submitted', () => {
    fixture.debugElement.queryAll(By.css('.feedback-buttons button'))[0]
        .nativeElement.click();  // Click up
    fixture.detectChanges();

    expect(fixture.debugElement.query(By.css('.feedback-details-container')))
        .toBeTruthy();

    // Fill in feedback
    const textarea =
        fixture.debugElement.query(By.css('textarea')).nativeElement as
        HTMLTextAreaElement;
    textarea.value = 'test comment';
    textarea.dispatchEvent(new Event('input'));
    fixture.detectChanges();

    fixture.debugElement.queryAll(By.css('.actions button'))[1]
        .nativeElement.click();  // Submit button
    fixture.detectChanges();

    expect(mockFeedbackService.sendFeedback)
        .toHaveBeenCalledWith('test-session', 'test-event', {
          direction: 'up',
          reasons: [],
          comment: 'test comment',
        });
    expect(fixture.debugElement.query(By.css('.feedback-details-container')))
        .toBeFalsy();
    expect(isSelected(0)).toBeTrue();
  });

  it('should allow submitting negative feedback without details', () => {
    fixture.debugElement.queryAll(By.css('.feedback-buttons button'))[1]
        .nativeElement.click();
    fixture.detectChanges();

    expect(fixture.debugElement.query(By.css('.feedback-details-container')))
        .toBeTruthy();

    fixture.debugElement.queryAll(By.css('.actions button'))[1]
        .nativeElement.click();  // Submit button
    fixture.detectChanges();

    expect(mockFeedbackService.sendFeedback)
        .toHaveBeenCalledWith('test-session', 'test-event', {
          direction: 'down',
          reasons: [],
          comment: '',
        });
    expect(fixture.debugElement.query(By.css('.feedback-details-container')))
        .toBeFalsy();
  });

  it('should hide panel when detailed feedback is cancelled', () => {
    fixture.debugElement.queryAll(By.css('.feedback-buttons button'))[1]
        .nativeElement.click();
    fixture.detectChanges();

    expect(fixture.debugElement.query(By.css('.feedback-details-container')))
        .toBeTruthy();
    expect(mockFeedbackService.sendFeedback)
        .toHaveBeenCalledWith(
            'test-session', 'test-event', {direction: 'down'});
    mockFeedbackService.sendFeedback.calls.reset();

    fixture.debugElement.queryAll(By.css('.actions button'))[0]
        .nativeElement.click();  // Cancel button
    fixture.detectChanges();

    expect(fixture.debugElement.query(By.css('.feedback-details-container')))
        .toBeFalsy();
    expect(mockFeedbackService.sendFeedback).not.toHaveBeenCalled();
  });

  it('should highlight "up" button when clicked', () => {
    expect(iconName(0)).toBe('thumb_up');
    expect(isSelected(0)).toBeFalse();
    expect(button(0).getAttribute('aria-pressed')).toBe('false');

    button(0).click();
    fixture.detectChanges();

    expect(iconName(0)).toBe('thumb_up_filled');
    expect(isSelected(0)).toBeTrue();
    expect(button(0).getAttribute('aria-pressed')).toBe('true');
  });

  it('should highlight "down" button when clicked', () => {
    expect(iconName(1)).toBe('thumb_down');
    expect(isSelected(1)).toBeFalse();
    expect(button(1).getAttribute('aria-pressed')).toBe('false');

    button(1).click();
    fixture.detectChanges();

    expect(iconName(1)).toBe('thumb_down_filled');
    expect(isSelected(1)).toBeTrue();
    expect(button(1).getAttribute('aria-pressed')).toBe('true');
  });

  it('should remove "down" highlight when cancelled', () => {
    button(1).click();
    fixture.detectChanges();
    expect(isSelected(1)).toBeTrue();

    fixture.debugElement.queryAll(By.css('.actions button'))[0]
        .nativeElement.click();  // Cancel button
    fixture.detectChanges();

    expect(isSelected(1)).toBeFalse();
    expect(button(1).getAttribute('aria-pressed')).toBe('false');
  });
  it('should show correct placeholder text based on feedback direction', () => {
    // Click up
    fixture.debugElement.queryAll(By.css('.feedback-buttons button'))[0]
        .nativeElement.click();
    fixture.detectChanges();
    const textarea =
        fixture.debugElement.query(By.css('textarea')).nativeElement as
        HTMLTextAreaElement;
    expect(textarea.placeholder)
        .toBe('Share what you liked about the response');

    // Click down
    fixture.debugElement.queryAll(By.css('.feedback-buttons button'))[1]
        .nativeElement.click();
    fixture.detectChanges();
    const textareaDown =
        fixture.debugElement.query(By.css('textarea')).nativeElement as
        HTMLTextAreaElement;
    expect(textareaDown.placeholder)
        .toBe('Share what could be improved in the response');
  });

  it('should show optional label in header', () => {
    fixture.debugElement.queryAll(By.css('.feedback-buttons button'))[0]
        .nativeElement.click();
    fixture.detectChanges();
    expect(fixture.debugElement.query(By.css('.additional-feedback h3'))
               .nativeElement.textContent)
        .toContain('(Optional)');
  });

  it('should disable feedback buttons when deleting feedback', async () => {
    getFeedback$.next({id: 'f1', direction: 'up', comment: ''});
    mockFeedbackService.deleteFeedback.and.returnValue(NEVER);
    fixture.detectChanges();

    fixture.debugElement.queryAll(By.css('.feedback-buttons button'))[0]
        .nativeElement.click();
    fixture.detectChanges();

    expect(mockFeedbackService.deleteFeedback)
        .toHaveBeenCalledWith(
            'test-session',
            'test-event',
        );
    expect(
        fixture.debugElement.queryAll(By.css('.feedback-buttons button'))[0]
            .nativeElement.disabled,
        )
        .toBeTrue();
    expect(
        fixture.debugElement.queryAll(By.css('.feedback-buttons button'))[1]
            .nativeElement.disabled,
        )
        .toBeTrue();
  });

  it('should disable feedback buttons when submitting feedback', () => {
    mockFeedbackService.sendFeedback.and.returnValues(of(undefined), NEVER);
    fixture.debugElement.queryAll(By.css('.feedback-buttons button'))[0]
        .nativeElement.click();  // Click up
    fixture.detectChanges();

    fixture.debugElement.queryAll(By.css('.actions button'))[1]
        .nativeElement.click();  // Submit button
    fixture.detectChanges();

    expect(mockFeedbackService.sendFeedback)
        .toHaveBeenCalledWith('test-session', 'test-event', {
          direction: 'up',
          reasons: [],
          comment: '',
        });
    expect(
        fixture.debugElement.queryAll(By.css('.feedback-buttons button'))[0]
            .nativeElement.disabled,
        )
        .toBeTrue();
    expect(
        fixture.debugElement.queryAll(By.css('.feedback-buttons button'))[1]
            .nativeElement.disabled,
        )
        .toBeTrue();
  });

  it('should show positive reasons when "up" is selected', () => {
    fixture.debugElement.queryAll(By.css('.feedback-buttons button'))[0]
        .nativeElement.click();
    fixture.detectChanges();

    const chips = fixture.debugElement.queryAll(By.css('mat-chip-option'));
    expect(chips.length).toBe(0);
  });

  it('should show negative reasons when "down" is selected', () => {
    fixture.debugElement.queryAll(By.css('.feedback-buttons button'))[1]
        .nativeElement.click();
    fixture.detectChanges();

    const chips = fixture.debugElement.queryAll(By.css('mat-chip-option'));
    expect(chips.length).toBe(0);
  });
});
