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
import {
  MAT_DIALOG_DATA,
  MatDialogModule,
  MatDialogRef,
} from '@angular/material/dialog';
import { PendingEventDialogComponent } from './pending-event-dialog.component';
import {createFakeLlmResponse} from '../../core/models/testing/fake_genai_types';
import { AgentService } from '../../core/services/agent.service';
import { of } from 'rxjs';
import { NoopAnimationsModule } from '@angular/platform-browser/animations';
import {AGENT_SERVICE} from '../../core/services/interfaces/agent';
import {PENDING_EVENT_SERVICE, PendingEventService} from '../../core/services/interfaces/pendingevent';

describe('PendingEventDialogComponent', () => {
  let component: PendingEventDialogComponent;
  let fixture: ComponentFixture<PendingEventDialogComponent>;
  const mockDialogRef = {
    close: jasmine.createSpy('close'),
  };

  beforeEach(async () => {
    const agentService = jasmine.createSpyObj<AgentService>(['runSse']);
    agentService.runSse.and.returnValue(of(createFakeLlmResponse()));

    const mockPendingEventService =
        jasmine.createSpyObj<PendingEventService>(['createFunctionResponse']);

    await TestBed
        .configureTestingModule({
          imports: [
            MatDialogModule,
            PendingEventDialogComponent,
            NoopAnimationsModule,
          ],
          providers: [
            {provide: MatDialogRef, useValue: mockDialogRef},
            {
              provide: MAT_DIALOG_DATA,
              useValue: {
                event: {},
                appName: 'Test App',
                userId: 'testuser',
                sessionId: 'testsession',
              },
            },
            {provide: AGENT_SERVICE, useValue: agentService},
            {provide: PENDING_EVENT_SERVICE, useValue: mockPendingEventService},

          ],
        })
        .compileComponents();

    fixture = TestBed.createComponent(PendingEventDialogComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
