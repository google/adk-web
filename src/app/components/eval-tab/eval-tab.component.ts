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

import {SelectionModel} from '@angular/cdk/collections';
import {DecimalPipe, NgClass} from '@angular/common';
import {ChangeDetectionStrategy, ChangeDetectorRef, Component, computed, inject, InjectionToken, input, OnChanges, OnInit, output, signal, SimpleChanges, Type, viewChildren} from '@angular/core';
import {MatButton, MatIconButton} from '@angular/material/button';
import {MatButtonToggle, MatButtonToggleGroup} from '@angular/material/button-toggle';
import {MatCheckbox} from '@angular/material/checkbox';
import {MatDialog} from '@angular/material/dialog';
import {MatIcon} from '@angular/material/icon';
import {MatProgressSpinner} from '@angular/material/progress-spinner';
import {MatCell, MatCellDef, MatColumnDef, MatHeaderCell, MatHeaderCellDef, MatHeaderRow, MatHeaderRowDef, MatRow, MatRowDef, MatTable, MatTableDataSource} from '@angular/material/table';
import {MatTooltip} from '@angular/material/tooltip';
import {MatSelectModule} from '@angular/material/select';
import {MatFormFieldModule} from '@angular/material/form-field';
import {BehaviorSubject, of, forkJoin} from 'rxjs';
import {catchError, finalize, first, switchMap} from 'rxjs/operators';

import {DEFAULT_EVAL_METRICS, EvalCase, EvalMetric, EvaluationResult, EvalStatus, UserSimulatorConfig} from '../../core/models/Eval';
import {Session} from '../../core/models/Session';
import {FeatureFlagService} from '../../core/services/feature-flag.service';
import {EVAL_SERVICE} from '../../core/services/interfaces/eval';
import {FEATURE_FLAG_SERVICE} from '../../core/services/interfaces/feature-flag';
import {SESSION_SERVICE} from '../../core/services/interfaces/session';
import {STORAGE_SERVICE} from '../../core/services/interfaces/storage';

import {AddEvalSessionDialogComponent} from './add-eval-session-dialog/add-eval-session-dialog/add-eval-session-dialog.component';
import {EvalTabMessagesInjectionToken} from './eval-tab.component.i18n';
import {NewEvalSetDialogComponentComponent} from './new-eval-set-dialog/new-eval-set-dialog-component/new-eval-set-dialog-component.component';
import {RunEvalConfigDialogComponent} from './run-eval-config-dialog/run-eval-config-dialog.component';
import {DeleteSessionDialogComponent, DeleteSessionDialogData} from '../session-tab/delete-session-dialog/delete-session-dialog.component';
import {InfoTable} from '../info-table/info-table';
import { FormatMetricNamePipe } from './format-metric-name.pipe';

export const EVAL_TAB_COMPONENT = new InjectionToken<Type<EvalTabComponent>>(
    'EVAL_TAB_COMPONENT',
);



interface UIEvaluationResult {
  isToggled: boolean;
  evaluationResults: EvaluationResult[];
}

// Key: result timestamp
// Value: EvaluationResult
interface CaseEvaluationResult {
  [key: string]: UIEvaluationResult;
}

// Key: setId
// Value: CaseEvaluationResult
interface SetEvaluationResult {
  [key: string]: CaseEvaluationResult;
}


// Key: appId
// Value: SetEvaluationResult
interface AppEvaluationResult {
  [key: string]: SetEvaluationResult;
}

@Component({
  changeDetection: ChangeDetectionStrategy.Default,
  selector: 'app-eval-tab',
  templateUrl: './eval-tab.component.html',
  styleUrl: './eval-tab.component.scss',
  standalone: true,
  imports: [
    MatIcon,
    MatButton,
    MatIconButton,
    MatButtonToggle,
    MatButtonToggleGroup,
    MatTooltip,
    MatTable,
    MatColumnDef,
    MatHeaderCellDef,
    MatHeaderCell,
    MatCheckbox,
    MatCellDef,
    MatCell,
    DecimalPipe,
    NgClass,
    MatHeaderRowDef,
    MatHeaderRow,
    MatRowDef,
    MatRow,
    MatProgressSpinner,
    DeleteSessionDialogComponent,
    InfoTable,
    MatSelectModule,
    MatFormFieldModule,
    FormatMetricNamePipe,
  ],
})
export class EvalTabComponent implements OnInit, OnChanges {
  checkboxes = viewChildren(MatCheckbox);
  appName = input<string>('');
  userId = input<string>('');
  sessionId = input<string>('');
  readonly sessionSelected = output<Session>();
  readonly shouldShowTab = output<boolean>();
  readonly evalNotInstalledMsg = output<string>();
  readonly evalCaseSelected = output<EvalCase>();
  readonly evalSetIdSelected = output<string>();
  readonly shouldReturnToSession = output<boolean>();
  readonly editEvalCaseRequested = output<EvalCase>();

  private readonly evalCasesSubject = new BehaviorSubject<string[]>([]);
  private readonly changeDetectorRef = inject(ChangeDetectorRef);
  private readonly flagService =
      inject<FeatureFlagService>(FEATURE_FLAG_SERVICE);
  protected readonly i18n = inject(EvalTabMessagesInjectionToken);

  displayedColumns: string[] = ['select', 'evalId'];
  evalsets: any[] = [];
  selectedEvalSet = signal<string>('');
  currentEvalSet = signal<any>(null);

  evalHistorySorted = computed(() => {
    const evalHistory = this.appEvaluationResults[this.appName()]?.[this.selectedEvalSet()] || {};
    const keys = Object.keys(evalHistory).sort((a, b) => b.localeCompare(a));
    return keys.map((key) => {
      return {timestamp: key, evaluationResults: evalHistory[key]};
    });
  });

  currentHistoryMetrics = computed(() => {
    const runId = this.selectedHistoryRun() || this.evalHistorySorted()[0]?.timestamp;
    if (!runId) return this.evalMetrics;
    const runObj = this.evalHistorySorted().find(r => r.timestamp === runId);
    if (!runObj) return this.evalMetrics;
    return this.getEvalMetrics(runObj);
  });

  caseHistory = computed(() => {
    const caseObj = this.selectedEvalCase();
    if (!caseObj) return [];
    const evalId = caseObj.evalId;
    const history = this.evalHistorySorted();
    return history.map(run => {
      const result = run.evaluationResults.evaluationResults.find((r: any) => r.evalId === evalId);
      return { timestamp: run.timestamp, result: result };
    }).filter(item => item.result !== undefined);
  });

  evalCases: string[] = [];
  selectedEvalCase = signal<EvalCase|null>(null);
  deletedEvalCaseIndex: number = -1;

  dataSource = new MatTableDataSource<string>(this.evalCases);
  selection = new SelectionModel<string>(true, []);

  showEvalHistory = signal(false);
  selectedEvalTab = signal('cases');
  selectedHistoryRun = signal<string|null>(null);

  evalRunning = signal(false);
  loadingMetrics = signal(false);
  evalMetrics: EvalMetric[] = DEFAULT_EVAL_METRICS;
  useLive = false;
  // Audio user simulator config for the next run, set from the run dialog.
  pendingUserSimulatorConfig: UserSimulatorConfig|null = null;
  isEvalV2Enabled = signal(false);

  // Key: evalSetId
  // Value: EvaluationResult[]
  currentEvalResultBySet: Map<string, EvaluationResult[]> = new Map();
  readonly dialog = inject(MatDialog);

  protected appEvaluationResults: AppEvaluationResult = {};
  private readonly evalService = inject(EVAL_SERVICE);
  private readonly sessionService = inject(SESSION_SERVICE);
  private readonly storageService = inject(STORAGE_SERVICE);

  constructor() {
    this.evalCasesSubject.subscribe((evalCases: string[]) => {
      if (!this.selectedEvalCase() && this.deletedEvalCaseIndex >= 0 &&
          evalCases.length > 0) {
        this.selectNewEvalCase(evalCases);
        this.deletedEvalCaseIndex = -1;
      } else if (evalCases.length === 0) {
        this.shouldReturnToSession.emit(true);
      }
    });
  }

  ngOnChanges(changes: SimpleChanges): void {
    if (changes['appName']) {
      this.selectedEvalSet.set('');
      this.evalCases = [];
      this.getEvalSet();
      this.getEvaluationResult();
    }
  }

  ngOnInit(): void {
    this.flagService.isEvalV2Enabled()
      .pipe(first())
      .subscribe((enabled) => this.isEvalV2Enabled.set(enabled));

    const savedMetrics = this.storageService.getItem('adk_eval_metrics_selection');
    if (savedMetrics) {
      try {
        this.evalMetrics = JSON.parse(savedMetrics) as EvalMetric[];
      } catch (e) {
        console.error('Error parsing saved eval metrics', e);
        this.evalMetrics = DEFAULT_EVAL_METRICS;
      }
    }
  }

  selectNewEvalCase(evalCases: string[]) {
    let caseToSelect = this.deletedEvalCaseIndex;
    if (this.deletedEvalCaseIndex === evalCases.length) {
      caseToSelect = 0;
    }
    this.getEvalCase(evalCases[caseToSelect]);
  }

  getEvalSet() {
    if (this.appName() !== '') {
      this.evalService.getEvalSets(this.appName())
          .pipe(catchError((error) => {
            if (error.status === 404 && error.statusText === 'Not Found') {
              this.shouldShowTab.emit(false);
              return of(null);
            }
            return of([]);
          }))
          .subscribe((sets) => {
            if (sets !== null) {
              this.shouldShowTab.emit(true);
              this.evalsets = sets;
              this.changeDetectorRef.detectChanges();
            }
          });
      ;
    }
  }

  getNextDefaultEvalSetName(): string {
    const pattern = /^eval_set_(\d+)$/;
    let maxNum = 0;
    for (const set of this.evalsets) {
      if (typeof set === 'string') {
        const match = set.match(pattern);
        if (match) {
          const num = parseInt(match[1], 10);
          if (num > maxNum) {
            maxNum = num;
          }
        }
      }
    }
    return `eval_set_${maxNum + 1}`;
  }

  openNewEvalSetDialog() {
    const defaultName = this.getNextDefaultEvalSetName();
    const dialogRef = this.dialog.open(NewEvalSetDialogComponentComponent, {
      width: '600px',
      data: {appName: this.appName(), defaultName: defaultName},
    });

    dialogRef.afterClosed().subscribe((needRefresh) => {
      if (needRefresh) {
        this.getEvalSet();
        this.changeDetectorRef.detectChanges();
      }
    });
  }

  openNewEvalCaseDialog() {
    if (!this.sessionId()) return;

    this.sessionService.getSession(this.userId(), this.appName(), this.sessionId())
      .subscribe((fullSession) => {
        const displayName = (fullSession.state as any)?.['__session_metadata__']?.displayName || this.sessionId();
        const sanitizedName = displayName.replace(/ /g, '_').replace(/[^a-zA-Z0-9_-]/g, '');

        const dialogRef = this.dialog.open(AddEvalSessionDialogComponent, {
          width: '600px',
          data: {
            appName: this.appName(),
            userId: this.userId(),
            sessionId: this.sessionId(),
            evalSetId: this.selectedEvalSet(),
            defaultName: sanitizedName,
            existingCases: this.evalCases,
          },
        });

        dialogRef.afterClosed().subscribe((needRefresh) => {
          if (needRefresh) {
            this.listEvalCases();
            this.changeDetectorRef.detectChanges();
          }
        });
      });
  }

  listEvalCases() {
    this.evalCases = [];
    this.evalService.listEvalCases(this.appName(), this.selectedEvalSet())
        .subscribe((res) => {
          this.evalCases = res;
          this.dataSource = new MatTableDataSource<string>(this.evalCases);
          this.evalCasesSubject.next(this.evalCases);
          this.changeDetectorRef.detectChanges();
        });
  }

  /** Cases-tab Run button. */
  protected runCasesFromToolbar() {
    this.openEvalConfigDialog();
  }

  runEval() {
    this.evalRunning.set(true);
    const evalSetId = this.selectedEvalSet();
    let runFailed = false;
    this.evalService
        .runEval(
            this.appName(),
            evalSetId,
            this.selection.selected.length === 0 ? this.dataSource.data : this.selection.selected,
            this.evalMetrics,
            this.useLive,
            this.pendingUserSimulatorConfig ?? undefined,
            )
        .pipe(catchError((error) => {
          runFailed = true;
          if (error.error?.detail?.includes('not installed')) {
            this.evalNotInstalledMsg.emit(error.error.detail);
          }
          return of([]);
        }))
        .subscribe((res) => {
          // On failure, stop the spinner here; otherwise getEvaluationResult
          // clears it once results are loaded.
          if (runFailed) {
            this.evalRunning.set(false);
            this.changeDetectorRef.detectChanges();
            return;
          }
          this.currentEvalResultBySet.set(evalSetId, res);
          this.getEvaluationResult(true);
          this.changeDetectorRef.detectChanges();
        });
  }

  selectEvalSet(set: string) {
    this.selectedEvalSet.set(set);
    this.listEvalCases();
    if (this.isEvalV2Enabled()) {
      this.evalService.getEvalSet(this.appName(), set)
        .pipe(catchError((error) => {
          console.error('Error fetching eval set details', error);
          return of(null);
        }))
        .subscribe((res) => {
          this.currentEvalSet.set(res);
          this.changeDetectorRef.detectChanges();
        });
    }
  }

  clearSelectedEvalSet() {
    if (this.selectedEvalTab() !== 'cases') {
      this.selectedEvalTab.set('cases');
      return;
    }
    this.selectedEvalSet.set('');
    this.currentEvalSet.set(null);
  }

  clearAllNavigation() {
    this.selectedEvalSet.set('');
    this.selectedHistoryRun.set(null);
    this.selectedEvalCase.set(null);
    this.currentEvalSet.set(null);
  }

  goToEvalSet() {
    this.selectedHistoryRun.set(null);
    this.selectedEvalCase.set(null);
  }

  isAllSelected() {
    const numSelected = this.selection.selected.length;
    const numRows = this.dataSource.data.length;
    return numSelected === numRows;
  }

  toggleAllRows() {
    if (this.isAllSelected()) {
      this.selection.clear();
      return;
    }

    this.selection.select(...this.dataSource.data);
  }

  getEvalResultForCase(caseId: string) {
    const el = this.currentEvalResultBySet.get(this.selectedEvalSet())
                   ?.filter((c) => c.evalId == caseId);
    if (!el || el.length == 0) {
      return undefined;
    }
    return el[0].finalEvalStatus;
  }

  private formatToolUses(toolUses: any[]): any[] {
    if (!toolUses || !Array.isArray(toolUses)) {
      return [];
    }
    const formattedToolUses = [];
    for (const toolUse of toolUses) {
      formattedToolUses.push({name: toolUse.name, args: toolUse.args});
    }
    return formattedToolUses;
  }

  private addEvalCaseResultToEvents(
      res: any, evalCaseResult: EvaluationResult) {
    const invocationResults = evalCaseResult.evalMetricResultPerInvocation!;
    let currentInvocationIndex = -1;

    if (invocationResults && res?.events) {
      for (let i = 0; i < res.events.length; i++) {
        const event = res.events[i];
        if (event.author === 'user') {
          currentInvocationIndex++;
        } else {
          const invocationResult = invocationResults[currentInvocationIndex];
          let evalStatus = 1;
          let failedMetric = '';
          let score = 1;
          let threshold = 1;
          
          if (invocationResult && invocationResult.evalMetricResults) {
            for (const evalMetricResult of invocationResult.evalMetricResults) {
              if (evalMetricResult.evalStatus === EvalStatus.FAILED) {
                evalStatus = EvalStatus.FAILED;
                failedMetric = evalMetricResult.metricName;
                score = evalMetricResult.score;
                threshold = evalMetricResult.threshold;
                break;
              }
            }
          }
          
          event.evalStatus = evalStatus;

          if (invocationResult && (i === res.events.length - 1 ||
              res.events[i + 1].author === 'user')) {
            this.addEvalFieldsToBotEvent(
                event, invocationResult, failedMetric, score, threshold);
          }
        }
      }
    }
    return res;
  }

  private addEvalFieldsToBotEvent(
      event: any, invocationResult: any, failedMetric: string, score: number,
      threshold: number) {
    event.failedMetric = failedMetric;
    event.evalScore = score;
    event.evalThreshold = threshold;
    if (event.failedMetric === 'tool_trajectory_avg_score') {
      event.actualInvocationToolUses = this.formatToolUses(
          invocationResult.actualInvocation.intermediateData.toolUses);
      event.expectedInvocationToolUses = this.formatToolUses(
          invocationResult.expectedInvocation.intermediateData.toolUses);
    } else if (event.failedMetric === 'response_match_score') {
      event.actualFinalResponse =
          invocationResult.actualInvocation.finalResponse.parts[0].text;
      event.expectedFinalResponse =
          invocationResult.expectedInvocation.finalResponse.parts[0]?.text;
    }
  }

  private fromApiResultToSession(res: any): Session {
    return {
      id: res?.id ?? '',
      appName: res?.appName ?? '',
      userId: res?.userId ?? '',
      state: res?.state ?? [],
      events: res?.events ?? [],
      isEvalResult: true,
    } as any;
  }

  getSession(evalId: string) {
    const evalCaseResult =
        this.currentEvalResultBySet.get(this.selectedEvalSet())
            ?.filter((c) => c.evalId == evalId)[0];
    const sessionId = evalCaseResult!.sessionId;
    const sessionUserId = this.evalSessionUserId(evalCaseResult);
    this.sessionService.getSession(sessionUserId, this.appName(), sessionId)
        .pipe(catchError((error) => {
          console.error('Error fetching eval session', error);
          return of(null);
        }))
        .subscribe((res) => {
          if (!res) {
            return;
          }
          this.addEvalCaseResultToEvents(res, evalCaseResult!);
          const session = this.fromApiResultToSession(res);

          this.sessionSelected.emit(session);
        });
  }

  /** Eval sessions are saved under the user id the eval ran as, not the chat default. */
  private evalSessionUserId(evalCaseResult: any): string {
    return evalCaseResult?.userId || this.userId();
  }

  toggleEvalHistoryButton() {
    this.showEvalHistory.set(!this.showEvalHistory());
  }

  protected getEvalHistoryOfCurrentSet() {
    if (!this.appEvaluationResults[this.appName()]) {
      return {};
    }
    return this.appEvaluationResults[this.appName()][this.selectedEvalSet()] || {};
  }

  protected getEvalHistoryOfCurrentSetSorted(): any[] {
    const evalHistory = this.getEvalHistoryOfCurrentSet();
    if (!evalHistory) {
      return [];
    }
    const evalHistorySorted =
        Object.keys(evalHistory).sort((a, b) => b.localeCompare(a));

    const evalHistorySortedArray = evalHistorySorted.map((key) => {
      return {timestamp: key, evaluationResults: evalHistory[key]};
    });

    return evalHistorySortedArray;
  }

  protected getPassCountForCurrentResult(result: any[]) {
    return result.filter((r: any) => r.finalEvalStatus == 1).length;
  }

  protected getFailCountForCurrentResult(result: any[]) {
    return result.filter((r: any) => r.finalEvalStatus == 2).length;
  }

  private getMetricsCounts(evalRes: any): {passed: number, total: number} {
    if (!evalRes) return {passed: 0, total: 0};

    let passed = 0;
    let total = 0;

    // Counts only metrics that reach a verdict, so the ratio reads
    // "passed / judged". NOT_EVALUATED produced nothing to judge, and
    // INFORMATIONAL reports a value without ever passing or failing; counting
    // either one would make a fully passing case read as a partial one.
    const tally = (results: any[]) => {
      for (const r of results) {
        if (r.evalStatus === EvalStatus.NOT_EVALUATED ||
            r.evalStatus === EvalStatus.INFORMATIONAL) {
          continue;
        }
        total += 1;
        if (r.evalStatus === EvalStatus.PASSED) passed += 1;
      }
    };

    if (evalRes.evalMetricResults && evalRes.evalMetricResults.length > 0) {
      tally(evalRes.evalMetricResults);
    } else if (evalRes.evalMetricResultPerInvocation) {
      for (const inv of evalRes.evalMetricResultPerInvocation) {
        if (inv.evalMetricResults) {
          tally(inv.evalMetricResults);
        }
      }
    }
    return {passed, total};
  }

  protected getMetricsScore(evalRes: any): string {
    const {passed, total} = this.getMetricsCounts(evalRes);
    return `${passed}/${total}`;
  }

  // Uses the backend verdict so the score color stays in sync with the
  // PASS/FAIL status, rather than recomputing from counts.
  protected isMetricsSucceed(evalRes: any): boolean {
    return evalRes?.finalEvalStatus === EvalStatus.PASSED;
  }

  protected formatTimestamp(timestamp: number|string): string {
    const numericTimestamp = Number(timestamp);

    if (isNaN(numericTimestamp)) {
      return 'Invalid timestamp provided';
    }

    const date = new Date(numericTimestamp * 1000);

    if (isNaN(date.getTime())) {
      return 'Invalid date created from timestamp';
    }

    const options: Intl.DateTimeFormatOptions = {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
      hour: 'numeric',
      minute: '2-digit',
      hour12: true
    };

    return new Intl.DateTimeFormat('en-US', options).format(date);
  }

  getEvaluationStatusCardActionButtonIcon(timestamp: number|string) {
    return this.getEvalHistoryOfCurrentSet()[timestamp].isToggled ?
        'keyboard_arrow_up' :
        'keyboard_arrow_down';
  }

  toggleHistoryStatusCard(timestamp: number|string) {
    this.getEvalHistoryOfCurrentSet()[timestamp].isToggled =
        !this.getEvalHistoryOfCurrentSet()[timestamp].isToggled;
  }

  isEvaluationStatusCardToggled(timestamp: number|string) {
    return this.getEvalHistoryOfCurrentSet()[timestamp].isToggled;
  }

  generateHistoryEvaluationDatasource(timestamp: number|string) {
    return this.getEvalHistoryOfCurrentSet()[timestamp].evaluationResults;
  }

  getHistorySession(
      evalCaseResult: EvaluationResult, timestamp: string,
      evalSetId: string = this.selectedEvalSet()) {
    const sessionId = evalCaseResult.sessionId;
    const evalId = evalCaseResult.evalId;

    this.selectedHistoryRun.set(timestamp);

    // Warm the metrics-info cache so metric tooltips render on direct load.
    this.evalService.getMetricsInfo(this.appName())
        .pipe(catchError((error) => {
          console.error('Error fetching metrics info', error);
          return of({metricsInfo: []});
        }))
        .subscribe();

    this.evalService.getEvalCase(this.appName(), evalSetId, evalId)
        .subscribe((evalCase) => {
          const sessionUserId = this.evalSessionUserId(evalCaseResult);
          this.sessionService.getSession(sessionUserId, this.appName(), sessionId)
              .pipe(catchError((error) => {
                console.error('Error fetching eval session', error);
                return of(null);
              }))
              .subscribe((res) => {
                if (!res) {
                  // Surface the result (metrics/status) even when the session
                  // can't be loaded, rather than falling back to the README.
                  const session = this.fromApiResultToSession(
                      {id: sessionId, userId: sessionUserId, events: []});
                  (session as any).evalCase = evalCase;
                  (session as any).evalCaseResult = evalCaseResult;
                  (session as any).timestamp = timestamp;
                  this.sessionSelected.emit(session);
                  return;
                }
                this.addEvalCaseResultToEvents(res, evalCaseResult);
                const session = this.fromApiResultToSession(res);
                (session as any).evalCase = evalCase;
                (session as any).evalCaseResult = evalCaseResult;
                (session as any).timestamp = timestamp;
                this.sessionSelected.emit(session);
              });
        });
  }


  protected getEvalCase(element: any) {
    this.evalService.getEvalCase(this.appName(), this.selectedEvalSet(), element)
        .subscribe((res) => {
          this.selectedEvalCase.set(res);
          this.evalCaseSelected.emit(res);
          this.evalSetIdSelected.emit(this.selectedEvalSet());
        });
  }

  resetEvalCase() {
    this.selectedEvalCase.set(null);
  }

  resetEvalResults() {
    this.currentEvalResultBySet.clear();
  }

  confirmDeleteEvalCase(event: Event, evalCaseId: string) {
    event.stopPropagation();
    const dialogData: DeleteSessionDialogData = {
      title: 'Confirm delete',
      message: `Are you sure you want to delete ${evalCaseId}?`,
      confirmButtonText: 'Delete',
      cancelButtonText: 'Cancel',
    };

    const dialogRef = this.dialog.open(DeleteSessionDialogComponent, {
      width: '600px',
      data: dialogData,
    });

    dialogRef.afterClosed().subscribe((result: boolean) => {
      if (result) {
        this.deleteEvalCase(evalCaseId);
      }
    });
  }

  requestEditEvalCase(event: Event, element: string) {
    event.stopPropagation();
    this.evalService.getEvalCase(this.appName(), this.selectedEvalSet(), element)
        .subscribe((res) => {
          this.selectedEvalCase.set(res);
          this.evalCaseSelected.emit(res);
          this.evalSetIdSelected.emit(this.selectedEvalSet());
          this.editEvalCaseRequested.emit(res);
        });
  }

  deleteEvalCase(evalCaseId: string) {
    this.evalService
        .deleteEvalCase(this.appName(), this.selectedEvalSet(), evalCaseId)
        .subscribe((res) => {
          this.deletedEvalCaseIndex = this.evalCases.indexOf(evalCaseId);
          this.selectedEvalCase.set(null);
          this.listEvalCases();
          this.changeDetectorRef.detectChanges();
        });
  }

  confirmDeleteEvalSet(event: Event, evalSetId: string) {
    event.stopPropagation();
    const dialogData: DeleteSessionDialogData = {
      title: 'Confirm delete',
      message: `Are you sure you want to delete eval set ${evalSetId}?`,
      confirmButtonText: 'Delete',
      cancelButtonText: 'Cancel',
    };

    const dialogRef = this.dialog.open(DeleteSessionDialogComponent, {
      width: '600px',
      data: dialogData,
    });

    dialogRef.afterClosed().subscribe((result: boolean) => {
      if (result) {
        this.deleteEvalSet(evalSetId);
      }
    });
  }

  deleteEvalSet(evalSetId: string) {
    this.evalService
        .deleteEvalSet(this.appName(), evalSetId)
        .subscribe((res) => {
          this.getEvalSet();
          this.changeDetectorRef.detectChanges();
        });
  }

  protected getEvaluationResult(navigateToLatest = false) {
    this.evalService.listEvalResults(this.appName())
        .pipe(
          catchError((error) => {
            if (error.status === 404 && error.statusText === 'Not Found') {
              this.shouldShowTab.emit(false);
              return of(null);
            }
            return of([]);
          }),
          switchMap((ids: string[] | null) => {
            if (!ids || ids.length === 0) return of([]);
            const observables = ids.map(id => this.evalService.getEvalResult(this.appName(), id));
            return forkJoin(observables);
          }),
          // Always clear the running state, even on empty/error paths, so the
          // spinner never gets stuck.
          finalize(() => {
            this.evalRunning.set(false);
            this.changeDetectorRef.detectChanges();
          }),
        )
        .subscribe((results: any[]) => {
          if (results.length === 0) return;

          let latestTimestamp = '';
          let latestEvalSetId = '';

          for (const res of results) {
            if (!this.appEvaluationResults[this.appName()]) {
              this.appEvaluationResults[this.appName()] = {};
            }

            if (!this.appEvaluationResults[this.appName()][res.evalSetId]) {
              this.appEvaluationResults[this.appName()][res.evalSetId] = {};
            }

            const timeStamp = res.creationTimestamp;
            if (!latestTimestamp || timeStamp > latestTimestamp) {
              latestTimestamp = timeStamp;
              latestEvalSetId = res.evalSetId;
            }

            const uiEvaluationResult: UIEvaluationResult = {
              isToggled: false,
              evaluationResults: res.evalCaseResults.map((result: any) => {
                return {
                  setId: result.id,
                  evalId: result.evalId,
                  finalEvalStatus: result.finalEvalStatus,
                  evalMetricResults: result.evalMetricResults,
                  evalMetricResultPerInvocation: result.evalMetricResultPerInvocation,
                  sessionId: result.sessionId,
                  sessionDetails: result.sessionDetails,
                  overallEvalMetricResults: result.overallEvalMetricResults ?? [],
                  userId: result.userId,
                };
              }),
            };

            this.appEvaluationResults[this.appName()][res.evalSetId][timeStamp] = uiEvaluationResult;
          }

          this.changeDetectorRef.detectChanges();

          if (navigateToLatest && latestTimestamp) {
            this.selectedEvalTab.set('history');
            this.selectedHistoryRun.set(latestTimestamp);
            // Open the latest run directly so the result shows without an
            // extra click, replacing the in-progress indicator.
            this.openLatestRunResult(latestEvalSetId, latestTimestamp);
          }
        });
  }

  // Opens the latest run's result in the chat window, but only for a
  // single-case set (for multi-case sets, stay on the history list).
  private openLatestRunResult(evalSetId: string, timestamp: string) {
    const uiResult =
        this.appEvaluationResults[this.appName()]?.[evalSetId]?.[timestamp];
    const caseResults = uiResult?.evaluationResults ?? [];
    if (caseResults.length !== 1) {
      return;
    }
    this.getHistorySession(
        caseResults[0] as EvaluationResult, timestamp, evalSetId);
  }

  protected openEvalConfigDialog() {
    this.loadingMetrics.set(true);
    this.evalService.getMetricsInfo(this.appName())
      .pipe(catchError((error) => {
        console.error('Error fetching metrics info', error);
        return of({ metricsInfo: [] });
      }))
      .subscribe((res) => {
        this.loadingMetrics.set(false);
        const dialogRef = this.dialog.open(RunEvalConfigDialogComponent, {
          maxWidth: '90vw',
          maxHeight: '90vh',
          data: {
            evalMetrics: this.evalMetrics,
            metricsInfo: res.metricsInfo || [],
          },
        });

        dialogRef.afterClosed().subscribe((result) => {
          if (!result) {
            return;
          }

          this.evalMetrics = result.metrics;
          this.useLive = !!result.useLive;
          this.pendingUserSimulatorConfig = result.userSimulatorConfig ?? null;

          // Persist the user's metric selection so it is remembered next time.
          this.storageService.setItem(
              'adk_eval_metrics_selection',
              JSON.stringify(result.metrics));

          this.runEval();
        });
      });
  }

  protected getEvalMetrics(evalResult: any|undefined) {
    if (!evalResult || !evalResult.evaluationResults ||
        !evalResult.evaluationResults.evaluationResults) {
      return this.evalMetrics;
    }

    const results = evalResult.evaluationResults.evaluationResults;

    if (results.length === 0) {
      return this.evalMetrics;
    }

    if (typeof results[0].overallEvalMetricResults === 'undefined' ||
        !results[0].overallEvalMetricResults ||
        results[0].overallEvalMetricResults.length === 0) {
      return this.evalMetrics;
    }

    const overallEvalMetricResults = results[0].overallEvalMetricResults;

    return overallEvalMetricResults.map((result: any) => {
      return {
        metricName: result.metricName,
        threshold: result.threshold,
      };
    });
  }
}
