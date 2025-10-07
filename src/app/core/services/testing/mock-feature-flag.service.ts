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

import {FeatureFlagService} from '../feature-flag.service';

@Injectable()
export class MockFeatureFlagService implements Partial<FeatureFlagService> {
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
  isTraceEnabled =
      jasmine.createSpy('isTraceEnabled')
          .and.returnValue(this.isTraceEnabledResponse);
  isArtifactsTabEnabledResponse = new ReplaySubject<boolean>(1);
  isArtifactsTabEnabled =
      jasmine.createSpy('isArtifactsTabEnabled')
          .and.returnValue(this.isArtifactsTabEnabledResponse);
  isEvalEnabledResponse = new ReplaySubject<boolean>(1);
  isEvalEnabled =
      jasmine.createSpy('isEvalEnabled')
          .and.returnValue(this.isEvalEnabledResponse);
  isTokenStreamingEnabledResponse = new ReplaySubject<boolean>(1);
  isTokenStreamingEnabled =
      jasmine.createSpy('isTokenStreamingEnabled')
          .and.returnValue(this.isTokenStreamingEnabledResponse);
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
}
