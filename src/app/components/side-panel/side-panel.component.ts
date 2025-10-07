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
import {Component, EventEmitter, inject, Input, Output, signal, Type, viewChild, type WritableSignal} from '@angular/core';
import {FormControl, FormsModule, ReactiveFormsModule} from '@angular/forms';
import {MatMiniFabButton} from '@angular/material/button';
import {MatOption} from '@angular/material/core';
import {MatIcon} from '@angular/material/icon';
import {MatPaginator, PageEvent} from '@angular/material/paginator';
import {MatSelect, MatSelectChange} from '@angular/material/select';
import {MatTab, MatTabGroup, MatTabLabel} from '@angular/material/tabs';
import {MatTooltip} from '@angular/material/tooltip';
import {type SafeHtml} from '@angular/platform-browser';
import {NgxJsonViewerModule} from 'ngx-json-viewer';
import {Observable, of} from 'rxjs';

import {EvalCase} from '../../core/models/Eval';
import {Session} from '../../core/models/Session';
import {FEATURE_FLAG_SERVICE} from '../../core/services/feature-flag.service';
import {LOGO_COMPONENT} from '../../injection_tokens';
import {ArtifactTabComponent} from '../artifact-tab/artifact-tab.component';
import {EvalTabComponent} from '../eval-tab/eval-tab.component';
import {EventTabComponent} from '../event-tab/event-tab.component';
import {SessionTabComponent} from '../session-tab/session-tab.component';
import {StateTabComponent} from '../state-tab/state-tab.component';
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
    AsyncPipe,         FormsModule,          NgComponentOutlet,
    MatTooltip,        MatTabGroup,          MatTab,
    MatTabLabel,       TraceTabComponent,    EventTabComponent,
    StateTabComponent, ArtifactTabComponent, SessionTabComponent,
    EvalTabComponent,  MatPaginator,         MatMiniFabButton,
    MatIcon,           NgxJsonViewerModule,  MatOption,
    MatSelect,         ReactiveFormsModule,
  ],
})
export class SidePanelComponent {
  @Input() appName = '';
  @Input() userId = '';
  @Input() sessionId = '';
  @Input() traceData: any[] = [];
  @Input() eventData = new Map<string, any>();
  @Input() currentSessionState: any;
  @Input() artifacts: any[] = [];
  @Input() selectedEvent: any|undefined;
  @Input() selectedEventIndex: number|undefined;
  @Input() renderedEventGraph: SafeHtml|undefined;
  @Input() rawSvgString: string|null = null;
  @Input() llmRequest: any|undefined;
  @Input() llmResponse: any|undefined;
  @Input() showSidePanel = false;
  @Input() isApplicationSelectorEnabledObs: Observable<boolean> = of(false);
  @Input() apps$: Observable<string[]|undefined> = of([]);
  @Input() isLoadingApps: WritableSignal<boolean> = signal(false);
  @Input()
  selectedAppControl = new FormControl<string>('', {
    nonNullable: true,
  });

  @Output() readonly closePanel = new EventEmitter<void>();
  @Output() readonly appSelectionChange = new EventEmitter<MatSelectChange>();
  @Output() readonly tabChange = new EventEmitter<any>();
  @Output() readonly eventSelected = new EventEmitter<string>();
  @Output() readonly sessionSelected = new EventEmitter<Session>();
  @Output() readonly sessionReloaded = new EventEmitter<Session>();
  @Output() readonly evalCaseSelected = new EventEmitter<EvalCase>();
  @Output() readonly evalSetIdSelected = new EventEmitter<string>();
  @Output() readonly returnToSession = new EventEmitter<boolean>();
  @Output() readonly evalNotInstalled = new EventEmitter<string>();
  @Output() readonly page = new EventEmitter<PageEvent>();
  @Output() readonly closeSelectedEvent = new EventEmitter<void>();
  @Output() readonly openImageDialog = new EventEmitter<string|null>();

  readonly eventTabComponent = viewChild(EventTabComponent);
  readonly sessionTabComponent = viewChild(SessionTabComponent);
  readonly evalTabComponent = viewChild(EvalTabComponent);

  readonly logoComponent: Type<Component> | null = inject(LOGO_COMPONENT, {
    optional: true,
  });
  readonly i18n = inject(SidePanelMessagesInjectionToken);
  readonly featureFlagService = inject(FEATURE_FLAG_SERVICE);

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
      this.featureFlagService.isBidiStreamingEnabled
}
