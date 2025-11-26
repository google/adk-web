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

import {AsyncPipe, NgClass} from '@angular/common';
import {ChangeDetectorRef, Component, EventEmitter, inject, Input, OnInit, Output, signal,} from '@angular/core';
import {FormControl, FormsModule, ReactiveFormsModule} from '@angular/forms';
import {MatButtonModule} from '@angular/material/button';
import {MatChip} from '@angular/material/chips';
import {MatFormFieldModule} from '@angular/material/form-field';
import {MatIcon, MatIconModule} from '@angular/material/icon';
import {MatInputModule} from '@angular/material/input';
import {MatProgressBar} from '@angular/material/progress-bar';
import {ActivatedRoute} from '@angular/router';
import {BehaviorSubject, combineLatest, of, Subject} from 'rxjs';
import {catchError, debounceTime, map, switchMap, tap,} from 'rxjs/operators';

import {Session} from '../../core/models/Session';
import {FeatureFlagService} from '../../core/services/feature-flag.service';
import {FEATURE_FLAG_SERVICE} from '../../core/services/interfaces/feature-flag';
import {SESSION_SERVICE} from '../../core/services/interfaces/session';
import {UI_STATE_SERVICE} from '../../core/services/interfaces/ui-state';

import {SessionTabMessagesInjectionToken} from './session-tab.component.i18n';

@Component({
  selector: 'app-session-tab',
  templateUrl: './session-tab.component.html',
  styleUrl: './session-tab.component.scss',
  imports: [
    NgClass,
    AsyncPipe,
    MatChip,
    MatProgressBar,
    MatIcon,
    MatFormFieldModule,
    MatInputModule,
    FormsModule,
    ReactiveFormsModule,
    MatButtonModule,
    MatIconModule,
  ],
  standalone: true,
})
export class SessionTabComponent implements OnInit {
  @Input() userId: string = '';
  @Input() appName: string = '';
  @Input() sessionId: string = '';

  @Output() readonly sessionSelected = new EventEmitter<Session>();
  @Output() readonly sessionReloaded = new EventEmitter<Session>();

  readonly SESSIONS_PAGE_LIMIT = 100;
  sessionList: any[] = [];
  canLoadMoreSessions = false;
  pageToken = '';
  filterControl = new FormControl('');

  private refreshSessionsSubject = new Subject<void>();
  private getSessionSubject = new Subject<string>();
  private reloadSessionSubject = new Subject<string>();
  private readonly route = inject(ActivatedRoute);
  private readonly changeDetectorRef = inject(ChangeDetectorRef);
  protected readonly sessionService = inject(SESSION_SERVICE);
  protected readonly uiStateService = inject(UI_STATE_SERVICE);
  protected readonly i18n = inject(SessionTabMessagesInjectionToken);
  protected readonly featureFlagService = inject(FEATURE_FLAG_SERVICE);
  isSessionFilteringEnabled =
      this.featureFlagService.isSessionFilteringEnabled();

  isLoadingMoreInProgress = signal(false);

  constructor() {
    this.filterControl.valueChanges.pipe(debounceTime(300)).subscribe(() => {
      this.pageToken = '';
      this.sessionList = [];
      this.refreshSessionsSubject.next();
    });

    this.refreshSessionsSubject
        .pipe(
            tap(() => {
              this.uiStateService.setIsSessionListLoading(true);
            }),
            switchMap(() => {
              const filter = this.filterControl.value || undefined;
              if (this.isSessionFilteringEnabled) {
                return this.sessionService
                    .listSessions(
                        this.userId,
                        this.appName,
                        {
                          filter,
                          pageToken: this.pageToken,
                          pageSize: this.SESSIONS_PAGE_LIMIT,
                        },
                        )
                    .pipe(catchError(() => of({items: [], nextPageToken: ''})));
              }
              return this.sessionService.listSessions(this.userId, this.appName)
                  .pipe(catchError(() => of({items: [], nextPageToken: ''})));
            }),
            tap(({items, nextPageToken}) => {
              this.sessionList =
                  Array
                      .from(
                          new Map(
                              [...this.sessionList, ...items].map(
                                  (session) =>
                                      [session.id,
                                       session,
              ]),
                              )
                              .values(),
                          )
                      .sort(
                          (a: any, b: any) => Number(b.lastUpdateTime) -
                              Number(a.lastUpdateTime),
                      );
              this.pageToken = nextPageToken ?? '';
              this.canLoadMoreSessions = !!nextPageToken;
              this.changeDetectorRef.markForCheck();
            })
            )
        .subscribe(
            () => {
              this.isLoadingMoreInProgress.set(false);
              this.uiStateService.setIsSessionListLoading(false);
            },
            () => {
              this.isLoadingMoreInProgress.set(false);
              this.uiStateService.setIsSessionListLoading(false);
            },
        );

    this.getSessionSubject
        .pipe(
            tap(() => {
              this.uiStateService.setIsSessionLoading(true);
            }),
            switchMap((sessionId) => {
              return this.sessionService
                  .getSession(this.userId, this.appName, sessionId)
                  .pipe(catchError(() => of(null)));
            }),
            tap((res) => {
              if (!res) return;
              const session = this.fromApiResultToSession(res);
              this.sessionSelected.emit(session);
              this.changeDetectorRef.markForCheck();
            }),
            )
        .subscribe(
            (session) => {
              this.uiStateService.setIsSessionLoading(false);
            },
            (error) => {
              this.uiStateService.setIsSessionLoading(false);
            },
        );

    this.reloadSessionSubject
        .pipe(
            switchMap(
                (sessionId) =>
                    this.sessionService
                        .getSession(this.userId, this.appName, sessionId)
                        .pipe(catchError(() => of(null)))),
            tap((res) => {
              if (!res) return;
              const session = this.fromApiResultToSession(res);
              this.sessionReloaded.emit(session);
              this.changeDetectorRef.markForCheck();
            }),
            )
        .subscribe();
  }

  ngOnInit(): void {
    this.featureFlagService.isSessionFilteringEnabled().subscribe(
        (isSessionFilteringEnabled) => {
          if (isSessionFilteringEnabled) {
            const sessionId = this.route.snapshot.queryParams['session'];
            if (sessionId) {
              this.filterControl.setValue(sessionId);
            }
          }
        },
    );

    setTimeout(() => {
      this.refreshSessionsSubject.next();
    }, 500);
  }

  getSession(sessionId: string) {
    this.getSessionSubject.next(sessionId);
  }

  loadMoreSessions() {
    this.isLoadingMoreInProgress.set(true);
    this.refreshSessionsSubject.next();
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
    this.reloadSessionSubject.next(sessionId);
  }

  refreshSession(session?: string) {
    let nextSession = null;

    if (this.sessionList.length > 0) {
      let index = this.sessionList.findIndex((s) => s.id == session);
      if (index == this.sessionList.length - 1) {
        index = -1;
      }
      nextSession = this.sessionList[index + 1];
    }

    if (this.isSessionFilteringEnabled) {
      this.filterControl.setValue('');
    } else {
      this.sessionList = [];
      this.refreshSessionsSubject.next();
    }

    return nextSession;
  }
}
