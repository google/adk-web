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

import {AsyncPipe, NgComponentOutlet} from '@angular/common';
import {AfterViewInit, ChangeDetectionStrategy, Component, ComponentRef, computed, effect, EnvironmentInjector, inject, input, OnInit, output, runInInjectionContext, signal, Type, viewChild, ViewContainerRef} from '@angular/core';
import {toSignal} from '@angular/core/rxjs-interop';
import {MatPaginator, PageEvent} from '@angular/material/paginator';
import {MatProgressSpinner} from '@angular/material/progress-spinner';
import {MatTab, MatTabChangeEvent, MatTabGroup, MatTabLabel} from '@angular/material/tabs';
import {type SafeHtml} from '@angular/platform-browser';
import {Observable, of, forkJoin} from 'rxjs';
import {first} from 'rxjs/operators';

import {EvalCase} from '../../core/models/Eval';
import {Session, SessionState} from '../../core/models/Session';
import {Span} from '../../core/models/Trace';
import {Blob, Event, LlmRequest, LlmResponse} from '../../core/models/types';
import {FEATURE_FLAG_SERVICE} from '../../core/services/interfaces/feature-flag';
import {UI_STATE_SERVICE} from '../../core/services/interfaces/ui-state';
import {LOGO_COMPONENT} from '../../injection_tokens';
import {ArtifactTabComponent, getMediaTypeFromMimetype} from '../artifact-tab/artifact-tab.component';
import {EVAL_TAB_COMPONENT, EvalTabComponent} from '../eval-tab/eval-tab.component';
import {TestsTabComponent} from '../tests-tab/tests-tab.component';
import {StateTabComponent} from '../state-tab/state-tab.component';
import {TraceTabComponent} from '../trace-tab/trace-tab.component';
import {EventTabComponent} from '../event-tab/event-tab.component';

import {TRACE_SERVICE} from '../../core/services/interfaces/trace';
import {SidePanelMessagesInjectionToken} from './side-panel.component.i18n';

/**
 * Side panel component.
 */
@Component({
  changeDetection: ChangeDetectionStrategy.Default,
  selector: 'app-side-panel',
  templateUrl: './side-panel.component.html',
  styleUrls: ['./side-panel.component.scss'],
  standalone: true,
  imports: [
    AsyncPipe,
    MatTabGroup,
    MatTab,
    MatTabLabel,
    TraceTabComponent,
    StateTabComponent,
    ArtifactTabComponent,
    EventTabComponent,
    MatProgressSpinner,
    TestsTabComponent,
  ],
})
export class SidePanelComponent implements AfterViewInit, OnInit {
  protected readonly Object = Object;
  appName = input('');
  userId = input('');
  sessionId = input('');
  traceData = input<Span[]>([]);
  eventData = input(new Map<string, Event>());
  currentSessionState = input<SessionState|undefined>();
  artifacts = input<Blob[]>([]);
  selectedEvent = input<Event|undefined>();
  selectedEventIndex = input<number|undefined>();
  renderedEventGraph = input<SafeHtml|undefined>();
  rawSvgString = input<string|null>(null);
  selectedEventGraphPath = input<string>('');
  llmRequest = input<LlmRequest|undefined>();
  llmResponse = input<LlmResponse|undefined>();
  showSidePanel = input(false);
  readonly isApplicationSelectorEnabledObs = input<Observable<boolean>>(of(false));
  readonly isBuilderMode = input<boolean>(false);
  readonly disableBuilderIcon = input<boolean>(false);
  readonly hasSubWorkflows = input<boolean>(false);
  readonly graphsAvailable = input<boolean>(true);
  readonly invocationDisplayMap = input<Map<string, string>>(new Map());
  readonly forceGraphTab = input(false);
  readonly isViewOnlySession = input(false);
  readonly isViewOnlyAppNameMismatch = input(false);

  readonly closePanel = output<void>();
  readonly tabChange = output<MatTabChangeEvent>();
  readonly sessionSelected = output<Session>();
  readonly sessionReloaded = output<Session>();
  readonly evalCaseSelected = output<EvalCase>();
  readonly editEvalCaseRequested = output<EvalCase>();
  readonly testSelected = output<{ testName: string; events: any[] }>();
  readonly evalSetIdSelected = output<string>();
  readonly returnToSession = output<boolean>();
  readonly evalNotInstalled = output<string>();
  readonly page = output<PageEvent>();
  readonly switchToEvent = output<string>();
  readonly closeSelectedEvent = output<void>();
  readonly openImageDialog = output<string|null>();
  readonly openAddItemDialog = output<boolean>();
  readonly enterBuilderMode = output<boolean>();
  readonly showAgentStructureGraph = output<boolean>();
  readonly switchToTraceView = output<void>();
  readonly drillDownNodePath = output<string>();
  readonly selectEventById = output<string>();
  readonly jumpToInvocation = output<string>();

  readonly sessionTabComponent = undefined;
  readonly evalTabComponent = viewChild(EvalTabComponent);
  readonly evalTabContainer =
      viewChild('evalTabContainer', {read: ViewContainerRef});
  readonly tabGroup = viewChild(MatTabGroup);

  readonly logoComponent: Type<Component>|null = inject(LOGO_COMPONENT, {
    optional: true,
  });
  readonly i18n = inject(SidePanelMessagesInjectionToken);
  readonly featureFlagService = inject(FEATURE_FLAG_SERVICE);
  readonly evalTabComponentClass = inject(EVAL_TAB_COMPONENT, {optional: true});
  private readonly environmentInjector = inject(EnvironmentInjector);
  protected readonly uiStateService = inject(UI_STATE_SERVICE);
  protected readonly traceService = inject(TRACE_SERVICE);
  readonly selectedSpan = toSignal(this.traceService.selectedTraceRow$);

  selectedIndex = 0;
  private pendingEvalCaseSelection = signal<{ evalSetId: string, evalCase: EvalCase } | undefined>(undefined);
  private pendingEvalResultSelection = signal<{ evalSetId: string, timestamp: string, evalCase?: EvalCase } | undefined>(undefined);
  protected readonly evalTabRef = signal<ComponentRef<EvalTabComponent> | null>(null);

  constructor() {
    effect(() => {
      const event = this.selectedEvent();
      const span = this.selectedSpan();
      const tabGroup = this.tabGroup();
      if ((event || span) && tabGroup) {
        // Event tab is index 0. Re-activate it if we select an event and another tab is active.
        if (tabGroup.selectedIndex !== 0) {
          this.selectedIndex = 0;
        }
      }
    });

    effect(() => {
      const container = this.evalTabContainer();
      if (container) {
        this.initEvalTab();
      } else {
        this.evalTabRef.set(null);
      }
    });

    effect(() => {
      const ref = this.evalTabRef();
      if (ref) {
        ref.setInput('appName', this.appName());
        ref.setInput('userId', this.userId());
        ref.setInput('sessionId', this.sessionId());
      }
    });

    effect(() => {
      const ref = this.evalTabRef();
      const pending = this.pendingEvalCaseSelection();
      if (ref && pending) {
        ref.instance.selectEvalSet(pending.evalSetId);
        ref.instance.selectedEvalTab.set('cases');
        ref.instance.selectedEvalCase.set(pending.evalCase);
        this.pendingEvalCaseSelection.set(undefined);
      }
    });

    effect(() => {
      const ref = this.evalTabRef();
      const pending = this.pendingEvalResultSelection();
      if (ref && pending) {
        ref.instance.selectEvalSet(pending.evalSetId);
        ref.instance.selectedHistoryRun.set(pending.timestamp);
        if (pending.evalCase) {
          ref.instance.selectedEvalTab.set('cases');
          ref.instance.selectedEvalCase.set(pending.evalCase);
        } else {
          ref.instance.selectedEvalTab.set('history');
        }
        this.pendingEvalResultSelection.set(undefined);
      }
    });
  }

  ngOnInit() {}

  onTabChange(event: MatTabChangeEvent) {
    this.tabChange.emit(event);
    this.selectedIndex = event.index;
  }

  switchToEvalTab() {
    this.isEvalEnabledObs.pipe(first()).subscribe((isEvalEnabled) => {
      if (!isEvalEnabled) return;

      forkJoin([
        this.isArtifactsTabEnabledObs.pipe(first()),
        this.isTestsEnabledObs.pipe(first()),
      ]).subscribe(([artifactsEnabled, testsEnabled]) => {
        let index = 2; // Info and State are always there
        if (artifactsEnabled) index++;
        if (testsEnabled) index++;
        this.selectedIndex = index;
      });
    });
  }

  selectEvalCase(evalSetId: string, evalCase: EvalCase) {
    const tab = this.evalTabComponent();
    if (tab) {
      tab.selectEvalSet(evalSetId);
      tab.selectedEvalTab.set('cases');
      tab.selectedEvalCase.set(evalCase);
    } else {
      this.pendingEvalCaseSelection.set({ evalSetId, evalCase });
    }
  }

  selectEvalResult(evalSetId: string, timestamp: string, evalCase?: EvalCase) {
    const tab = this.evalTabComponent();
    if (tab) {
      tab.selectEvalSet(evalSetId);
      tab.selectedHistoryRun.set(timestamp);
      if (evalCase) {
        tab.selectedEvalTab.set('cases');
        tab.selectedEvalCase.set(evalCase);
      } else {
        tab.selectedEvalTab.set('history');
      }
    } else {
      this.pendingEvalResultSelection.set({ evalSetId, timestamp, evalCase });
    }
  }

  // Feature flag references for use in template.
  readonly isAlwaysOnSidePanelEnabledObs =
      this.featureFlagService.isAlwaysOnSidePanelEnabled();
  readonly isTraceEnabledObs = this.featureFlagService.isTraceEnabled();
  readonly isArtifactsTabEnabledObs =
      this.featureFlagService.isArtifactsTabEnabled();
  readonly isEvalEnabledObs = this.featureFlagService.isEvalEnabled();
  readonly isTestsEnabledObs = this.featureFlagService.isTestsEnabled();
  readonly isTokenStreamingEnabledObs =
      this.featureFlagService.isTokenStreamingEnabled();
  readonly isMessageFileUploadEnabledObs =
      this.featureFlagService.isMessageFileUploadEnabled();
  readonly isManualStateUpdateEnabledObs =
      this.featureFlagService.isManualStateUpdateEnabled();
  readonly isBidiStreamingEnabledObs =
      this.featureFlagService.isBidiStreamingEnabled;

  readonly filteredSelectedEvent = computed(() => {
    return this.selectedEvent() as Event | undefined;
  });

  ngAfterViewInit() {
    // The eval tab container doesn't exist until appName is set and the template renders.
    // Watch for when appName becomes available to initialize the eval tab.
    if (this.appName()) {
      setTimeout(() => this.initEvalTab(), 500);
    }
    
    // Watch for appName changes to init when it becomes available
    runInInjectionContext(this.environmentInjector, () => {
      effect(() => {
        if (this.appName()) {
          setTimeout(() => this.initEvalTab(), 100);
        }
      }, { allowSignalWrites: true });
    });
  }

  /**
   * Dynamically create the eval tab. We must do this programmatically until
   * ngComponentOutlet supports input/output bindings:
   * https://github.com/angular/angular/issues/63099
   */
  private initEvalTab() {
    this.isEvalEnabledObs.pipe(first()).subscribe((isEvalEnabled) => {
      if (isEvalEnabled) {
        const container = this.evalTabContainer();
        if (!container) return;
        container.clear();

        const evalTabComponent = container.createComponent(
            this.evalTabComponentClass ?? EvalTabComponent, {
              environmentInjector: this.environmentInjector,
            });
        if (!evalTabComponent) return;

        evalTabComponent.instance.sessionSelected.subscribe(
            (session: Session) => {
              this.sessionSelected.emit(session);
            });
        evalTabComponent.instance.evalCaseSelected.subscribe(
            (evalCase: EvalCase) => {
              this.evalCaseSelected.emit(evalCase);
            });
        evalTabComponent.instance.editEvalCaseRequested.subscribe(
            (evalCase: EvalCase) => {
              this.editEvalCaseRequested.emit(evalCase);
            });
        evalTabComponent.instance.evalSetIdSelected.subscribe(
            (evalSetId: string) => {
              this.evalSetIdSelected.emit(evalSetId);
            });
        evalTabComponent.instance.shouldReturnToSession.subscribe(
            (returnToSession: boolean) => {
              this.returnToSession.emit(returnToSession);
            });
        evalTabComponent.instance.evalNotInstalledMsg.subscribe(
            (message: string) => {
              this.evalNotInstalled.emit(message);
            });

        this.evalTabRef.set(evalTabComponent);
      }
    });
  }
}
