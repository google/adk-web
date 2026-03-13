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
import {of, ReplaySubject} from 'rxjs';

import {FeatureFlagService} from '../interfaces/feature-flag';

@Injectable()
export class MockFeatureFlagService implements FeatureFlagService {
  isImportSessionEnabledResponse = new ReplaySubject<boolean>(1);
  isImportSessionEnabled =
      jasmine.createSpy('isImportSessionEnabled')
          .and.returnValue(this.isImportSessionEnabledResponse);
  isEditFunctionArgsEnabledResponse = new ReplaySubject<boolean>(1);
  isEditFunctionArgsEnabled =
      jasmine.createSpy('isEditFunctionArgsEnabled')
          .and.returnValue(this.isEditFunctionArgsEnabledResponse);
  isSessionUrlEnabledResponse = new ReplaySubject<boolean>(1);
  isSessionUrlEnabled = jasmine.createSpy('isSessionUrlEnabled')
                            .and.returnValue(this.isSessionUrlEnabledResponse);
  isA2ACardEnabledResponse = new ReplaySubject<boolean>(1);
  isA2ACardEnabled = jasmine.createSpy('isA2ACardEnabled')
                         .and.returnValue(this.isA2ACardEnabledResponse);
  isAlwaysOnSidePanelEnabledResponse = new ReplaySubject<boolean>(1);
  isAlwaysOnSidePanelEnabled =
      jasmine.createSpy('isAlwaysOnSidePanelEnabled')
          .and.returnValue(this.isAlwaysOnSidePanelEnabledResponse);
  isApplicationSelectorEnabledResponse = new ReplaySubject<boolean>(1);
  isApplicationSelectorEnabled =
      jasmine.createSpy('isApplicationSelectorEnabled')
          .and.returnValue(this.isApplicationSelectorEnabledResponse);
  isTraceEnabledResponse = new ReplaySubject<boolean>(1);
  isTraceEnabled = jasmine.createSpy('isTraceEnabled')
                       .and.returnValue(this.isTraceEnabledResponse);
  isArtifactsTabEnabledResponse = new ReplaySubject<boolean>(1);
  isArtifactsTabEnabled =
      jasmine.createSpy('isArtifactsTabEnabled')
          .and.returnValue(this.isArtifactsTabEnabledResponse);
  isEvalEnabledResponse = new ReplaySubject<boolean>(1);
  isEvalEnabled = jasmine.createSpy('isEvalEnabled')
                      .and.returnValue(this.isEvalEnabledResponse);
  isTokenStreamingEnabledResponse = new ReplaySubject<boolean>(1);
  isTokenStreamingEnabled =
      jasmine.createSpy('isTokenStreamingEnabled')
          .and.returnValue(this.isTokenStreamingEnabledResponse);
  isLiveStreamingEnabledResponse = new ReplaySubject<boolean>(1);
  isLiveStreamingEnabled =
      jasmine.createSpy('isLiveStreamingEnabled')
          .and.returnValue(this.isLiveStreamingEnabledResponse);
  isMessageFileUploadEnabledResponse = new ReplaySubject<boolean>(1);
  isMessageFileUploadEnabled =
      jasmine.createSpy('isMessageFileUploadEnabled')
          .and.returnValue(this.isMessageFileUploadEnabledResponse);
  isManualStateUpdateEnabledResponse = new ReplaySubject<boolean>(1);
  isManualStateUpdateEnabled =
      jasmine.createSpy('isManualStateUpdateEnabled')
          .and.returnValue(this.isManualStateUpdateEnabledResponse);
  isBidiStreamingEnabledResponse = new ReplaySubject<boolean>(1);
  isBidiStreamingEnabled =
      jasmine.createSpy('isBidiStreamingEnabled')
          .and.returnValue(this.isBidiStreamingEnabledResponse);
  isExportSessionEnabledResponse = new ReplaySubject<boolean>(1);
  isExportSessionEnabled =
      jasmine.createSpy('isExportSessionEnabled')
          .and.returnValue(this.isExportSessionEnabledResponse);
  isEventFilteringEnabledResponse = new ReplaySubject<boolean>(1);
  isEventFilteringEnabled =
      jasmine.createSpy('isEventFilteringEnabled')
          .and.returnValue(this.isEventFilteringEnabledResponse);
  isDeleteSessionEnabledResponse = new ReplaySubject<boolean>(1);
  isDeleteSessionEnabled =
      jasmine.createSpy('isDeleteSessionEnabled')
          .and.returnValue(this.isDeleteSessionEnabledResponse);
  isLoadingAnimationsEnabledResponse = new ReplaySubject<boolean>(1);
  isLoadingAnimationsEnabled =
      jasmine.createSpy('isLoadingAnimationsEnabled')
          .and.returnValue(this.isLoadingAnimationsEnabledResponse);
  isSessionsTabReorderingEnabledResponse = new ReplaySubject<boolean>(1);
  isSessionsTabReorderingEnabled =
      jasmine.createSpy('isSessionsTabReorderingEnabled')
          .and.returnValue(this.isSessionsTabReorderingEnabledResponse);
  isSessionFilteringEnabledResponse = new ReplaySubject<boolean>(1);
  isSessionFilteringEnabled =
      jasmine.createSpy('isSessionFilteringEnabled')
          .and.returnValue(this.isSessionFilteringEnabledResponse);
  isSessionReloadOnNewMessageEnabledResponse = new ReplaySubject<boolean>(1);
  isSessionReloadOnNewMessageEnabled =
      jasmine.createSpy('isSessionReloadOnNewMessageEnabled')
          .and.returnValue(this.isSessionReloadOnNewMessageEnabledResponse);
  isUserIdOnToolbarEnabledResponse = new ReplaySubject<boolean>(1);
  isUserIdOnToolbarEnabled =
      jasmine.createSpy('isUserIdOnToolbarEnabled')
          .and.returnValue(this.isUserIdOnToolbarEnabledResponse);
  isDeveloperUiDisclaimerEnabledResponse = new ReplaySubject<boolean>(1);
  isDeveloperUiDisclaimerEnabled =
      jasmine.createSpy('isDeveloperUiDisclaimerEnabled')
          .and.returnValue(this.isDeveloperUiDisclaimerEnabledResponse);
  isFeedbackServiceEnabledResponse = new ReplaySubject<boolean>(1);
  isFeedbackServiceEnabled =
      jasmine.createSpy('isFeedbackServiceEnabled')
          .and.returnValue(this.isFeedbackServiceEnabledResponse);

  isInfinityMessageScrollingEnabledResponse = new ReplaySubject<boolean>(1);
  isInfinityMessageScrollingEnabled =
      jasmine.createSpy('isInfinityMessageScrollingEnabled')
          .and.returnValue(this.isInfinityMessageScrollingEnabledResponse);
}
