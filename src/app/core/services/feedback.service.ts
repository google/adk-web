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

import {Injectable} from '@angular/core';
import {Observable, of} from 'rxjs';

import {Feedback, FeedbackService as FeedbackServiceInterface} from './interfaces/feedback';

@Injectable({providedIn: 'root'})
export class FeedbackService implements FeedbackServiceInterface {
  sendFeedback(
      sessionId: string,
      eventId: string,
      feedback: Partial<Feedback>,
      ): Observable<void> {
    return of(undefined);
  }

  getFeedback(sessionId: string, eventId: string):
      Observable<Feedback|undefined> {
    return of(undefined);
  }

  deleteFeedback(sessionId: string, eventId: string): Observable<void> {
    return of(undefined);
  }

  getPositiveFeedbackReasons(): Observable<string[]> {
    return of([]);
  }

  getNegativeFeedbackReasons(): Observable<string[]> {
    return of([]);
  }
}
