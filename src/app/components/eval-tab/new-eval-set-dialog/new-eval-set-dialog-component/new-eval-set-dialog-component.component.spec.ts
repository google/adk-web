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
import { NewEvalSetDialogComponentComponent } from './new-eval-set-dialog-component.component';
import { EvalService } from '../../../../core/services/eval.service';
import { of } from 'rxjs';
import { NoopAnimationsModule } from '@angular/platform-browser/animations';
import {EVAL_SERVICE} from '../../../../core/services/interfaces/eval';

describe('NewEvalSetDialogComponentComponent', () => {
  let component: NewEvalSetDialogComponentComponent;
  let fixture: ComponentFixture<NewEvalSetDialogComponentComponent>;
  const mockDialogRef = {
    close: jasmine.createSpy('close'),
  };

  beforeEach(async () => {
    const evalService = jasmine.createSpyObj<EvalService>(['createNewEvalSet']);
    evalService.createNewEvalSet.and.returnValue(of({}));

    await TestBed.configureTestingModule({
      imports: [
        MatDialogModule,
        NewEvalSetDialogComponentComponent,
        NoopAnimationsModule,
      ],
      providers: [
        { provide: MatDialogRef, useValue: mockDialogRef },
        { provide: MAT_DIALOG_DATA, useValue: {} },
        { provide: EVAL_SERVICE, useValue: evalService },
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(NewEvalSetDialogComponentComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
