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

import {Component, EventEmitter, Input, OnInit, Output} from '@angular/core';
import {MatDialog} from '@angular/material/dialog';
import {Subject, switchMap} from 'rxjs';
import {Session} from '../../core/models/Session';
import {SessionService} from '../../core/services/session.service';

@Component({
  selector: 'app-session-tab',
  templateUrl: './session-tab.component.html',
  styleUrl: './session-tab.component.scss',
  standalone: false,
})
export class SessionTabComponent implements OnInit {
  @Input() userId: string = '';
  @Input() appName: string = '';
  @Input() sessionId: string = '';

  @Output() readonly sessionSelected = new EventEmitter<Session>();
  @Output() readonly sessionReloaded = new EventEmitter<Session>();

  sessionList: any[] = [];
  initialContextState: string = ''; // For creating new session with initial context
  jsonError: string | null = null;   // For JSON parsing errors for initialContextState

  private refreshSessionsSubject = new Subject<void>();

  constructor(
    private sessionService: SessionService,
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

  // Method to create a new session, potentially with initial state
  createNewSession() {
    let initialStateObj: object | undefined;
    this.jsonError = null; // Reset error

    if (this.initialContextState.trim() !== '') {
      try {
        initialStateObj = JSON.parse(this.initialContextState);
      } catch (e) {
        this.jsonError = 'Invalid JSON format for initial context state.';
        console.error('JSON parsing error:', e);
        return; // Stop if JSON is invalid
      }
    }

    this.sessionService
        .createSession(this.userId, this.appName, initialStateObj)
        .subscribe({
          next: (newSession) => {
            this.refreshSessionsSubject.next(); // Refresh the list
            // Automatically select the new session
            if (newSession && newSession.id) {
              this.getSession(newSession.id);
            }
            this.jsonError = null; // Clear any previous errors
          },
          error: (err) => {
            console.error('Error creating session:', err);
            this.jsonError = 'Failed to create session. See console for details.';
          }
        });
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
