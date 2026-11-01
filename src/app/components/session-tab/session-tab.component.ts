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
import {ChangeDetectionStrategy, ChangeDetectorRef, Component, EventEmitter, inject, Input, OnInit, Output, signal} from '@angular/core';
import {FormControl, FormsModule, ReactiveFormsModule} from '@angular/forms';
import {MatButtonModule} from '@angular/material/button';
import {MatFormFieldModule} from '@angular/material/form-field';
import {MatIcon, MatIconModule} from '@angular/material/icon';
import {MatDialog, MatDialogModule} from '@angular/material/dialog';
import {MatInputModule} from '@angular/material/input';
import {MatProgressBar} from '@angular/material/progress-bar';
import {ActivatedRoute} from '@angular/router';
import {of, Subject} from 'rxjs';
import {catchError, debounceTime, first, map, switchMap, tap, withLatestFrom} from 'rxjs/operators';

import {Session} from '../../core/models/Session';
import {FEATURE_FLAG_SERVICE} from '../../core/services/interfaces/feature-flag';
import {SESSION_SERVICE} from '../../core/services/interfaces/session';
import {UI_STATE_SERVICE} from '../../core/services/interfaces/ui-state';
import {TestsService} from '../../core/services/tests.service';

import {DeleteSessionDialogComponent, DeleteSessionDialogData} from './delete-session-dialog/delete-session-dialog.component';
import {SessionTabMessagesInjectionToken} from './session-tab.component.i18n';

/**
 * Displays a list of sessions and handles session loading and pagination.
 */
@Component({
  changeDetection: ChangeDetectionStrategy.Default,
  selector: 'app-session-tab',
  templateUrl: './session-tab.component.html',
  styleUrl: './session-tab.component.scss',
  imports: [
    NgClass,
    AsyncPipe,
    MatProgressBar,
    MatIcon,
    MatFormFieldModule,
    MatInputModule,
    FormsModule,
    ReactiveFormsModule,
    MatButtonModule,
    MatIconModule,
    MatDialogModule,
  ],
  standalone: true,
})
export class SessionTabComponent implements OnInit {
  @Input() userId = '';
  @Input() appName = '';
  @Input() sessionId = '';

  @Output() readonly sessionSelected = new EventEmitter<string>();
  @Output() readonly sessionReloaded = new EventEmitter<string>();

  readonly SESSIONS_PAGE_LIMIT = 100;
  sessionList: Session[] = [];
  canLoadMoreSessions = false;
  pageToken = '';
  filterControl = new FormControl('');
  
  editingSessionId: string | null = null;
  sessionNameControl = new FormControl('');

  private refreshSessionsSubject = new Subject<void>();
  private readonly route = inject(ActivatedRoute);
  private readonly changeDetectorRef = inject(ChangeDetectorRef);
  protected readonly sessionService = inject(SESSION_SERVICE);
  protected readonly uiStateService = inject(UI_STATE_SERVICE);
  protected readonly i18n = inject(SessionTabMessagesInjectionToken);
  protected readonly featureFlagService = inject(FEATURE_FLAG_SERVICE);
  protected readonly dialog = inject(MatDialog);
  protected readonly testsService = inject(TestsService);
  isSessionFilteringEnabled =
      this.featureFlagService.isSessionFilteringEnabled();

  isLoadingMoreInProgress = signal(false);
  isInitialized = signal(false);

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
              this.isInitialized.set(true);
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
                          (a: Session, b: Session) => Number(b.lastUpdateTime) -
                              Number(a.lastUpdateTime),
                      );
              this.pageToken = nextPageToken ?? '';
              this.canLoadMoreSessions = !!nextPageToken;
              this.changeDetectorRef.markForCheck();
            }))
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

  getSession(sessionId: string|undefined) {
    if (sessionId) {
      this.sessionSelected.emit(sessionId);
    }
  }

  loadMoreSessions() {
    this.isLoadingMoreInProgress.set(true);
    this.refreshSessionsSubject.next();
  }

  getSessionDisplayName(session: Session): string {
    const meta = session.state?.['__session_metadata__'] as any;
    return meta?.displayName || session.id;
  }

  hasDisplayName(session: Session): boolean {
    const meta = session.state?.['__session_metadata__'] as any;
    return !!meta?.displayName;
  }

  startEditSessionName(session: Session) {
    this.editingSessionId = session.id!;
    this.sessionNameControl.setValue(this.getSessionDisplayName(session));
  }

  cancelEditSessionName() {
    this.editingSessionId = null;
    this.sessionNameControl.setValue('');
  }

  saveSessionName(session: Session) {
    if (!this.editingSessionId || !session.id) return;
    
    const newName = this.sessionNameControl.value;
    const currentState = session.state || {};
    const updatedState = {
      ...currentState,
      __session_metadata__: {
        ...(currentState['__session_metadata__'] as any || {}),
        displayName: newName
      }
    };
    
    // Optimistic update
    session.state = updatedState;
    this.editingSessionId = null;

    this.sessionService.updateSession(this.userId, this.appName, session.id, { stateDelta: updatedState }).subscribe({
      error: () => {
        // Revert on error could be implemented here
      }
    });
  }

  deleteSession(event: Event, session: Session) {
    event.stopPropagation();
    const sessionId = session.id!;
    const displayName = this.getSessionDisplayName(session);
    let message = `Are you sure you want to delete session ${sessionId}?`;
    if (displayName !== sessionId) {
      message = `Are you sure you want to delete session "${displayName}" (${sessionId})?`;
    }

    const dialogData: DeleteSessionDialogData = {
      title: 'Confirm delete',
      message: message,
      confirmButtonText: 'Delete',
      cancelButtonText: 'Cancel',
    };

    const dialogRef = this.dialog.open(DeleteSessionDialogComponent, {
      width: '600px',
      data: dialogData,
    });

    dialogRef.afterClosed().subscribe((result: boolean) => {
      if (result) {
        this.sessionService.deleteSession(this.userId, this.appName, sessionId).subscribe(() => {
          this.refreshSession(sessionId);
        });
      }
    });
  }

  promoteToTest(event: Event, session: Session) {
    event.stopPropagation();
    const testName = window.prompt('Enter test name (e.g., test1):');
    if (!testName) return;

    this.sessionService.getSession(this.userId, this.appName, session.id!)
      .subscribe((fullSession) => {
        const sessionData = { events: fullSession.events };
        this.testsService.createTest(this.appName, testName, sessionData)
          .subscribe({
            next: () => {
              alert(`Test ${testName} created successfully.`);
            },
            error: (err) => {
              alert(`Error creating test: ${err.message || err}`);
            }
          });
      });
  }

  protected getDate(session: Session): string {
    const timeStamp = session.lastUpdateTime || 0;

    const date = new Date(timeStamp * 1000);

    return date.toLocaleString();
  }

  reloadSession(sessionId: string) {
    this.sessionReloaded.emit(sessionId);
  }

  refreshSession(session?: string) {
    let nextSession = null;

    if (this.sessionList.length > 0) {
      let index = this.sessionList.findIndex((s) => s.id === session);
      if (index === this.sessionList.length - 1) {
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
