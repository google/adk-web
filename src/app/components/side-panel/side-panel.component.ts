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

import {AsyncPipe, NgComponentOutlet, NgTemplateOutlet} from '@angular/common';
import {AfterViewInit, Component, computed, DestroyRef, effect, EnvironmentInjector, inject, input, output, runInInjectionContext, signal, Type, viewChild, ViewContainerRef, type WritableSignal} from '@angular/core';
import {toObservable} from '@angular/core/rxjs-interop';
import {FormControl, FormsModule, ReactiveFormsModule} from '@angular/forms';
import {MatMiniFabButton} from '@angular/material/button';
import {MatOption} from '@angular/material/core';
import {MatFormField} from '@angular/material/form-field';
import {MatInput} from '@angular/material/input';
import {MatIcon} from '@angular/material/icon';
import {MatPaginator, PageEvent} from '@angular/material/paginator';
import {MatProgressSpinner} from '@angular/material/progress-spinner';
import {MatSelect, MatSelectChange} from '@angular/material/select';
import {MatTab, MatTabChangeEvent, MatTabGroup, MatTabLabel} from '@angular/material/tabs';
import {MatTooltip} from '@angular/material/tooltip';
import {type SafeHtml} from '@angular/platform-browser';
import {NgxJsonViewerModule} from 'ngx-json-viewer';
import {combineLatest, Observable, of} from 'rxjs';
import {first, map, startWith, switchMap} from 'rxjs/operators';

import {EvalCase} from '../../core/models/Eval';
import {Session} from '../../core/models/Session';
import {FEATURE_FLAG_SERVICE} from '../../core/services/interfaces/feature-flag';
import {UI_STATE_SERVICE} from '../../core/services/interfaces/ui-state';
import {LOGO_COMPONENT} from '../../injection_tokens';
import {ArtifactTabComponent, getMediaTypeFromMimetype} from '../artifact-tab/artifact-tab.component';
import {EVAL_TAB_COMPONENT, EvalTabComponent} from '../eval-tab/eval-tab.component';
import {SessionTabComponent} from '../session-tab/session-tab.component';
import {StateTabComponent} from '../state-tab/state-tab.component';
import {ThemeToggle} from '../theme-toggle/theme-toggle';
import {TraceTabComponent} from '../trace-tab/trace-tab.component';

import {SidePanelMessagesInjectionToken} from './side-panel.component.i18n';

/**
 * Side panel component.
 */
@Component({
  selector: 'app-side-panel',
  templateUrl: './side-panel.component.html',
  styleUrls: ['./side-panel.component.scss'],
  standalone: true,
  imports: [
    AsyncPipe,
    FormsModule,
    NgComponentOutlet,
    NgTemplateOutlet,
    MatTooltip,
    MatTabGroup,
    MatTab,
    MatTabLabel,
    ThemeToggle,
    TraceTabComponent,
    StateTabComponent,
    ArtifactTabComponent,
    SessionTabComponent,
    MatPaginator,
    MatMiniFabButton,
    MatIcon,
    NgxJsonViewerModule,
    MatOption,
    MatSelect,
    ReactiveFormsModule,
    MatProgressSpinner,
    MatFormField,
    MatInput,
  ],
})
export class SidePanelComponent implements AfterViewInit {
  protected readonly Object = Object;

  appName = input('');
  userId = input('');
  sessionId = input('');
  traceData = input<any[]>([]);
  eventData = input(new Map<string, any>());
  currentSessionState = input<any>();
  artifacts = input<any[]>([]);
  selectedEvent = input<any|undefined>();
  selectedEventIndex = input<number|undefined>();
  renderedEventGraph = input<SafeHtml|undefined>();
  rawSvgString = input<string|null>(null);
  llmRequest = input<any|undefined>();
  llmResponse = input<any|undefined>();
  showSidePanel = input(false);
  isApplicationSelectorEnabledObs = input<Observable<boolean>>(of(false));
  apps$ = input<Observable<string[]|undefined>>(of([]));
  isLoadingApps = input<WritableSignal<boolean>>(signal(false));
  selectedAppControl = input(new FormControl<string>('', {
    nonNullable: true,
  }));
  readonly isBuilderMode = input<boolean>(false);
  readonly disableBuilderIcon = input<boolean>(false);

  readonly closePanel = output<void>();
  readonly appSelectionChange = output<MatSelectChange>();
  readonly tabChange = output<any>();
  readonly sessionSelected = output<Session>();
  readonly sessionReloaded = output<Session>();
  readonly evalCaseSelected = output<EvalCase>();
  readonly evalSetIdSelected = output<string>();
  readonly returnToSession = output<boolean>();
  readonly evalNotInstalled = output<string>();
  readonly page = output<PageEvent>();
  readonly closeSelectedEvent = output<void>();
  readonly openImageDialog = output<string|null>();
  readonly openAddItemDialog = output<boolean>();
  readonly enterBuilderMode = output<boolean>();

  readonly sessionTabComponent = viewChild(SessionTabComponent);
  readonly evalTabComponent = viewChild(EvalTabComponent);
  readonly evalTabContainer =
      viewChild('evalTabContainer', {read: ViewContainerRef});

  readonly logoComponent: Type<Component>|null = inject(LOGO_COMPONENT, {
    optional: true,
  });
  readonly i18n = inject(SidePanelMessagesInjectionToken);
  readonly featureFlagService = inject(FEATURE_FLAG_SERVICE);
  readonly evalTabComponentClass = inject(EVAL_TAB_COMPONENT, {optional: true});
  private readonly environmentInjector = inject(EnvironmentInjector);
  protected readonly uiStateService = inject(UI_STATE_SERVICE);
  private readonly destroyRef = inject(DestroyRef);

  // Feature flag references for use in template.
  readonly isAlwaysOnSidePanelEnabledObs =
      this.featureFlagService.isAlwaysOnSidePanelEnabled();
  readonly isTraceEnabledObs = this.featureFlagService.isTraceEnabled();
  readonly isArtifactsTabEnabledObs =
      this.featureFlagService.isArtifactsTabEnabled();
  readonly isEvalEnabledObs = this.featureFlagService.isEvalEnabled();
  readonly isTokenStreamingEnabledObs =
      this.featureFlagService.isTokenStreamingEnabled();
  readonly isMessageFileUploadEnabledObs =
      this.featureFlagService.isMessageFileUploadEnabled();
  readonly isManualStateUpdateEnabledObs =
      this.featureFlagService.isManualStateUpdateEnabled();
  readonly isBidiStreamingEnabledObs =
      this.featureFlagService.isBidiStreamingEnabled;
  protected readonly isSessionsTabReorderingEnabledObs =
      this.featureFlagService.isSessionsTabReorderingEnabled();

  // Agent search
  readonly agentSearchControl = new FormControl('', { nonNullable: true });
  readonly filteredApps$: Observable<string[] | undefined> = toObservable(this.apps$).pipe(
    switchMap(appsObservable =>
      combineLatest([
        appsObservable,
        this.agentSearchControl.valueChanges.pipe(startWith(''))
      ])
    ),
    map(([apps, searchTerm]) => {
      if (!apps) {
        return apps;
      }
      if (!searchTerm || searchTerm.trim() === '') {
        return apps;
      }
      const lowerSearch = searchTerm.toLowerCase().trim();
      return apps.filter(app => app.toLowerCase().startsWith(lowerSearch));
    })
  );

  readonly artifactDeltaArray = computed(() => {
    const artifactDelta = this.selectedEvent()?.actions?.artifactDelta;
    if (!artifactDelta || Object.keys(artifactDelta).length === 0) {
      return [];
    }

    const artifacts: any[] = [];
    for (const [id, artifactData] of Object.entries(artifactDelta)) {
      artifacts.push({
        id,
        versionId: 1,
        data: (artifactData as any).data || '',
        mimeType: (artifactData as any).mimeType || '',
        mediaType: getMediaTypeFromMimetype((artifactData as any).mimeType || ''),
      });
    }
    return artifacts;
  });

  ngAfterViewInit() {
    // Wait one tick until the eval tab container is ready.
    setTimeout(() => {
      this.initEvalTab();
    }, 500);
  }

  /**
   * Dynamically create the eval tab. We must do this programmatically until
   * ngComponentOutlet supports input/output bindings:
   * https://github.com/angular/angular/issues/63099
   */
  private initEvalTab() {
    this.isEvalEnabledObs.pipe(first()).subscribe((isEvalEnabled) => {
      if (isEvalEnabled) {
        const evalTabComponent = this.evalTabContainer()?.createComponent(
            this.evalTabComponentClass ?? EvalTabComponent, {
              environmentInjector: this.environmentInjector,
            });
        if (!evalTabComponent) return;

        runInInjectionContext(this.environmentInjector, () => {
          // Ensure inputs are updated dynamically using effect.
          effect(() => {
            evalTabComponent.setInput('appName', this.appName());
            evalTabComponent.setInput('userId', this.userId());
            evalTabComponent.setInput('sessionId', this.sessionId());
          });
        });
        evalTabComponent.instance.sessionSelected.subscribe(
            (session: Session) => {
              this.sessionSelected.emit(session);
            });
        evalTabComponent.instance.evalCaseSelected.subscribe(
            (evalCase: EvalCase) => {
              this.evalCaseSelected.emit(evalCase);
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
      }
    });
  }
}
