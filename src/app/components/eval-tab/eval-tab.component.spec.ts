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
import { of, throwError } from 'rxjs';
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
  let evalService: jasmine.SpyObj<EvalService>;

  beforeEach(async () => {
    evalService = jasmine.createSpyObj<EvalService>([
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

  it('should build stable sorted eval history entries', () => {
    evalService.listEvalResults.and.returnValue(of(['result-1', 'result-2']));
    evalService.getEvalResult.and.callFake((appName: string, evalResultId: string) => {
      const creationTimestamp =
          evalResultId === 'result-1' ? 1710000000 : 1720000000;

      return of({
        evalSetId: 'set-1',
        creationTimestamp,
        evalCaseResults: [{
          id: evalResultId,
          evalId: `case-${evalResultId}`,
          finalEvalStatus: 1,
          evalMetricResults: [],
          evalMetricResultPerInvocation: [],
          sessionId: 'session-id',
          sessionDetails: {},
          overallEvalMetricResults: [],
        }],
      } as any);
    });

    fixture.componentRef.setInput('appName', 'test-app');
    fixture.detectChanges();
    component.selectEvalSet('set-1');

    expect(component['evalHistorySorted'].map((entry: any) => entry.timestamp))
        .toEqual(['1720000000', '1710000000']);
  });

  it('should toggle history card without errors after history refresh', () => {
    fixture.componentRef.setInput('appName', 'test-app');
    fixture.detectChanges();

    component['appEvaluationResults'] = {
      'test-app': {
        'set-1': {
          '1710000000': {isToggled: false, evaluationResults: []},
        },
      },
    } as any;
    component.selectEvalSet('set-1');

    expect(() => component.toggleHistoryStatusCard('1710000000')).not.toThrow();
    expect(component.isEvaluationStatusCardToggled('1710000000')).toBeTrue();
  });

  it('should keep successful eval history entries when one result fails', () => {
    evalService.listEvalResults.and.returnValue(of(['result-1', 'result-2']));
    evalService.getEvalResult.and.callFake((appName: string, evalResultId: string) => {
      if (evalResultId === 'result-2') {
        return throwError(() => new Error('result failed'));
      }

      return of({
        evalSetId: 'set-1',
        creationTimestamp: 1710000000,
        evalCaseResults: [{
          id: evalResultId,
          evalId: `case-${evalResultId}`,
          finalEvalStatus: 1,
          evalMetricResults: [],
          evalMetricResultPerInvocation: [],
          sessionId: 'session-id',
          sessionDetails: {},
          overallEvalMetricResults: [],
        }],
      } as any);
    });

    fixture.componentRef.setInput('appName', 'test-app');
    fixture.detectChanges();
    component.selectEvalSet('set-1');

    expect(component['evalHistorySorted'].length).toBe(1);
    expect(component['evalHistorySorted'][0].timestamp).toBe('1710000000');
  });

  it('should safely ignore non-array eval result id responses', () => {
    evalService.listEvalResults.and.returnValue(of({not: 'an array'} as any));

    fixture.componentRef.setInput('appName', 'test-app');
    fixture.detectChanges();
    component.selectEvalSet('set-1');

    expect(evalService.getEvalResult).not.toHaveBeenCalled();
    expect(component['evalHistorySorted']).toEqual([]);
  });

  it('should refresh history once after loading all eval results', () => {
    evalService.listEvalResults.and.returnValue(of(['result-1', 'result-2']));
    evalService.getEvalResult.and.callFake((appName: string, evalResultId: string) => {
      const creationTimestamp =
          evalResultId === 'result-1' ? 1710000000 : 1720000000;

      return of({
        evalSetId: 'set-1',
        creationTimestamp,
        evalCaseResults: [{
          id: evalResultId,
          evalId: `case-${evalResultId}`,
          finalEvalStatus: 1,
          evalMetricResults: [],
          evalMetricResultPerInvocation: [],
          sessionId: 'session-id',
          sessionDetails: {},
          overallEvalMetricResults: [],
        }],
      } as any);
    });
    const refreshSpy =
        spyOn<any>(component, 'refreshEvalHistorySorted').and.callThrough();

    fixture.componentRef.setInput('appName', 'test-app');
    fixture.detectChanges();
    component.selectedEvalSet = 'set-1';
    refreshSpy.calls.reset();
    component['getEvaluationResult']();

    expect(refreshSpy).toHaveBeenCalledTimes(1);
  });

  it('treats listEvalResults 404 as empty history', () => {
    evalService.listEvalResults.and.returnValue(
        throwError(() => ({status: 404, statusText: 'Not Found'})));

    fixture.componentRef.setInput('appName', 'test-app');
    fixture.detectChanges();
    component.selectEvalSet('set-1');

    expect(evalService.getEvalResult).not.toHaveBeenCalled();
    expect(component['evalHistorySorted']).toEqual([]);
  });

  it('preserves existing eval results when listEvalResults fails non-404', () => {
    evalService.listEvalResults.and.returnValue(
        throwError(() => ({status: 500, statusText: 'Server Error'})));
    component['appEvaluationResults'] = {
      'test-app': {
        'set-1': {
          '1710000000': {
            isToggled: false,
            evaluationResults: [{
              setId: 'set-1',
              evalId: 'case-1',
              finalEvalStatus: 1,
              evalMetricResults: [],
              overallEvalMetricResults: [],
              sessionId: 'session-id',
              sessionDetails: {},
            }],
          },
        },
      },
    } as any;
    component.selectedEvalSet = 'set-1';
    component['refreshEvalHistorySorted']();
    const previousHistory = [...component['evalHistorySorted']];

    fixture.componentRef.setInput('appName', 'test-app');
    fixture.detectChanges();
    component['getEvaluationResult']();

    expect(evalService.getEvalResult).not.toHaveBeenCalled();
    expect(component['appEvaluationResults']['test-app']['set-1']['1710000000'])
        .toBeDefined();
    expect(component['evalHistorySorted']).toEqual(previousHistory);
  });

  it('hides eval tab when getEvalSet returns 404 regardless of statusText', () => {
    const shouldShowTabSpy = spyOn(component.shouldShowTab, 'emit');
    evalService.getEvalSets.and.returnValue(
        throwError(() => ({status: 404, statusText: 'Anything'})));

    fixture.componentRef.setInput('appName', 'test-app');
    fixture.detectChanges();
    component.getEvalSet();

    expect(shouldShowTabSpy).toHaveBeenCalledWith(false);
  });
});
