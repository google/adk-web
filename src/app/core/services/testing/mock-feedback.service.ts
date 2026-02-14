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

import {of} from 'rxjs';

import {FeedbackService} from '../interfaces/feedback';

/**
 * Mock feedback service for testing.
 */
export class MockFeedbackService implements Partial<FeedbackService> {
  sendFeedback =
      jasmine.createSpy('sendFeedback').and.returnValue(of(undefined));
  getFeedback = jasmine.createSpy('getFeedback').and.returnValue(of(undefined));
  deleteFeedback =
      jasmine.createSpy('deleteFeedback').and.returnValue(of(undefined));
  getPositiveFeedbackReasons =
      jasmine.createSpy('getPositiveFeedbackReasons')
          .and.returnValue(of(undefined));
  getNegativeFeedbackReasons =
      jasmine.createSpy('getNegativeFeedbackReasons')
          .and.returnValue(of(undefined));
}
