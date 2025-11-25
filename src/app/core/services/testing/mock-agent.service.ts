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

import {AgentService} from '../agent.service';
import {Event as AdkEvent} from '../../models/types';

@Injectable()
export class MockAgentService implements Partial<AgentService> {
  listAppsResponse = new ReplaySubject<string[]>(1);
  listApps =
      jasmine.createSpy('listApps').and.returnValue(this.listAppsResponse);

  getAppResponse = new ReplaySubject<string>(1);
  getApp = jasmine.createSpy('getApp').and.returnValue(this.getAppResponse);

  setApp = jasmine.createSpy('setApp');

  getLoadingStateResponse = new ReplaySubject<boolean>(1);
  getLoadingState = jasmine.createSpy('getLoadingState')
                        .and.returnValue(this.getLoadingStateResponse);

  runSseResponse = new ReplaySubject<AdkEvent>(1);
  runSse = jasmine.createSpy('runSse').and.returnValue(this.runSseResponse);

  getAgentBuilderResponse = new ReplaySubject<string>(1);
  getAgentBuilder = jasmine.createSpy('getAgentBuilder')
                        .and.returnValue(this.getAgentBuilderResponse);

  getAgentBuilderTmpResponse = new ReplaySubject<string>(1);
  getAgentBuilderTmp = jasmine.createSpy('getAgentBuilderTmp')
                           .and.returnValue(this.getAgentBuilderTmpResponse);

  getSubAgentBuilderResponse = new ReplaySubject<string>(1);
  getSubAgentBuilder = jasmine.createSpy('getSubAgentBuilder')
                           .and.returnValue(this.getSubAgentBuilderResponse);

  agentBuildTmp = jasmine.createSpy('agentBuildTmp').and.returnValue(of(true));
  agentBuild = jasmine.createSpy('agentBuild').and.returnValue(of(true));
  agentChangeCancel = jasmine.createSpy('agentChangeCancel').and.returnValue(of(true));
}
