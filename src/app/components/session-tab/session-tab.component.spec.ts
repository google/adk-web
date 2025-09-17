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

import { ComponentFixture, TestBed } from '@angular/core/testing';
import { MatDialog, MatDialogModule } from '@angular/material/dialog';
import { SessionTabComponent } from './session-tab.component';
import { SESSION_SERVICE, SessionService } from '../../core/services/session.service';
import { of } from 'rxjs';
import { NoopAnimationsModule } from '@angular/platform-browser/animations';

describe('SessionTabComponent', () => {
  let component: SessionTabComponent;
  let fixture: ComponentFixture<SessionTabComponent>;

  beforeEach(async () => {
    const sessionService = jasmine.createSpyObj<SessionService>([
      'listSessions',
      'getSession',
    ]);
    sessionService.listSessions.and.returnValue(of([]));
    sessionService.getSession.and.returnValue(of({} as any));

    await TestBed.configureTestingModule({
      imports: [MatDialogModule, SessionTabComponent, NoopAnimationsModule],
      providers: [
        { provide: MatDialog, useValue: jasmine.createSpyObj('MatDialog', ['open']) },
        { provide: SESSION_SERVICE, useValue: sessionService },
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(SessionTabComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
