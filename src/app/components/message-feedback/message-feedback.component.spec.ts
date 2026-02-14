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

    const upButton =
        fixture.debugElement.queryAll(By.css('.feedback-buttons button'))[0]
            .nativeElement;
    const upIcon = upButton.querySelector('mat-icon')!;
    expect(upIcon.textContent).toContain('thumb_up_filled');
  });

  it('should show existing DOWN feedback on load', async () => {
    getFeedback$.next({id: 'f1', direction: 'down', comment: ''});
    fixture.detectChanges();
    await fixture.whenStable();

    const downButton =
        fixture.debugElement.queryAll(By.css('.feedback-buttons button'))[1]
            .nativeElement;
    const downIcon = downButton.querySelector('mat-icon')!;
    expect(downIcon.textContent).toContain('thumb_down_filled');
  });

  it('should delete feedback if the same feedback button is clicked',
     async () => {
       getFeedback$.next({id: 'f1', direction: 'up', comment: ''});
       mockFeedbackService.deleteFeedback.and.callFake(() => {
         getFeedback$.next(undefined);
         return of(undefined);
       });
       fixture.detectChanges();

       expect(
           fixture.debugElement
               .queryAll(By.css('.feedback-buttons button mat-icon'))[0]
               .nativeElement.textContent,
           )
           .toContain('thumb_up_filled');

       fixture.debugElement.queryAll(By.css('.feedback-buttons button'))[0]
           .nativeElement.click();
       fixture.detectChanges();

       expect(mockFeedbackService.deleteFeedback)
           .toHaveBeenCalledWith(
               'test-session',
               'test-event',
           );
       expect(
           fixture.debugElement
               .queryAll(By.css('.feedback-buttons button mat-icon'))[0]
               .nativeElement.textContent,
           )
           .toContain('thumb_up');
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
    fixture.debugElement.queryAll(By.css('.feedback-buttons button'))[1]
        .nativeElement.click();  // Open down panel
    fixture.detectChanges();
    expect(fixture.debugElement
               .queryAll(By.css('.feedback-buttons button mat-icon'))[1]
               .nativeElement.textContent)
        .toContain('thumb_down_filled');

    fixture.debugElement.queryAll(By.css('.feedback-buttons button'))[0]
        .nativeElement.click();  // Switch to up
    fixture.detectChanges();

    expect(fixture.debugElement
               .queryAll(By.css('.feedback-buttons button mat-icon'))[0]
               .nativeElement.textContent)
        .toContain('thumb_up_filled');
    expect(fixture.debugElement
               .queryAll(By.css('.feedback-buttons button mat-icon'))[1]
               .nativeElement.textContent)
        .toContain('thumb_down');
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
    expect(fixture.debugElement
               .queryAll(By.css('.feedback-buttons button mat-icon'))[0]
               .nativeElement.textContent)
        .toContain('thumb_up_filled');
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
    const upButton =
        fixture.debugElement.queryAll(By.css('.feedback-buttons button'))[0];
    const upIcon = () => upButton.nativeElement.querySelector('mat-icon')!;
    expect(upIcon().textContent).toContain('thumb_up');
    expect(upIcon().textContent).not.toContain('thumb_up_filled');

    upButton.nativeElement.click();
    fixture.detectChanges();

    expect(upIcon().textContent).toContain('thumb_up_filled');
  });

  it('should highlight "down" button when clicked', () => {
    const downButton =
        fixture.debugElement.queryAll(By.css('.feedback-buttons button'))[1];
    const downIcon = () => downButton.nativeElement.querySelector('mat-icon')!;
    expect(downIcon().textContent).toContain('thumb_down');
    expect(downIcon().textContent).not.toContain('thumb_down_filled');

    downButton.nativeElement.click();
    fixture.detectChanges();

    expect(downIcon().textContent).toContain('thumb_down_filled');
  });

  it('should remove "down" highlight when cancelled', () => {
    fixture.debugElement.queryAll(By.css('.feedback-buttons button'))[1]
        .nativeElement.click();
    fixture.detectChanges();
    expect(fixture.debugElement
               .queryAll(By.css('.feedback-buttons button mat-icon'))[1]
               .nativeElement.textContent)
        .toContain('thumb_down_filled');

    fixture.debugElement.queryAll(By.css('.actions button'))[0]
        .nativeElement.click();  // Cancel button
    fixture.detectChanges();

    expect(fixture.debugElement
               .queryAll(By.css('.feedback-buttons button mat-icon'))[1]
               .nativeElement.textContent)
        .toContain('thumb_down');
    expect(fixture.debugElement
               .queryAll(By.css('.feedback-buttons button mat-icon'))[1]
               .nativeElement.textContent)
        .not.toContain('thumb_down_filled');
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
