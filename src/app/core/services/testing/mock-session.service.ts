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

import {Session} from '../../models/Session';
import {ListResponse} from '../interfaces/session';
import {SessionService} from '../session.service';

@Injectable()
export class MockSessionService implements Partial<SessionService> {
  createSessionResponse = new ReplaySubject<Session>(1);
  createSession = jasmine.createSpy('createSession')
                      .and.returnValue(this.createSessionResponse);
  listSessionsResponse = new ReplaySubject<ListResponse<Session>>(1);
  listSessions = jasmine.createSpy('listSessions')
                     .and.returnValue(this.listSessionsResponse);
  deleteSessionResponse = new ReplaySubject<any>(1);
  deleteSession = jasmine.createSpy('deleteSession')
                      .and.returnValue(this.deleteSessionResponse);
  getSessionResponse = new ReplaySubject<Session>(1);
  getSession =
      jasmine.createSpy('getSession').and.returnValue(this.getSessionResponse);
  importSessionResponse = new ReplaySubject<Session>(1);
  importSession = jasmine.createSpy('importSession')
                      .and.returnValue(this.importSessionResponse);
  canEditResponse = new ReplaySubject<boolean>(1);
  canEdit = jasmine.createSpy('canEdit').and.returnValue(this.canEditResponse);
}
