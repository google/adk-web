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
import { EvalTabComponent } from './eval-tab.component';
import { EvalService } from '../../core/services/eval.service';
import { SessionService } from '../../core/services/session.service';
import { of } from 'rxjs';
import { NoopAnimationsModule } from '@angular/platform-browser/animations';
import { ActivatedRoute } from '@angular/router';
import {
  FeatureFlagService,
} from '../../core/services/feature-flag.service';
import {EVAL_SERVICE} from '../../core/services/interfaces/eval';
import {SESSION_SERVICE} from '../../core/services/interfaces/session';
import {FEATURE_FLAG_SERVICE} from '../../core/services/interfaces/feature-flag';

describe('EvalTabComponent', () => {
  let component: EvalTabComponent;
  let fixture: ComponentFixture<EvalTabComponent>;

  beforeEach(async () => {
    const evalService = jasmine.createSpyObj<EvalService>([
      'getEvalSets',
      'listEvalCases',
      'runEval',
      'getEvalCase',
      'deleteEvalCase',
      'listEvalResults',
      'getEvalResult',
    ]);
    evalService.getEvalSets.and.returnValue(of([]));
    evalService.listEvalCases.and.returnValue(of([]));
    evalService.runEval.and.returnValue(of([]));
    evalService.getEvalCase.and.returnValue(of({} as any));
    evalService.deleteEvalCase.and.returnValue(of({} as any));
    evalService.listEvalResults.and.returnValue(of([]));
    evalService.getEvalResult.and.returnValue(of({} as any));

    const sessionService = jasmine.createSpyObj<SessionService>([
      'getSession',
    ]);
    sessionService.getSession.and.returnValue(of({} as any));

    const featureFlagService = jasmine.createSpyObj<FeatureFlagService>([
      'isImportSessionEnabled',
      'isEditFunctionArgsEnabled',
      'isSessionUrlEnabled',
      'isA2ACardEnabled',
    ]);
    featureFlagService.isImportSessionEnabled.and.returnValue(of(false));
    featureFlagService.isEditFunctionArgsEnabled.and.returnValue(of(false));
    featureFlagService.isSessionUrlEnabled.and.returnValue(of(false));
    featureFlagService.isA2ACardEnabled.and.returnValue(of(false));

    await TestBed.configureTestingModule({
      imports: [MatDialogModule, EvalTabComponent, NoopAnimationsModule],
      providers: [
        { provide: MatDialog, useValue: jasmine.createSpyObj('MatDialog', ['open']) },
        { provide: EVAL_SERVICE, useValue: evalService },
        { provide: SESSION_SERVICE, useValue: sessionService },
        {
          provide: ActivatedRoute,
          useValue: {
            snapshot: { queryParams: {} },
            queryParams: of({}),
          },
        },
        { provide: FEATURE_FLAG_SERVICE, useValue: featureFlagService },
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(EvalTabComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
