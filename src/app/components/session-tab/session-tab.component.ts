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

import {Component, EventEmitter, Input, OnInit, Output, Inject} from '@angular/core';
import {MatDialog} from '@angular/material/dialog';
import {Subject} from 'rxjs';
import {switchMap} from 'rxjs/operators';
import {Session} from '../../core/models/Session';
import {SessionService, SESSION_SERVICE} from '../../core/services/session.service';
import { NgClass } from '@angular/common';

@Component({
    selector: 'app-session-tab',
    templateUrl: './session-tab.component.html',
    styleUrl: './session-tab.component.scss',
    imports: [NgClass],
})
export class SessionTabComponent implements OnInit {
  @Input() userId: string = '';
  @Input() appName: string = '';
  @Input() sessionId: string = '';

  @Output() readonly sessionSelected = new EventEmitter<Session>();
  @Output() readonly sessionReloaded = new EventEmitter<Session>();

  sessionList: any[] = [];

  private refreshSessionsSubject = new Subject<void>();

  constructor(
    @Inject(SESSION_SERVICE) private sessionService: SessionService,
    private dialog: MatDialog,
  ) {
    this.refreshSessionsSubject
        .pipe(
            switchMap(
                () =>
                    this.sessionService.listSessions(this.userId, this.appName),
                ),
            )
        .subscribe((res) => {
          res = res.sort(
              (a: any, b: any) =>
                  Number(b.lastUpdateTime) - Number(a.lastUpdateTime),
          );
          this.sessionList = res;
        });
  }

  ngOnInit(): void {
    setTimeout(() => {
      this.refreshSessionsSubject.next();
    }, 500);
  }

  getSession(sessionId: string) {
    this.sessionService
      .getSession(this.userId, this.appName, sessionId)
      .subscribe((res) => {
        const session = this.fromApiResultToSession(res);
        this.sessionSelected.emit(session);
      });
  }

  protected getDate(session: any): string {
    let timeStamp = session.lastUpdateTime;

    const date = new Date(timeStamp * 1000);

    return date.toLocaleString();
  }

  private fromApiResultToSession(res: any): Session {
    return {
      id: res?.id ?? '',
      appName: res?.appName ?? '',
      userId: res?.userId ?? '',
      state: res?.state ?? [],
      events: res?.events ?? [],
    };
  }

  reloadSession(sessionId: string) {
    this.sessionService
      .getSession(this.userId, this.appName, sessionId)
      .subscribe((res) => {
        const session = this.fromApiResultToSession(res);
        this.sessionReloaded.emit(session);
      });
  }

  refreshSession(session?: string) {
    this.refreshSessionsSubject.next();
    if (this.sessionList.length <= 1) {
      return undefined;
    } else {
      let index = this.sessionList.findIndex((s) => s.id == session);
      if (index == this.sessionList.length - 1) {
        index = -1;
      }
      return this.sessionList[index + 1];
    }
  }
}
