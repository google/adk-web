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

import {ComponentFixture, TestBed,} from '@angular/core/testing';
import {MatDialog, MatDialogModule} from '@angular/material/dialog';
import {By} from '@angular/platform-browser';
import {NoopAnimationsModule} from '@angular/platform-browser/animations';
import {ActivatedRoute} from '@angular/router';
// 1p-ONLY-IMPORTS: import {beforeEach, describe, it}
import {of} from 'rxjs';

import {FEATURE_FLAG_SERVICE} from '../../core/services/interfaces/feature-flag';
import {SESSION_SERVICE, SessionService,} from '../../core/services/interfaces/session';
import {UI_STATE_SERVICE,} from '../../core/services/interfaces/ui-state';
import {MockFeatureFlagService} from '../../core/services/testing/mock-feature-flag.service';
import {MockSessionService} from '../../core/services/testing/mock-session.service';
import {MockUiStateService} from '../../core/services/testing/mock-ui-state.service';
import {fakeAsync, initTestBed, tick} from '../../testing/utils';

import {SessionTabComponent} from './session-tab.component';

const CSS_SELECTORS = {
  SESSION_LIST: By.css('.session-tab-container'),
  PROGRESS_BAR: By.css('mat-progress-bar'),
};

describe('SessionTabComponent', () => {
  let component: SessionTabComponent;
  let fixture: ComponentFixture<SessionTabComponent>;
  let mockUiStateService: MockUiStateService;
  let mockFeatureFlagService: MockFeatureFlagService;
  let sessionService: MockSessionService;

  beforeEach(async () => {
    sessionService = new MockSessionService();
    mockUiStateService = new MockUiStateService();
    mockFeatureFlagService = new MockFeatureFlagService();

    sessionService.listSessionsResponse.next({
      items: [],
      nextPageToken: '',
    });
    sessionService.canEditResponse.next(true);

    initTestBed();  // required for 1p compatibility
    await TestBed
        .configureTestingModule({
          imports: [MatDialogModule, SessionTabComponent, NoopAnimationsModule],
          providers: [
            {
              provide: MatDialog,
              useValue: jasmine.createSpyObj('MatDialog', ['open']),
            },
            {provide: SESSION_SERVICE, useValue: sessionService},
            {provide: UI_STATE_SERVICE, useValue: mockUiStateService},
            {provide: FEATURE_FLAG_SERVICE, useValue: mockFeatureFlagService},
            {
              provide: ActivatedRoute,
              useValue: {
                snapshot: {queryParams: {}},
                queryParams: of({}),
              },
            },
          ],
        })
        .compileComponents();

    fixture = TestBed.createComponent(SessionTabComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  describe('on initialization', () => {
    it('sets filter from query param if session id is provided and filtering is enabled',
       () => {
         mockFeatureFlagService.isSessionFilteringEnabledResponse.next(true);
         (TestBed.inject(ActivatedRoute) as any).snapshot.queryParams = {
           'session': '123'
         };
         const customFixture = TestBed.createComponent(SessionTabComponent);
         customFixture.detectChanges();
         expect(customFixture.componentInstance.filterControl.value)
             .toBe('123');
       });
  });

  describe('when session filtering is enabled', () => {
    beforeEach(() => {
      mockFeatureFlagService.isSessionFilteringEnabledResponse.next(true);
      sessionService.listSessions.calls.reset();
    });

    describe('when filter is changed', async () => {
      beforeEach(fakeAsync(() => {
        component.filterControl.setValue('abc');
        tick(300);  // for filterControl.valueChanges debounceTime(300)
      }));


      describe('when list is being loaded', () => {
        beforeEach(fakeAsync(() => {
          mockUiStateService.isSessionListLoadingResponse.next(true);
          fixture.detectChanges();
        }));

        it('should display progress bar', () => {
          expect(fixture.debugElement.query(CSS_SELECTORS.PROGRESS_BAR))
              .toBeTruthy();
        });

        it(
            'should hide session list', fakeAsync(() => {
              expect(fixture.debugElement.query(CSS_SELECTORS.SESSION_LIST))
                  .toBeFalsy();
            }));
      });

      it('should call listSessions with filter', fakeAsync(() => {
                    expect(sessionService.listSessions)
                        .toHaveBeenCalledWith(
                            component.userId,
                            component.appName,
                            {
                              filter: 'abc',
                              pageToken: '',
                              pageSize: 100,
                            },
                        );
                  }));

      describe('on refresh', () => {
        beforeEach((fakeAsync(() => {
          component.refreshSession();
          tick(300);  // for debounceTime
        })));

        it('should reset session list', fakeAsync(() => {
                      expect(component.sessionList).toEqual([]);
                    }));

        it('should reset page token and filter', fakeAsync(() => {
                      expect(sessionService.listSessions)
                          .toHaveBeenCalledWith(
                              component.userId,
                              component.appName,
                              {
                                filter: undefined,
                                pageToken: '',
                                pageSize: 100,
                              },
                          );
                    }));
      });

      describe('when list is loaded', () => {
        beforeEach(fakeAsync(() => {
          mockUiStateService.isSessionListLoadingResponse.next(false);
          sessionService.listSessionsResponse.next({
            items: [{id: 'session2', lastUpdateTime: 2}],
            nextPageToken: '',
          });
          fixture.detectChanges();
        }));

        it(
            'should show session list', fakeAsync(() => {
              expect(fixture.debugElement.query(CSS_SELECTORS.SESSION_LIST))
                  .toBeTruthy();
            }));

        it(
            'should show the filtered list items only', fakeAsync(() => {
              expect(fixture.debugElement.query(CSS_SELECTORS.SESSION_LIST)
                         .children.length)
                  .toBe(1);
              expect(fixture.debugElement.query(CSS_SELECTORS.SESSION_LIST)
                         .children[0]
                         .nativeElement.innerText)
                  .toContain('session2');
            }));
      });
    });

    describe('when "Load more" is clicked', () => {
      beforeEach(fakeAsync(() => {
        sessionService.listSessionsResponse.next({
          items: [
            {id: 'session1', lastUpdateTime: 1},
            {id: 'session1', lastUpdateTime: 1},
            {id: 'session3', lastUpdateTime: 1}
          ],
          nextPageToken: 'nextPage',
        });
        fixture = TestBed.createComponent(SessionTabComponent);
        component = fixture.componentInstance;
        fixture.detectChanges();
        tick(500);  // for setTimeout in ngOnInit
        expect(component.pageToken).toBe('nextPage');
        sessionService.listSessions.calls.reset();

        component.loadMoreSessions();
      }));

      it('should call listSessions with pageToken', fakeAsync(() => {
                    expect(sessionService.listSessions)
                        .toHaveBeenCalledWith(
                            component.userId,
                            component.appName,
                            {
                              filter: undefined,
                              pageToken: 'nextPage',
                              pageSize: 100,
                            },
                        );
                  }));

      describe('when list is being loaded', () => {
        beforeEach(fakeAsync(() => {
          mockUiStateService.isSessionListLoadingResponse.next(true);
          fixture.detectChanges();
        }));

        it('should display progress bar', () => {
          expect(fixture.debugElement.query(CSS_SELECTORS.PROGRESS_BAR))
              .toBeTruthy();
        });

        describe('when list is loaded', () => {
          beforeEach(fakeAsync(() => {
            mockUiStateService.isSessionListLoadingResponse.next(false);
            fixture.detectChanges();
            ;
          }));

          it(
              'should hide progress bar', fakeAsync(() => {
                expect(fixture.debugElement.query(CSS_SELECTORS.PROGRESS_BAR))
                    .toBeFalsy();
              }));

          it(
              'should show session list', fakeAsync(() => {
                expect(fixture.debugElement.query(CSS_SELECTORS.SESSION_LIST))
                    .toBeTruthy();
              }));
          it('should extend list with new sessions', () => {
            expect(fixture.debugElement.query(CSS_SELECTORS.SESSION_LIST)
                       .children.length)
                .toBe(2);
          });
        });
      });
    });
  });

  describe('when getting a session', () => {
    beforeEach(() => {
      spyOn(component.sessionSelected, 'emit');
    });

    it('should set session loading state to true', () => {
      component.getSession('session1');
      expect(mockUiStateService.setIsSessionLoading).toHaveBeenCalledWith(true);
    });

    describe('when getting a session is successful', () => {
      beforeEach(() => {
        sessionService.getSessionResponse.next({} as any);
        component.getSession('session1');
      });

      it('emits sessionSelected', () => {
        expect(component.sessionSelected.emit).toHaveBeenCalled();
      });

      it('sets session loading state to false', fakeAsync(() => {
                    expect(mockUiStateService.setIsSessionLoading)
                        .toHaveBeenCalledWith(
                            false,
                        );
                  }));
    });

    describe('when getting a session throws error', () => {
      beforeEach(() => {
        sessionService.getSessionResponse.error(new Error('error'));
        component.getSession('session1');
      });

      it('hides session loading state', fakeAsync(() => {
                    expect(mockUiStateService.setIsSessionLoading)
                        .toHaveBeenCalledWith(
                            false,
                        );
                  }));

      it(
          'does not emit sessionSelected', fakeAsync(() => {
            expect(component.sessionSelected.emit).not.toHaveBeenCalled();
          }));

      describe('on retry', () => {
        beforeEach(() => {
          sessionService.getSession.calls.reset();
          sessionService.getSessionResponse.next({} as any);
          component.getSession('session1');
        });

        it('fetches session again', () => {
          expect(sessionService.getSession).toHaveBeenCalled();
        });
      });
    });
  });

  describe('when reloading a session', () => {
    beforeEach(() => {
      spyOn(component.sessionReloaded, 'emit');
    });

    describe('when reloading a session is successful', () => {
      beforeEach(() => {
        sessionService.getSessionResponse.next({} as any);
        component.reloadSession('session1');
      });

      it('emits sessionReloaded', () => {
        expect(component.sessionReloaded.emit).toHaveBeenCalled();
      });
    });

    describe('when reloading a session throws error', () => {
      beforeEach(() => {
        sessionService.getSessionResponse.error(new Error('error'));
        component.reloadSession('session1');
      });

      it('does not emit sessionReloaded', () => {
        expect(component.sessionReloaded.emit).not.toHaveBeenCalled();
      });

      describe('on retry', () => {
        beforeEach(() => {
          sessionService.getSession.calls.reset();
          sessionService.getSessionResponse.next({} as any);
          component.reloadSession('session1');
        });

        it('fetches session again', () => {
          expect(sessionService.getSession).toHaveBeenCalled();
        });
      });
    });
  });

  describe('on refresh', () => {
    beforeEach(fakeAsync(() => {
      mockFeatureFlagService.isSessionFilteringEnabledResponse.next(true);
      sessionService.listSessionsResponse.next({
        items: [{id: 'session1', lastUpdateTime: 1}],
        nextPageToken: 'nextPage',
      });
      fixture = TestBed.createComponent(SessionTabComponent);
      component = fixture.componentInstance;
      fixture.detectChanges();
      tick(500);  // for setTimeout in ngOnInit
      expect(component.pageToken).toBe('nextPage');
      expect(component.sessionList.length).toBe(1);
      sessionService.listSessions.calls.reset();
      component.refreshSession();
      tick(300);  // for debounceTime
    }));

    it('should reset page token and session list', fakeAsync(() => {
         expect(sessionService.listSessions)
             .toHaveBeenCalledWith(
                 component.userId,
                 component.appName,
                 {
                   filter: undefined,
                   pageToken: '',
                   pageSize: 100,
                 },
             );
       }));
  });
});
