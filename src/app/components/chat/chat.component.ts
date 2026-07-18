/**
 * @license
 * Copyright 2026 Google LLC
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

import { AsyncPipe, DOCUMENT, DecimalPipe, NgClass, NgComponentOutlet } from '@angular/common';
import { HttpErrorResponse } from '@angular/common/http';
import { AfterViewInit, ChangeDetectionStrategy, ChangeDetectorRef, Component, computed, ElementRef, effect, HostListener, inject, Injectable, OnDestroy, OnInit, Renderer2, signal, Type, viewChild, WritableSignal } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { FormControl, FormsModule, ReactiveFormsModule } from '@angular/forms';
import { MatButton, MatIconButton, MatFabButton } from '@angular/material/button';
import { MatCard } from '@angular/material/card';
import { MatButtonToggleGroup, MatButtonToggle } from '@angular/material/button-toggle';
import { MatDialog } from '@angular/material/dialog';
import { MatFormField } from '@angular/material/form-field';
import { MatInput } from '@angular/material/input';
import { MatIcon } from '@angular/material/icon';
import { MatMenuModule, MatMenuTrigger } from '@angular/material/menu';
import { MatPaginatorIntl } from '@angular/material/paginator';
import { MatDrawer, MatDrawerContainer } from '@angular/material/sidenav';
import { MatProgressSpinner } from '@angular/material/progress-spinner';
import { SnackbarService } from '../../core/services/snackbar.service';
import { MatTooltip } from '@angular/material/tooltip';
import { MatToolbar } from '@angular/material/toolbar';
import { SafeHtml } from '@angular/platform-browser';
import { ActivatedRoute, NavigationEnd, Router } from '@angular/router';
import { CustomJsonViewerComponent } from '../custom-json-viewer/custom-json-viewer.component';
import { combineLatest, firstValueFrom, forkJoin, Observable, of, Subscription } from 'rxjs';
import { catchError, distinctUntilChanged, filter, first, map, shareReplay, startWith, switchMap, take, tap } from 'rxjs/operators';

import { URLUtil } from '../../../utils/url-util';
import { AgentRunRequest } from '../../core/models/AgentRunRequest';
import { EvalCase, EvaluationResult } from '../../core/models/Eval';
import { Session, SessionState } from '../../core/models/Session';
import { Event as AdkEvent, Part } from '../../core/models/types';
import { UiEvent } from '../../core/models/UiEvent';
import { AGENT_SERVICE } from '../../core/services/interfaces/agent';
import { AGENT_BUILDER_SERVICE } from '../../core/services/interfaces/agent-builder';
import { ARTIFACT_SERVICE } from '../../core/services/interfaces/artifact';
import { DOWNLOAD_SERVICE } from '../../core/services/interfaces/download';
import { EVAL_SERVICE } from '../../core/services/interfaces/eval';
import { EVENT_SERVICE } from '../../core/services/interfaces/event';
import { FEATURE_FLAG_SERVICE } from '../../core/services/interfaces/feature-flag';
import { GRAPH_SERVICE } from '../../core/services/interfaces/graph';
import { LOCAL_FILE_SERVICE } from '../../core/services/interfaces/localfile';
import { SAFE_VALUES_SERVICE } from '../../core/services/interfaces/safevalues';
import { SESSION_SERVICE } from '../../core/services/interfaces/session';
import { STREAM_CHAT_SERVICE } from '../../core/services/interfaces/stream-chat';
import { AUDIO_RECORDING_SERVICE } from '../../core/services/interfaces/audio-recording';
import { AUDIO_PLAYING_SERVICE } from '../../core/services/interfaces/audio-playing';
import { STRING_TO_COLOR_SERVICE } from '../../core/services/interfaces/string-to-color';
import { TRACE_SERVICE } from '../../core/services/interfaces/trace';
import { THEME_SERVICE } from '../../core/services/interfaces/theme';
import { WEBSOCKET_SERVICE } from '../../core/services/interfaces/websocket';
import { LOGO_COMPONENT } from '../../injection_tokens';
import { ListResponse } from '../../core/services/interfaces/types';
import { UI_STATE_SERVICE } from '../../core/services/interfaces/ui-state';
import { LOCATION_SERVICE } from '../../core/services/location.service';
import { TestsService } from '../../core/services/tests.service';
import { AnalyticsService } from '../../core/services/analytics.service';
import { ResizableDrawerDirective } from '../../directives/resizable-drawer.directive';
import { AddItemDialogComponent } from '../add-item-dialog/add-item-dialog.component';
import { AgentStructureGraphDialogComponent } from '../agent-structure-graph-dialog/agent-structure-graph-dialog';
import { getMediaTypeFromMimetype, MediaType } from '../artifact-tab/artifact-tab.component';
import { BuilderTabsComponent } from '../builder-tabs/builder-tabs.component';
import { CanvasComponent } from '../canvas/canvas.component';
import { ChatPanelComponent } from '../chat-panel/chat-panel.component';
import { EditJsonDialogComponent } from '../edit-json-dialog/edit-json-dialog.component';
import { EvalTabComponent } from '../eval-tab/eval-tab.component';
import { DeleteSessionDialogComponent, DeleteSessionDialogData, } from '../session-tab/delete-session-dialog/delete-session-dialog.component';
import { SessionTabComponent } from '../session-tab/session-tab.component';
import { SidePanelComponent } from '../side-panel/side-panel.component';
import { ViewImageDialogComponent } from '../view-image-dialog/view-image-dialog.component';
import { InlineEditComponent } from '../inline-edit/inline-edit.component';
import { FormatMetricNamePipe } from '../eval-tab/format-metric-name.pipe';
import { MatSlideToggleModule } from '@angular/material/slide-toggle';
import { TelemetryService } from '../../core/services/telemetry.service';
import { TelemetryConsentDialogComponent } from '../telemetry-consent-dialog/telemetry-consent-dialog.component';

import { ChatMessagesInjectionToken } from './chat.component.i18n';
import { SidePanelMessagesInjectionToken } from '../side-panel/side-panel.component.i18n';
import { Span, OPERATION_GENERATE_CONTENT, SpanIo, extractSystemInstruction } from '../../core/models/Trace';

export interface ListAppsResult {
  apps?: string[];
  folders?: string[];
}

export const NESTED_APP_SEPARATOR = '.';

const ROOT_AGENT = 'root_agent';
/** Query parameter for pre-filling user input. */
export const INITIAL_USER_INPUT_QUERY_PARAM = 'q';
/** Query parameter for hiding the side panel. */
export const HIDE_SIDE_PANEL_QUERY_PARAM = 'hideSidePanel';

export type ChatType = 'session' | 'eval-case' | 'eval-result' | 'file';


/** A2A data part markers */
const A2A_DATA_PART_START_TAG = '<a2a_datapart_json>';
const A2A_DATA_PART_END_TAG = '</a2a_datapart_json>';
const A2UI_MIME_TYPE = 'application/json+a2ui';

function fixBase64String(base64: string): string {
  // Replace URL-safe characters if they exist
  base64 = base64.replace(/-/g, '+').replace(/_/g, '/');

  // Fix base64 padding
  while (base64.length % 4 !== 0) {
    base64 += '=';
  }

  return base64;
}

@Injectable()
class CustomPaginatorIntl extends MatPaginatorIntl {
  override nextPageLabel = 'Next Event';
  override previousPageLabel = 'Previous Event';
  override firstPageLabel = 'First Event';
  override lastPageLabel = 'Last Event';

  override getRangeLabel = (page: number, pageSize: number, length: number) => {
    if (length === 0) {
      return `Event 0 of ${length}`;
    }

    length = Math.max(length, 0);
    const startIndex = page * pageSize;

    return `Event ${startIndex + 1} of ${length}`;
  };
}

const BIDI_STREAMING_IN_PROGRESS_WARNING =
  'Another streaming request is already in progress. Please stop it before starting a new one.';

@Component({
  changeDetection: ChangeDetectionStrategy.Default,
  selector: 'app-chat',
  templateUrl: './chat.component.html',
  styleUrl: './chat.component.scss',
  providers: [
    { provide: MatPaginatorIntl, useClass: CustomPaginatorIntl },
  ],
  imports: [
    MatDrawerContainer,
    MatButtonToggleGroup,
    MatButtonToggle,
    MatTooltip,
    MatDrawer,
    ResizableDrawerDirective,
    FormsModule,
    ReactiveFormsModule,
    MatIcon,
    MatButton,
    MatIconButton,
    MatMenuModule,
    MatCard,
    MatToolbar,
    NgComponentOutlet,
    MatFormField,
    MatInput,
    MatProgressSpinner,
    AsyncPipe,
    DecimalPipe,
    ChatPanelComponent,
    AgentStructureGraphDialogComponent,
    SidePanelComponent,
    CanvasComponent,
    BuilderTabsComponent,
    SessionTabComponent,
    InlineEditComponent,
    FormatMetricNamePipe,
    MatSlideToggleModule,
    TelemetryConsentDialogComponent,
  ],
})
export class ChatComponent implements OnInit, AfterViewInit, OnDestroy {
  protected readonly i18n = inject(ChatMessagesInjectionToken);
  protected readonly sidePanelI18n = inject(SidePanelMessagesInjectionToken);
  private readonly _snackbarService = inject(SnackbarService);
  private readonly activatedRoute = inject(ActivatedRoute);
  private readonly agentService = inject(AGENT_SERVICE);
  private readonly artifactService = inject(ARTIFACT_SERVICE);
  private readonly changeDetectorRef = inject(ChangeDetectorRef);
  private readonly dialog = inject(MatDialog);
  private readonly document = inject(DOCUMENT);
  private readonly downloadService = inject(DOWNLOAD_SERVICE);
  private readonly evalService = inject(EVAL_SERVICE);
  private readonly eventService = inject(EVENT_SERVICE);
  private readonly featureFlagService = inject(FEATURE_FLAG_SERVICE);
  private readonly graphService = inject(GRAPH_SERVICE);
  private readonly localFileService = inject(LOCAL_FILE_SERVICE);
  private readonly location = inject(LOCATION_SERVICE);
  private readonly renderer = inject(Renderer2);
  private readonly router = inject(Router);
  private readonly safeValuesService = inject(SAFE_VALUES_SERVICE);
  private readonly testsService = inject(TestsService);
  private readonly sessionService = inject(SESSION_SERVICE);
  private readonly streamChatService = inject(STREAM_CHAT_SERVICE);
  private readonly webSocketService = inject(WEBSOCKET_SERVICE);
  private readonly audioRecordingService = inject(AUDIO_RECORDING_SERVICE);
  private readonly audioPlayingService = inject(AUDIO_PLAYING_SERVICE);
  private readonly stringToColorService = inject(STRING_TO_COLOR_SERVICE);
  private readonly traceService = inject(TRACE_SERVICE);
  protected readonly uiStateService = inject(UI_STATE_SERVICE);
  protected readonly agentBuilderService = inject(AGENT_BUILDER_SERVICE);
  protected readonly themeService = inject(THEME_SERVICE, { optional: true });
  protected readonly telemetryService = inject(TelemetryService);
  protected readonly analyticsService = inject(AnalyticsService);
  protected readonly logoComponent: Type<Component> | null = inject(LOGO_COMPONENT, {
    optional: true,
  });

  private activeSseSubscription?: Subscription;

  chatPanel = viewChild(ChatPanelComponent);
  canvasComponent = viewChild.required(CanvasComponent);
  sideDrawer = viewChild.required<MatDrawer>('sideDrawer');
  sidePanel = viewChild.required(SidePanelComponent);
  drawerSessionTab = viewChild<SessionTabComponent>('drawerSessionTab');
  evalTab = viewChild(EvalTabComponent);
  appSearchInput = viewChild<ElementRef<HTMLInputElement>>('appSearchInput');

  canChat = computed(() => this.chatType() === 'session');
  isEvalCaseEditing = signal(false);
  hasEvalCaseChanged = signal(false);
  isEvalEditMode = signal(false);
  isBuilderMode = signal(false);  // Default to builder mode off
  chatType = signal<ChatType>('session');
  currentEvalCaseId: string | null = null;
  currentEvalTimestamp: string | null = null;
  videoElement!: HTMLVideoElement;
  currentMessage = '';
  uiEvents = signal<UiEvent[]>([]);

  invocationDisplayMap = computed(() => {
    const map = new Map<string, string>();
    let invIndex = 1;
    let lastUserMessage = '';

    for (const e of this.uiEvents()) {
      if (e.role === 'user') {
        if (e.text) {
          lastUserMessage = e.text;
        } else if (e.event?.content?.parts?.length) {
          const hasText = e.event.content.parts.find((p: any) => p.text);
          if (hasText && hasText.text) {
            lastUserMessage = hasText.text;
          }
        } else {
          lastUserMessage = 'User Message';
        }
      }

      if (e.event?.invocationId) {
        const invId = e.event.invocationId;
        if (!map.has(invId)) {
          let shortMsg = lastUserMessage || 'User Message';
          if (shortMsg.length > 50) {
            shortMsg = shortMsg.substring(0, 47) + '...';
          }
          map.set(invId, `#${invIndex} (${shortMsg})`);
          invIndex++;
        }
      }
    }
    return map;
  });

  artifacts: any[] = [];
  userInput: string = '';
  userEditEvalCaseMessage: string = '';
  userId = 'user';
  appName = '';
  sessionId = ``;
  sessionIdOfLoadedMessages = '';
  evalCase: EvalCase | null = null;
  evalCaseResult = signal<any | null>(null);
  metricsInfo = this.evalService.metricsInfo;
  updatedEvalCase: EvalCase | null = null;
  adkVersion = signal<string>('');
  versionInfo = signal<any>(null);
  evalSetId = '';
  isAudioRecording = false;
  micVolume = this.audioRecordingService.volumeLevel;
  isVideoRecording = false;
  longRunningEvents: any[] = [];
  functionCallEventId = '';
  redirectUri = URLUtil.getBaseUrlWithoutPath();
  isMobile = signal(window.innerWidth <= 768);
  showSidePanel = window.localStorage.getItem('adk-side-panel-visible') !== 'false';
  showBuilderAssistant = true;
  showAppSelectorDrawer = false;
  showSessionSelectorDrawer = false;
  useSse = signal(window.localStorage.getItem('adk-use-sse') === 'true');
  currentSessionState: SessionState | undefined = {};
  root_agent = ROOT_AGENT;
  updatedSessionState: WritableSignal<any> = signal(null);

  protected readonly canEditSession = signal(true);
  protected readonly isViewOnlySession = signal(false);
  protected readonly isViewOnlyAppNameMismatch = signal(false);
  protected readonly isLoadedAppUnavailable = signal(false);
  protected readonly unavailableAppName = signal('');
  protected readonly readonlySessionType = signal('');
  protected readonly readonlySessionName = signal('');
  protected readonly isSideBySide = signal(false);
  protected readonly showBranches = signal(false);
  protected readonly expectedUiEvents = signal<UiEvent[]>([]);
  protected readonly viewMode = signal<'events' | 'traces'>((window.localStorage.getItem('chat-view-mode') as 'events' | 'traces') || 'events');
  protected readonly invocationIdFilterActive = signal<boolean>(false);
  protected readonly nodePathFilterActive = signal<boolean>(false);
  protected readonly invocationIdFilter = signal<string>('');
  protected readonly nodePathFilter = signal<string>('');

  protected readonly invocationIdOptions = computed(() => {
    const ids = new Set<string>();
    for (const e of this.uiEvents()) {
      if (e.event?.invocationId) ids.add(e.event.invocationId);
    }
    return Array.from(ids);
  });

  protected readonly nodePathOptions = computed(() => {
    const paths = new Set<string>();
    for (const e of this.uiEvents()) {
      const barePath = e.bareNodePath;
      if (barePath) paths.add(barePath);
    }
    return Array.from(paths);
  });

  readonly invChipMenuTrigger = viewChild<MatMenuTrigger>('invChipMenuTrigger');
  readonly nodeChipMenuTrigger = viewChild<MatMenuTrigger>('nodeChipMenuTrigger');
  readonly addMenuTrigger = viewChild<MatMenuTrigger>('addMenuTrigger');

  openAddFilterMenu(event: Event) {
    event.stopPropagation();
    this.addMenuTrigger()?.openMenu();
  }

  addInvocationIdFilter() {
    this.invocationIdFilterActive.set(true);
    setTimeout(() => {
      this.invChipMenuTrigger()?.openMenu();
    });
  }

  addNodePathFilter() {
    this.nodePathFilterActive.set(true);
    setTimeout(() => {
      this.nodeChipMenuTrigger()?.openMenu();
    });
  }

  removeInvocationIdFilter(event: Event) {
    event.stopPropagation();
    this.invocationIdFilterActive.set(false);
    this.invocationIdFilter.set('');
  }

  removeNodePathFilter(event: Event) {
    event.stopPropagation();
    this.nodePathFilterActive.set(false);
    this.nodePathFilter.set('');
  }

  setInvocationIdFilter(id: string) {
    this.invocationIdFilter.set(id);
  }

  setNodePathFilter(path: string) {
    this.nodePathFilter.set(path);
  }

  onInvocationMenuClosed() {
    if (!this.invocationIdFilter()) {
      this.invocationIdFilterActive.set(false);
    }
  }

  onNodePathMenuClosed() {
    if (!this.nodePathFilter()) {
      this.nodePathFilterActive.set(false);
    }
  }

  clearAllFilters(event: Event) {
    event.stopPropagation();
    if (this.invocationIdFilterActive()) {
      this.invocationIdFilterActive.set(false);
      this.invocationIdFilter.set('');
    }
    if (this.nodePathFilterActive()) {
      this.nodePathFilterActive.set(false);
      this.nodePathFilter.set('');
    }
    if (this.hideIntermediateEvents()) {
      this.toggleHideIntermediateEvents();
    }
  }

  shouldShowEvent(uiEvent: UiEvent): boolean {
    const invFilter = this.invocationIdFilter();
    if (invFilter) {
      const eventInvId = uiEvent.event?.invocationId || '';
      if (!eventInvId.includes(invFilter)) {
        return false;
      }
    }

    const pathFilter = this.nodePathFilter();
    if (pathFilter) {
      const eventPath = uiEvent.bareNodePath || '';
      if (!eventPath.includes(pathFilter)) {
        return false;
      }
    }

    if (!this.hideIntermediateEvents()) {
      return true;
    }

    if (uiEvent.role === 'user') {
      return true;
    }

    if (uiEvent.event?.content !== undefined) {
      const parts = uiEvent.event.content.parts || [];
      const hasOnlyFunctions = parts.length > 0 && parts.every((p: any) => p.functionCall || p.functionResponse);

      if (hasOnlyFunctions) {
        const isLongRunning = parts.some((p: any) => {
          const id = p.functionCall?.id || p.functionResponse?.id;
          return id && uiEvent.event?.longRunningToolIds?.includes(id);
        });
        if (isLongRunning) {
          return true;
        }
      } else {
        return true;
      }
    }

    if (uiEvent.event?.output !== undefined) {
      const nodeInfo = uiEvent.event?.nodeInfo;
      let isTopLevel = false;
      let outputFor = nodeInfo?.['outputFor'];

      if (Array.isArray(outputFor)) {
        isTopLevel = outputFor.some((path: string) => !path.includes('/'));
      } else if (typeof outputFor === 'string') {
        isTopLevel = !outputFor.includes('/');
      } else if (nodeInfo?.path) {
        isTopLevel = !nodeInfo.path.includes('/');
      }

      if (isTopLevel) {
        return true;
      }
    }

    return false;
  }

  shouldShowEventFn = this.shouldShowEvent.bind(this);

  getMetricTooltip(metricName: string, score: any, threshold: any): string {
    const info = this.metricsInfo().find((m: any) => m.metricName === metricName);
    const desc = info?.description || '';
    const min = info?.metricValueInfo?.interval?.minValue ?? '?';
    const max = info?.metricValueInfo?.interval?.maxValue ?? '?';
    const scoreStr = score != null ? parseFloat(score).toFixed(2) : '?';
    const threshStr = threshold != null ? parseFloat(threshold).toFixed(2) : '?';

    return `${desc ? desc + ' | ' : ''}Actual: ${scoreStr} | Threshold: ${threshStr} | Min: ${min} | Max: ${max}`;
  }

  getMetricDescription(metricName: string): string {
    const info = this.metricsInfo().find((m: any) => m.metricName === metricName);
    return info?.description || '';
  }

  getMetricMin(metricName: string): string {
    const info = this.metricsInfo().find((m: any) => m.metricName === metricName);
    const val = info?.metricValueInfo?.interval?.minValue;
    return val != null ? val.toFixed(2) : '?';
  }

  getMetricMax(metricName: string): string {
    const info = this.metricsInfo().find((m: any) => m.metricName === metricName);
    const val = info?.metricValueInfo?.interval?.maxValue;
    return val != null ? val.toFixed(2) : '?';
  }

  getVersionTooltip(): string {
    const info = this.versionInfo();
    if (!info) return '';
    return `Version: ${info.version} | Language: ${info.language} | Language Version: ${info.language_version}`;
  }

  getMergedTooltip(): string {
    const baseTooltip = this.sidePanelI18n.disclosureTooltip || '';
    const versionTooltip = this.getVersionTooltip();
    if (!versionTooltip) return baseTooltip;
    return `${baseTooltip} | ${versionTooltip}`;
  }

  protected readonly filteredUiEvents = computed(() => {
    return this.uiEvents().filter(e => this.shouldShowEvent(e));
  });

  protected readonly filteredExpectedUiEvents = computed(() => {
    return this.expectedUiEvents().filter(e => this.shouldShowEvent(e));
  });

  onViewModeChange(mode: 'events' | 'traces') {
    this.viewMode.set(mode);
    try {
      window.localStorage.setItem('chat-view-mode', mode);
    } catch (e) {
      // Ignored
    }
  }
  protected originalSessionId = '';
  hideIntermediateEvents = signal(window.localStorage.getItem('adk-hide-intermediate-events') === 'true');

  toggleHideIntermediateEvents() {
    const newVal = !this.hideIntermediateEvents();
    this.hideIntermediateEvents.set(newVal);
    window.localStorage.setItem('adk-hide-intermediate-events', String(newVal));
  }

  // Sessions with an in-progress bidi stream, used to block concurrent starts.
  activeBidiSessions = new Set<string>();

  eventData = new Map<string, any>();
  traceData: Span[] = [];
  renderedEventGraph: SafeHtml | undefined;
  rawSvgString: string | null = null;
  agentGraphData = signal<any>(null);
  sessionGraphSvgLight: Record<string, string> = {};
  sessionGraphSvgDark: Record<string, string> = {};
  sessionGraphDot: Record<string, string> = {};
  dynamicGraphDot: Record<string, string> = {};
  agentReadme: string = '';
  graphsAvailable = signal<boolean>(true);

  get hasSubWorkflows(): boolean {
    return Object.keys(this.sessionGraphSvgLight).length > 1;
  }

  selectedEvent: any = undefined;
  selectedEventIndex: any = undefined;
  selectedMessageIndex: number | undefined = undefined;
  llmRequest: any = undefined;
  llmResponse: any = undefined;

  getMediaTypeFromMimetype = getMediaTypeFromMimetype;

  selectedFiles: { file: File; url: string }[] = [];

  protected MediaType = MediaType;

  // Sync query params with value from agent picker.
  protected readonly selectedAppControl = new FormControl<string>('', {
    nonNullable: true,
  });

  // App selector drawer
  protected readonly appDrawerSearchControl = new FormControl('', { nonNullable: true });

  protected openBase64InNewTab(data: string, mimeType: string) {
    this.safeValuesService.openBase64InNewTab(data, mimeType);
  }

  // Load apps
  protected isLoadingApps: WritableSignal<boolean> = signal(false);
  loadingError: WritableSignal<string> = signal('');
  protected readonly apps$: Observable<string[] | undefined> = of([]).pipe(
    tap(() => {
      this.isLoadingApps.set(true);
      this.selectedAppControl.disable();
    }),
    switchMap(
      () => this.agentService.listApps().pipe(
        catchError((err: HttpErrorResponse) => {
          this.loadingError.set(err.message);
          return of(undefined);
        }),
      ),
    ),
    take(1),
    tap((app) => {
      this.isLoadingApps.set(false);
      this.selectedAppControl.enable();
      if (app?.length == 1) {
        this.router.navigate([], {
          relativeTo: this.activatedRoute,
          queryParams: { app: app[0] },
          queryParamsHandling: 'merge',
        });
      }
    }),
    shareReplay(),
  );

  // Dynamic explorer state for nested apps and folders in DevServer
  allApps = signal<string[]>([]);
  explorerCurrentPath = signal<string>('./');

  // Search term signal
  protected readonly appSearchSignal = toSignal(
    this.appDrawerSearchControl.valueChanges.pipe(startWith('')),
    { initialValue: '' }
  );

  // Helper to group flat apps recursively into folders and apps at any path level
  getExplorerItemsForPath(currentPath: string, allApps: string[]): { apps: string[], folders: string[] } {
    const normalizedCurrent = currentPath.replace(/^\.\/?/, '');
    const cleanCurrent = normalizedCurrent.endsWith(NESTED_APP_SEPARATOR)
      ? normalizedCurrent.slice(0, -NESTED_APP_SEPARATOR.length)
      : normalizedCurrent;

    const apps = new Set<string>();
    const folders = new Set<string>();

    for (const app of allApps) {
      const cleanApp = app.endsWith(NESTED_APP_SEPARATOR)
        ? app.slice(0, -NESTED_APP_SEPARATOR.length)
        : app;

      if (cleanCurrent === "") {
        // We are at Root
        if (!cleanApp.includes(NESTED_APP_SEPARATOR)) {
          apps.add(app);
        } else {
          const firstPart = cleanApp.split(NESTED_APP_SEPARATOR)[0];
          folders.add(firstPart);
        }
      } else {
        // We are inside a nested folder
        if (cleanApp.startsWith(cleanCurrent + NESTED_APP_SEPARATOR)) {
          const relativeToCurrent = cleanApp.substring(cleanCurrent.length + 1);
          const parts = relativeToCurrent.split(NESTED_APP_SEPARATOR);
          if (parts.length === 1) {
            apps.add(app);
          } else {
            folders.add(cleanCurrent + NESTED_APP_SEPARATOR + parts[0]);
          }
        }
      }
    }

    return {
      apps: Array.from(apps).sort(),
      folders: Array.from(folders).sort()
    };
  }

  // Filtered explorer apps and folders
  protected readonly filteredExplorerApps = computed<{apps: string[], folders: string[]}>(() => {
    const all = this.allApps();
    const path = this.explorerCurrentPath();
    const searchTerm = this.appSearchSignal().toLowerCase().trim();

    const items = this.getExplorerItemsForPath(path, all);

    const apps = items.apps.filter(app => this.getBasename(app).toLowerCase().includes(searchTerm));
    const folders = items.folders.filter(folder => this.getBasename(folder).toLowerCase().includes(searchTerm));

    return { apps, folders };
  });

  navigateToExplorerFolder(folderPath: string) {
    this.explorerCurrentPath.set(folderPath);
  }

  getExplorerBreadcrumbs() {
    const path = this.explorerCurrentPath();
    const parts = path.replace(/^\.\/?/, '').split(NESTED_APP_SEPARATOR).filter(p => p);
    const breadcrumbs = [{ name: 'Root', path: './' }];
    let accumulated = './';
    for (const part of parts) {
      accumulated = accumulated === './' ? part : `${accumulated}${NESTED_APP_SEPARATOR}${part}`;
      breadcrumbs.push({ name: part, path: accumulated });
    }
    return breadcrumbs;
  }

  getBasename(path: string): string {
    if (!path) return '';
    const parts = path.split(NESTED_APP_SEPARATOR);
    return parts[parts.length - 1];
  }

  // Feature flag references for use in template.
  readonly importSessionEnabledObs: Observable<boolean> =
    this.featureFlagService.isImportSessionEnabled();
  readonly isEditFunctionArgsEnabledObs: Observable<boolean> =
    this.featureFlagService.isEditFunctionArgsEnabled();
  readonly isSessionUrlEnabledObs: Observable<boolean> =
    this.featureFlagService.isSessionUrlEnabled();
  readonly isApplicationSelectorEnabledObs: Observable<boolean> =
    this.featureFlagService.isApplicationSelectorEnabled();
  readonly isTokenStreamingEnabledObs: Observable<boolean> =
    this.featureFlagService.isTokenStreamingEnabled();
  readonly isExportSessionEnabledObs: Observable<boolean> =
    this.featureFlagService.isExportSessionEnabled();
  readonly isNewSessionButtonEnabledObs: Observable<boolean> =
    this.featureFlagService.isNewSessionButtonEnabled();
  readonly isEventFilteringEnabled =
    toSignal(this.featureFlagService.isEventFilteringEnabled());
  readonly isApplicationSelectorEnabled =
    toSignal(this.featureFlagService.isApplicationSelectorEnabled());
  readonly isDeleteSessionEnabledObs: Observable<boolean> =
    this.featureFlagService.isDeleteSessionEnabled();
  readonly isUserIdOnToolbarEnabledObs: Observable<boolean> =
    this.featureFlagService.isUserIdOnToolbarEnabled();
  readonly isDeveloperUiDisclaimerEnabledObs: Observable<boolean> =
    this.featureFlagService.isDeveloperUiDisclaimerEnabled();


  // Builder
  disableBuilderSwitch = false;
  autoSelectLatestEvent = false;

  constructor() {
    effect(() => {
      // Re-render graph when theme changes
      if (this.themeService?.currentTheme()) {
        this.updateRenderedGraph();
      }
    });
  }

  ngOnInit(): void {
    this.checkScreenSize();
    if (this.isMobile()) {
      this.showSidePanel = false;
    } else {
      this.showSidePanel = window.localStorage.getItem('adk-side-panel-visible') !== 'false';
    }

    this.apps$.subscribe((apps) => {
      if (apps) {
        this.allApps.set(apps);
      }
    });
    this.syncSelectedAppFromUrl();
    this.updateSelectedAppUrl();
    this.hideSidePanelIfNeeded();

    this.agentService.getVersion().subscribe((res) => {
      this.adkVersion.set(res.version || '');
      this.versionInfo.set(res);
      this.analyticsService.setUserProperties({
        adk_version: res?.version || '',
        adk_language: res?.language || '',
      });
    });

    combineLatest([
      this.agentService.getApp(),
      this.activatedRoute.queryParams,
    ])
      .pipe(
        filter(
          ([app, params]) =>
            !!app && !!params[INITIAL_USER_INPUT_QUERY_PARAM],
        ),
        first(),
        map(([, params]) => params[INITIAL_USER_INPUT_QUERY_PARAM]))
      .subscribe((initialUserInput) => {
        // Use `setTimeout` to ensure the userInput is set after the current
        // change detection cycle is complete.
        setTimeout(() => {
          this.userInput = initialUserInput;
        });
      });

    this.streamChatService.onStreamClose().subscribe((closeReason) => {
      const error =
        'Please check server log for full details: \n' + closeReason;
      this.openSnackBar(error, 'OK');
    });

    this.webSocketService.getMessages().subscribe((message) => {
      if (!message) return;
      try {
        const apiEvent = JSON.parse(message) as any;



        if (apiEvent.interrupted || (apiEvent.inputTranscription !== undefined && apiEvent.partial)) {
          this.audioPlayingService.stopAudio();
        }

        this.appendEventRow(apiEvent);
        this.changeDetectorRef.detectChanges();
      } catch (e) {
        // Ignored
      }
    });


    // OAuth HACK: Opens oauth poup in a new window. If the oauth callback
    // is successful, the new window acquires the auth token, state and
    // optionally the scope. Send this back to the main window.
    const location = new URL(window.location.href);
    const searchParams = location.searchParams;
    if (searchParams.has('code')) {
      const authResponseUrl = window.location.href;
      // Send token to the main window
      window.opener?.postMessage({ authResponseUrl }, window.origin);
      // Close the popup
      window.close();
    }

    this.agentService.getApp().subscribe((app) => {
      this.appName = app;
      this.evalService.metricsInfo.set([]);
    });



    this.traceService.selectedTraceRow$.subscribe((span) => {
      if (span) {
        this.selectedEvent = undefined;
        this.selectedEventIndex = undefined;
        this.selectedMessageIndex = undefined;

        if (!this.showSidePanel) {
          this.showSidePanel = true;
          window.localStorage.setItem('adk-side-panel-visible', 'true');
          this.sideDrawer()?.open();
        }

        this.changeDetectorRef.detectChanges();
      }
    });

    this.featureFlagService.isInfinityMessageScrollingEnabled()
      .pipe(first())
      .subscribe((enabled) => {
        if (enabled) {
          this.uiStateService.onNewMessagesLoaded().subscribe(
            (response: ListResponse<any> & { isBackground?: boolean }) => {
              this.populateMessages(
                response.items, true, !response.isBackground);
              this.loadTraceData();
            });

          this.uiStateService.onNewMessagesLoadingFailed().subscribe(
            (error: { message: string }) => {
              this.openSnackBar(error.message, 'OK');
            });
        }
      });
    this.checkTelemetryConsent();
  }

  get sessionTab() {
    return this.drawerSessionTab();
  }

  switchToTraceView() {
    this.onViewModeChange('traces');
  }

  private async checkTelemetryConsent(): Promise<void> {
    const consent = await this.telemetryService.fetchTelemetryStatus();
    if (consent === null) {
      this.dialog.open(TelemetryConsentDialogComponent, {
        disableClose: true,
        panelClass: 'telemetry-consent-dialog-panel',
      });
    }
  }

  async onTelemetryToggle(checked: boolean): Promise<void> {
    await this.telemetryService.setTelemetry(checked);
  }

  ngAfterViewInit() {
    if (this.showSidePanel) {
      this.sideDrawer()?.open();
    }

    if (!this.isApplicationSelectorEnabled()) {
      this.loadSessionByUrlOrReset();
    }
  }

  selectApp(appName: string) {
    this.isLoadedAppUnavailable.set(false);
    if (appName != this.appName) {
      const isInitialLoad = !this.appName;
      this.agentService.setApp(appName);

      if (isInitialLoad) {
        // On initial load, honour any session ID in the URL.
        this.loadSessionByUrlOrReset();
      } else {
        // When switching agents, start fresh — the URL session belongs
        // to the previous agent.
        this.createSessionAndReset();
      }
    }
  }

  private loadSessionByUrlOrReset() {
    this.isSessionUrlEnabledObs.subscribe((sessionUrlEnabled) => {
      const queryParams = this.activatedRoute.snapshot?.queryParams;
      const sessionUrl = queryParams['session'];
      const userUrl = queryParams['userId'];
      const evalCaseUrl = queryParams['evalCase'];
      const evalResultUrl = queryParams['evalResult'];
      const fileUrl = queryParams['file'];

      if (userUrl) {
        this.userId = userUrl;
      }

      if (evalCaseUrl) {
        this.chatType.set('eval-case');
        const parts = evalCaseUrl.split('/');
        if (parts.length === 2) {
          const evalSetId = parts[0];
          const evalCaseId = parts[1];
          this.evalSetId = evalSetId;
          this.evalService.getEvalCase(this.appName, evalSetId, evalCaseId).subscribe((evalCase) => {
            if (evalCase) {
              this.updateWithSelectedEvalCase(evalCase);
              setTimeout(() => {
                const sidePanel = this.sidePanel();
                sidePanel.switchToEvalTab();
                sidePanel.selectEvalCase(evalSetId, evalCase);
              }, 600);
            }
          });
        }
        return;
      }

      if (evalResultUrl) {
        this.chatType.set('eval-result');
        const parts = evalResultUrl.split('/');
        console.log('loadSessionByUrlOrReset evalResultUrl parts:', parts);
        if (parts.length === 3) {
          const evalSetId = parts[0];
          const evalId = parts[1];
          const timestamp = parts[2];
          this.evalSetId = evalSetId;

          const runId = `${this.appName}_${evalSetId}_${timestamp}`;
          console.log('loadSessionByUrlOrReset runId:', runId);
          this.evalService.getEvalResult(this.appName, runId).subscribe((runResult) => {
            console.log('loadSessionByUrlOrReset runResult:', runResult);
            if (runResult) {
              const evalCaseResult = runResult.evalCaseResults?.find((r: any) => r.evalId === evalId);
              console.log('loadSessionByUrlOrReset evalCaseResult:', evalCaseResult);
              if (evalCaseResult) {
                const sessionId = evalCaseResult.sessionId;

                this.evalService.getEvalCase(this.appName, evalSetId, evalId).subscribe((evalCase) => {
                  this.sessionService.getSession(this.userId, this.appName, sessionId).subscribe((sessionRes) => {
                    this.addEvalCaseResultToEvents(sessionRes, evalCaseResult);
                    const session = {
                      id: sessionRes?.id ?? '',
                      appName: sessionRes?.appName ?? '',
                      userId: sessionRes?.userId ?? '',
                      state: sessionRes?.state ?? [],
                      events: sessionRes?.events ?? [],
                      isEvalResult: true,
                      evalCase: evalCase,
                      evalCaseResult: evalCaseResult,
                      timestamp: timestamp
                    } as any;

                    this.updateWithSelectedSession(session);

                    setTimeout(() => {
                      const sidePanel = this.sidePanel();
                      sidePanel.switchToEvalTab();
                      sidePanel.selectEvalResult(evalSetId, timestamp, evalCase);
                    }, 600);
                  });
                });
              }
            }
          });
        }
        return;
      }

      if (fileUrl) {
        this.chatType.set('file');
        return;
      }

      if (!sessionUrlEnabled || !sessionUrl) {
        this.chatType.set('session');
        this.createSessionAndReset();
        return;
      }

      if (sessionUrl) {
        this.chatType.set('session');
        this.sessionId = sessionUrl;
        this.loadSession(sessionUrl, true);
      }
    });
  }

  protected loadSession(sessionId: string, isFromUrl: boolean = false) {
    this.uiStateService.setIsSessionLoading(true);
    this.isViewOnlySession.set(false);
    this.isViewOnlyAppNameMismatch.set(false);

    combineLatest([
      this.sessionService.getSession(this.userId, this.appName, sessionId).pipe(
        catchError((error) => {
          if (isFromUrl) {
            this.openSnackBar(
              'Cannot find specified session. Creating a new one.',
              undefined,
              3000);
            this.createSessionAndReset();
          }
          return of(null);
        })
      ),
      this.featureFlagService.isInfinityMessageScrollingEnabled()
    ]).pipe(first()).subscribe(([session, isInfinityScrollingEnabled]) => {
      this.uiStateService.setIsSessionLoading(false);
      if (session) {
        if (isInfinityScrollingEnabled && session.id) {
          this.uiStateService
            .lazyLoadMessages(session.id, {
              pageSize: 100,
              pageToken: '',
            })
            .pipe(first())
            .subscribe();
        }
        this.updateWithSelectedSession(session);
      }
    });
  }

  private hideSidePanelIfNeeded() {
    this.activatedRoute.queryParams
      .pipe(
        filter((params) => params[HIDE_SIDE_PANEL_QUERY_PARAM] === 'true'),
        take(1),
      )
      .subscribe(() => {
        this.showSidePanel = false;
        this.sideDrawer()?.close();
      });
  }

  private createSessionAndReset() {
    this.resetToNewSession();
    this.chatType.set('session');
    this.isViewOnlySession.set(false);
    this.isViewOnlyAppNameMismatch.set(false);
    this.canEditSession.set(true);
    this.chatPanel()?.canEditSession?.set(true);
    this.eventData = new Map<string, any>();
    this.uiEvents.set([]);
    this.artifacts = [];
    this.userInput = '';
    this.longRunningEvents = [];
    this.selectedEvent = undefined;
    this.selectedEventIndex = undefined;
    this.selectedMessageIndex = undefined;
    this.traceService.resetTraceService();
  }

  private resetToNewSession() {
    this.sessionId = '';
    this.currentSessionState = {};
    this.sessionTab?.refreshSession();
    this.clearSessionUrl();
  }

  createSession() {
    this.uiStateService.setIsSessionListLoading(true);

    this.sessionService.createSession(this.userId, this.appName)
      .subscribe(
        (res) => {
          this.currentSessionState = res.state;
          this.sessionId = res.id ?? '';
          this.sessionTab?.refreshSession();
          this.sessionTab?.reloadSession(this.sessionId);
          this.analyticsService.sendEvent('chat_session_create');

          this.isSessionUrlEnabledObs.subscribe((enabled) => {
            if (enabled) {
              this.updateSelectedSessionUrl();
            }
          });
        },
        () => {
          this.uiStateService.setIsSessionListLoading(false);
        });
  }

  refreshLatestSession() {
    if (!this.appName) {
      return;
    }

    this.uiStateService.setIsSessionLoading(true);

    this.sessionService.listSessions(this.userId, this.appName)
      .pipe(first())
      .subscribe({
        next: (response) => {
          if (response.items && response.items.length > 0) {
            const sortedSessions = response.items.sort((a, b) => {
              const timeA = Number(a.lastUpdateTime || 0);
              const timeB = Number(b.lastUpdateTime || 0);
              return timeB - timeA;
            });

            const latestSession = sortedSessions[0];
            if (latestSession.id) {
              this.loadSession(latestSession.id);
            } else {
              this.uiStateService.setIsSessionLoading(false);
            }
          } else {
            this.uiStateService.setIsSessionLoading(false);
            this.openSnackBar('No sessions found for this app.', 'OK');
          }

          this.sessionTab?.refreshSession();
        },
        error: (err) => {
          this.uiStateService.setIsSessionLoading(false);
          this.openSnackBar('Failed to refresh sessions.', 'OK');
          console.error('Error listing sessions:', err);
        }
      });
  }

  async handleChatInput(event: Event) {
    event.preventDefault();
    if (!this.userInput.trim() && this.selectedFiles.length <= 0) return;

    if (event instanceof KeyboardEvent) {
      // support for japanese IME
      if (event.isComposing || event.keyCode === 229) {
        return;
      }
    }

    const content = {
      role: 'user',
      parts: await this.getUserMessageParts()
    };

    // Clear input
    this.userInput = '';
    this.selectedFiles = [];

    // Clear the query param for the initial user input once it is sent.
    const updatedUrl = this.router.parseUrl(this.location.path());
    if (updatedUrl.queryParams[INITIAL_USER_INPUT_QUERY_PARAM]) {
      delete updatedUrl.queryParams[INITIAL_USER_INPUT_QUERY_PARAM];
      this.location.replaceState(updatedUrl.toString());
    }

    await this.sendMessage(content);
  }

  async ensureSessionActive(content?: any): Promise<boolean> {
    if (this.sessionId) {
      return true;
    }

    try {
      let displayName = '';
      if (content?.parts && content.parts[0]?.text) {
        displayName = content.parts[0].text;
        if (displayName.length > 50) {
          displayName = displayName.substring(0, 47) + '...';
        }
      }
      const initialState = displayName ? { __session_metadata__: { displayName: displayName } } : undefined;
      const res = await firstValueFrom(
        this.sessionService.createSession(this.userId, this.appName, initialState));
      this.currentSessionState = res.state || initialState || {};
      this.sessionId = res.id ?? '';
      this.sessionTab?.refreshSession();
      this.sessionTab?.reloadSession(this.sessionId);
      this.drawerSessionTab()?.refreshSession();
      this.drawerSessionTab()?.reloadSession(this.sessionId);
      this.isSessionUrlEnabledObs.pipe(first()).subscribe((enabled) => {
        if (enabled) {
          this.updateSelectedSessionUrl();
        }
      });
      return true;
    } catch {
      this.openSnackBar('Failed to create session', 'OK');
      return false;
    }
  }

  async sendMessage(content: any) {
    // Lazily create a real session on first message send.
    const isSessionActive = await this.ensureSessionActive(content);
    if (!isSessionActive) {
      return;
    }

    const functionCallEventId = content.functionCallEventId;
    if (functionCallEventId) {
      delete content.functionCallEventId;
    }

    const userEventId = `user_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    const apiEvent = {
      id: userEventId,
      author: content.role || 'user',
      content: content
    };

    const userUiEvent = this.buildUiEventFromEvent(apiEvent);
    this.uiEvents.update(uiEvents => [...uiEvents, userUiEvent]);
    setTimeout(() => this.changeDetectorRef.detectChanges(), 0);

    this.eventData.set(userEventId, apiEvent);
    this.eventData = new Map(this.eventData);

    const req: AgentRunRequest = {
      appName: this.appName,
      userId: this.userId,
      sessionId: this.sessionId,
      newMessage: content,
      streaming: this.useSse(),
      stateDelta: this.updatedSessionState(),
    };
    if (functionCallEventId) {
      req.functionCallEventId = functionCallEventId;
    }

    this.submitAgentRunRequest(req);
    this.changeDetectorRef.detectChanges();
  }

  submitAgentRunRequest(req: AgentRunRequest) {
    this.autoSelectLatestEvent = true;

    this.activeSseSubscription = this.agentService.runSse(req).subscribe({
      next: async (chunkJson: any) => {
        if (chunkJson.error) {
          this.openSnackBar(chunkJson.error, 'OK');
          return;
        }

        this.appendEventRow(chunkJson);

        const isInfoTab = this.sidePanel().selectedIndex === 0;
        if (this.autoSelectLatestEvent && chunkJson.id && isInfoTab) {
          this.selectEvent(chunkJson.id, undefined, false);
        }

        if (chunkJson.actions) {
          this.processActionStateDelta(chunkJson);
        }
        this.changeDetectorRef.detectChanges();
      },
      error: (err) => {
        this.activeSseSubscription = undefined;
        console.error('Send message error:', err);
        const errString = String(err);
        if (errString.includes('aborted') || errString.includes('AbortError')) {
          return;
        }
        this.openSnackBar(err, 'OK');
      },
      complete: () => {
        this.activeSseSubscription = undefined;
        if (this.updatedSessionState()) {
          this.currentSessionState = this.updatedSessionState();
          this.updatedSessionState.set(null);
        }
        this.featureFlagService.isSessionReloadOnNewMessageEnabled()
          .pipe(first())
          .subscribe((enabled) => {
            if (enabled) {
              this.sessionTab?.reloadSession(this.sessionId);
            }
          });
        this.loadTraceData();
      },
    });
  }

  handleStopMessage() {
    if (this.activeSseSubscription) {
      this.activeSseSubscription.unsubscribe();
      this.activeSseSubscription = undefined;
    }
  }

  /**
   * Whether an event carries only bookkeeping metadata and has nothing to
   * render. Live sessions emit such events continuously: session resumption
   * handle updates, and usage-metadata-only events sent just before
   * turnComplete. Only skips events that carry one of those metadata markers
   * AND have nothing else renderable.
   */
  private isEmptyMetadataEvent(apiEvent: any): boolean {
    if (!apiEvent) {
      return false;
    }

    const hasMetadataMarker =
      apiEvent.liveSessionResumptionUpdate !== undefined ||
      apiEvent.usageMetadata !== undefined;
    if (!hasMetadataMarker) {
      return false;
    }

    return apiEvent.content === undefined
      && apiEvent.output === undefined
      && apiEvent.inputTranscription === undefined
      && apiEvent.outputTranscription === undefined
      && !apiEvent.errorMessage
      && !apiEvent.errorCode
      && !apiEvent.systemInstructionChanged
      && !apiEvent.turnComplete
      && !apiEvent.interrupted
      && !(apiEvent.longRunningToolIds?.length)
      && this.actionsAreEmpty(apiEvent.actions);
  }

  /**
   * Whether an event's actions carry no real content. Events often arrive with
   * empty action sub-objects (e.g. { stateDelta: {}, artifactDelta: {},
   * requestedAuthConfigs: {} }), so a key-count check is insufficient.
   */
  private actionsAreEmpty(actions: any): boolean {
    if (!actions) {
      return true;
    }
    return Object.values(actions).every((v) =>
      v == null ||
      v === false ||
      (Array.isArray(v) && v.length === 0) ||
      (typeof v === 'object' && Object.keys(v).length === 0)
    );
  }

  private appendEventRow(apiEvent: any, reverseOrder: boolean = false) {
    // Metadata-only events have no chat row, but usage events still feed the
    // Usage tab's Session Usage Summary.
    if (this.isEmptyMetadataEvent(apiEvent)) {
      if (apiEvent.usageMetadata !== undefined && apiEvent.id &&
          !this.eventData.has(apiEvent.id)) {
        this.eventData.set(apiEvent.id, apiEvent);
        this.eventData = new Map(this.eventData);
        this.traceService.setEventData(this.eventData);
      }
      return;
    }

    if (apiEvent.inputTranscription !== undefined) {
      apiEvent.author = 'user';
    } else if (apiEvent.outputTranscription !== undefined) {
      apiEvent.author = 'bot';
    }

    if (apiEvent.errorMessage) {
      if (apiEvent.id && !this.eventData.has(apiEvent.id)) {
        this.eventData.set(apiEvent.id, apiEvent);
        this.eventData = new Map(this.eventData);
      }
    }

    if (apiEvent.id && !this.eventData.has(apiEvent.id)) {
      this.eventData.set(apiEvent.id, apiEvent);
      this.eventData = new Map(this.eventData);
    }
    this.traceService.setEventData(this.eventData);

    if (apiEvent?.longRunningToolIds && apiEvent.longRunningToolIds.length > 0) {
      const startIndex = this.longRunningEvents.length;
      this.getAsyncFunctionsFromParts(
        apiEvent.longRunningToolIds, apiEvent.content.parts, apiEvent.invocationId);

      // Store event ID for later reference
      this.functionCallEventId = apiEvent.id;

      // Check all newly added events for OAuth requirements
      for (let i = startIndex; i < this.longRunningEvents.length; i++) {
        const func = this.longRunningEvents[i].function;
        if (func.args.authConfig &&
          func.args.authConfig.exchangedAuthCredential &&
          func.args.authConfig.exchangedAuthCredential.oauth2) {
          // for OAuth
          const authUri =
            func.args.authConfig.exchangedAuthCredential.oauth2.authUri;
          const updatedAuthUri = this.updateRedirectUri(
            authUri,
            this.redirectUri,
          );
          this.openOAuthPopup(updatedAuthUri)
            .then((authResponseUrl) => {
              this.sendOAuthResponse(func, authResponseUrl, this.redirectUri);
            })
            .catch((error) => {
              console.error('OAuth Error:', error);
            });
          break;  // Handle one OAuth at a time
        }
      }
    }

    if (apiEvent.partial) {
      this.uiEvents.update((events) => {
        if (events.length > 0) {
          const lastIndex = events.length - 1;
          const lastEvent = events[lastIndex];

          const isLastTranscription = !!((lastEvent.event as any)?.inputTranscription || (lastEvent.event as any)?.outputTranscription);
          const isCurrentTranscription = !!(apiEvent.inputTranscription || apiEvent.outputTranscription);

          if ((lastEvent.event as any)?.partial &&
            lastEvent.role === (apiEvent.author === 'user' ? 'user' : 'bot') &&
            isLastTranscription === isCurrentTranscription) {
            const updatedEvent = this.mergePartialEvent(lastEvent, apiEvent);

            const newEvents = [...events];
            newEvents[lastIndex] = updatedEvent;
            return newEvents;
          }
        }

        const newUiEvent = this.buildUiEventFromEvent(apiEvent, reverseOrder);
        return reverseOrder ? [newUiEvent, ...events] : [...events, newUiEvent];
      });
    } else {
      const uiEvent = this.buildUiEventFromEvent(apiEvent, reverseOrder);

      this.uiEvents.update(events => {
        let existingIndex = events.findIndex(m => m.event?.id === apiEvent.id && apiEvent.id);
        if (existingIndex < 0 && events.length > 0) {
          const isInputTranscription = apiEvent.inputTranscription !== undefined;
          const isOutputTranscription = apiEvent.outputTranscription !== undefined;
          const isThought = apiEvent.content?.parts?.some((p: any) => p.thought);

          if (isInputTranscription || isOutputTranscription || isThought) {
            if (reverseOrder) {
              for (let i = 0; i < events.length; i++) {
                const ev = events[i].event as any;
                if (ev?.partial) {
                  if (isInputTranscription && ev.inputTranscription !== undefined) { existingIndex = i; break; }
                  if (isOutputTranscription && ev.outputTranscription !== undefined) { existingIndex = i; break; }
                  if (isThought && (events[i].thought || ev.content?.parts?.some((p: any) => p.thought))) { existingIndex = i; break; }
                }
              }
            } else {
              for (let i = events.length - 1; i >= 0; i--) {
                const ev = events[i].event as any;
                if (ev?.partial) {
                  if (isInputTranscription && ev.inputTranscription !== undefined) { existingIndex = i; break; }
                  if (isOutputTranscription && ev.outputTranscription !== undefined) { existingIndex = i; break; }
                  if (isThought && (events[i].thought || ev.content?.parts?.some((p: any) => p.thought))) { existingIndex = i; break; }
                }
              }
            }
          } else {
            const checkIndex = reverseOrder ? 0 : events.length - 1;
            const checkEvent = events[checkIndex];
            if ((checkEvent.event as any)?.partial) {
              const isLastTranscription = !!((checkEvent.event as any)?.inputTranscription || (checkEvent.event as any)?.outputTranscription);
              const isCurrentTranscription = !!(apiEvent.inputTranscription || apiEvent.outputTranscription);

              if (isLastTranscription === isCurrentTranscription) {
                existingIndex = checkIndex;
              }
            }
          }
        }

        if (existingIndex >= 0) {
          const existingEvent = events[existingIndex];

          // Preserve functionResponses and functionCalls if not present in new event
          if (!uiEvent.functionResponses || uiEvent.functionResponses.length === 0) {
            uiEvent.functionResponses = existingEvent.functionResponses;
          }
          if (!uiEvent.functionCalls || uiEvent.functionCalls.length === 0) {
            uiEvent.functionCalls = existingEvent.functionCalls;
          }

          const newEvents = [...events];
          newEvents[existingIndex] = uiEvent;
          return newEvents;
        } else {
          return reverseOrder ? [uiEvent, ...events] : [...events, uiEvent];
        }
      });
    }

    if (apiEvent.actions?.artifactDelta) {
      const uiEvent = this.uiEvents().find(e => e.event?.id === apiEvent.id);
      if (uiEvent) {
        for (const key in apiEvent.actions.artifactDelta) {
          if (apiEvent.actions.artifactDelta.hasOwnProperty(key)) {
            this.renderArtifact(key, apiEvent.actions.artifactDelta[key], uiEvent);
          }
        }
      }
    }
  }

  private mergePartialEvent(lastEvent: UiEvent, apiEvent: any): UiEvent {
    const updatedEvent = new UiEvent({
      ...lastEvent,
      event: apiEvent as any,
      textParts: lastEvent.textParts ? lastEvent.textParts.map(p => ({ ...p })) : undefined
    });

    let parts = apiEvent.content?.parts || [];
    if (this.isEventA2aResponse(apiEvent)) {
      parts = this.combineA2uiDataParts(parts);
    }
    parts = this.combineTextParts(parts);

    parts.forEach((part: any) => {
      if (part.text !== undefined && part.text !== null) {
        const processedText = part.thought ? this.processThoughtText(part.text) : part.text;
        updatedEvent.text = (updatedEvent.text || '') + processedText;
        const isThought = !!part.thought;
        this.addTextToParts(updatedEvent, processedText, isThought);
      } else {
        this.processPartIntoMessage(part, apiEvent, updatedEvent);
      }
    });
    updatedEvent.thought = updatedEvent.textParts?.every(p => p.thought) ?? false;

    if (apiEvent.inputTranscription) {
      const previousText = (lastEvent.event as any)?.inputTranscription?.text || '';
      updatedEvent.event.inputTranscription = { text: previousText + (apiEvent.inputTranscription.text || '') };
    }
    if (apiEvent.outputTranscription) {
      const previousText = (lastEvent.event as any)?.outputTranscription?.text || '';
      updatedEvent.event.outputTranscription = { text: previousText + (apiEvent.outputTranscription.text || '') };
    }

    return updatedEvent;
  }

  async getUserMessageParts() {
    let parts: any = [];

    if (!!this.userInput.trim()) {
      parts.push({ text: `${this.userInput}` });
    }

    if (this.selectedFiles.length > 0) {
      for (const file of this.selectedFiles) {
        parts.push(
          await this.localFileService.createMessagePartFromFile(file.file));
      }
    }
    return parts;
  }



  private processActionStateDelta(e: AdkEvent) {
    if (e.actions && e.actions.stateDelta &&
      Object.keys(e.actions.stateDelta).length > 0) {
      this.currentSessionState = {
        ...(this.currentSessionState || {}),
        ...e.actions.stateDelta
      };
    }
  }

  /**
   * Collapse consecutive text parts into a single part. Preserves relative
   * order of other parts.
   */
  private combineTextParts(parts: Part[]) {
    const result: Part[] = [];
    let combinedTextPart: Part | undefined;

    for (const part of parts) {
      if (part.text) {
        const isThought = !!part.thought;
        if (combinedTextPart && combinedTextPart.text && !!combinedTextPart.thought === isThought) {
          combinedTextPart.text += part.text;
        } else {
          combinedTextPart = { text: part.text, thought: isThought };
          result.push(combinedTextPart);
        }
      } else {
        combinedTextPart = undefined;
        result.push(part);
      }
    }

    return result;
  }

  // Returns true if the event is an A2A response.
  private isEventA2aResponse(event: any) {
    return !!event?.customMetadata?.['a2a:response'];
  }

  private isA2aDataPart(part: Part) {
    if (!part.inlineData || part.inlineData.mimeType !== 'text/plain') {
      return false;
    }

    const dataPartText = atob(fixBase64String(part.inlineData.data));
    return dataPartText.startsWith(A2A_DATA_PART_START_TAG) &&
      dataPartText.endsWith(A2A_DATA_PART_END_TAG);
  }

  private isA2uiDataPart(part: Part) {
    const parsedObject = this.extractA2aDataPartJson(part);
    return parsedObject && parsedObject.kind === 'data' &&
      parsedObject.metadata?.mimeType === A2UI_MIME_TYPE;
  }

  private extractA2aDataPartJson(part: Part) {
    if (!this.isA2aDataPart(part)) {
      return null;
    }

    const dataPartText = atob(fixBase64String(part.inlineData!.data));
    const jsonContent = dataPartText.substring(
      A2A_DATA_PART_START_TAG.length,
      dataPartText.length - A2A_DATA_PART_END_TAG.length);
    let parsedObject: any;
    try {
      parsedObject = JSON.parse(jsonContent);
    } catch (e) {
      return null;
    }
    return parsedObject;
  }

  // Combine A2UI data parts into a single part so that A2UI message that
  // consists of 3 A2A DataParts can be displayed as a single message bubble.
  private combineA2uiDataParts(parts: Part[]): Part[] {
    const result: Part[] = [];
    const combinedA2uiJson: any[] = [];
    let combinedDataPart: Part | undefined;

    for (const part of parts) {
      if (this.isA2uiDataPart(part)) {
        combinedA2uiJson.push(this.extractA2aDataPartJson(part));
        // Insert the combined data part into the result array here so that the
        // order of the a2ui components is preserved.
        if (!combinedDataPart) {
          combinedDataPart = {
            inlineData: { mimeType: 'text/plain', data: part.inlineData!.data }
          };
          result.push(combinedDataPart);
        }
      } else {
        result.push(part);
      }
    }

    // If there are any A2UI data parts, reconstruct the combined data part into
    // a valid A2A DataPart.
    if (combinedDataPart?.inlineData) {
      const a2aDataPartJson = {
        kind: 'data',
        metadata: {
          mimeType: A2UI_MIME_TYPE,
        },
        data: combinedA2uiJson,
      };
      const inlineData = A2A_DATA_PART_START_TAG +
        JSON.stringify(a2aDataPartJson) + A2A_DATA_PART_END_TAG;
      combinedDataPart.inlineData.data = btoa(inlineData);
    }

    return result;
  }

  private processA2uiPartIntoMessage(part: any): any {
    const a2uiData: any = {};
    part.a2ui.forEach((dataPart: any) => {
      if (dataPart.data.beginRendering) {
        a2uiData.beginRendering = dataPart.data;
      } else if (dataPart.data.surfaceUpdate) {
        a2uiData.surfaceUpdate = dataPart.data;
      } else if (dataPart.data.dataModelUpdate) {
        a2uiData.dataModelUpdate = dataPart.data;
      }
    });
    return a2uiData;
  }

  private extractA2uiJsonFromText(uiEvent: UiEvent) {
    if (!uiEvent.text) return;

    const startTag = '<a2ui-json>';
    const endTag = '</a2ui-json>';

    const startIndex = uiEvent.text.indexOf(startTag);
    if (startIndex === -1) return;

    const endIndex = uiEvent.text.indexOf(endTag, startIndex + startTag.length);
    if (endIndex === -1) return;

    const jsonStr = uiEvent.text.substring(startIndex + startTag.length, endIndex).trim();
    try {
      let parsed = JSON.parse(jsonStr);
      if (!Array.isArray(parsed)) {
        parsed = [parsed];
      }

      const a2uiData: any = {};
      parsed.forEach((msg: any) => {
        if (msg.beginRendering) {
          a2uiData.beginRendering = msg;
        } else if (msg.surfaceUpdate) {
          a2uiData.surfaceUpdate = msg;
        } else if (msg.dataModelUpdate) {
          a2uiData.dataModelUpdate = msg;
        }
      });

      uiEvent.a2uiData = a2uiData;

      // Strip the <a2ui-json> block from uiEvent.text
      const beforeText = uiEvent.text.substring(0, startIndex);
      const afterText = uiEvent.text.substring(endIndex + endTag.length);
      uiEvent.text = (beforeText + afterText).trim();

      // Strip from uiEvent.textParts as well
      if (uiEvent.textParts) {
        for (const part of uiEvent.textParts) {
          const partStartIndex = part.text.indexOf(startTag);
          if (partStartIndex !== -1) {
            const partEndIndex = part.text.indexOf(endTag, partStartIndex + startTag.length);
            if (partEndIndex !== -1) {
              const partBefore = part.text.substring(0, partStartIndex);
              const partAfter = part.text.substring(partEndIndex + endTag.length);
              part.text = (partBefore + partAfter).trim();
            }
          }
        }
        // Remove any parts that became empty after stripping
        uiEvent.textParts = uiEvent.textParts.filter(part => part.text.trim().length > 0);
      }

    } catch (e) {
      console.warn('Failed to parse inline <a2ui-json> block from text:', e);
    }
  }

  private updateRedirectUri(urlString: string, newRedirectUri: string): string {
    try {
      const url = new URL(urlString);
      const searchParams = url.searchParams;
      searchParams.set('redirect_uri', newRedirectUri);
      return url.toString();
    } catch (error) {
      console.warn('Failed to update redirect URI: ', error);
      return urlString;
    }
  }

  private formatBase64Data(data: string, mimeType: string) {
    const fixedBase64Data = fixBase64String(data);
    return `data:${mimeType};base64,${fixedBase64Data}`;
  }

  private addTextToParts(uiEvent: UiEvent, text: string, thought: boolean) {
    if (!text) return;
    if (!uiEvent.textParts) {
      uiEvent.textParts = [];
    }
    const lastPart = uiEvent.textParts[uiEvent.textParts.length - 1];
    if (lastPart && !!lastPart.thought === thought) {
      lastPart.text += text;
    } else {
      uiEvent.textParts.push({ text, thought });
    }
  }

  private processPartIntoMessage(part: any, event: any, uiEvent: UiEvent) {
    if (!part) return;

    if (event) {
      uiEvent.event = event;
      if (event.invocationIndex !== undefined) {
        uiEvent.invocationIndex = event.invocationIndex;
      }
      if (event.toolUseIndex !== undefined) {
        uiEvent.toolUseIndex = event.toolUseIndex;
      }
      if (event.finalResponsePartIndex !== undefined) {
        uiEvent.finalResponsePartIndex = event.finalResponsePartIndex;
      }
    }

    if (part.text) {
      const processedText = part.thought ? this.processThoughtText(part.text) : part.text;
      uiEvent.text = (uiEvent.text || '') + processedText;
      this.addTextToParts(uiEvent, processedText, !!part.thought);
      uiEvent.thought = uiEvent.textParts?.every(p => p.thought) ?? false;
      if (event?.groundingMetadata && event.groundingMetadata.searchEntryPoint &&
        event.groundingMetadata.searchEntryPoint.renderedContent) {
        uiEvent.renderedContent =
          event.groundingMetadata.searchEntryPoint.renderedContent;
      }
      if (event?.id) {
        uiEvent.event = event as any;
      }
    } else if (part.inlineData) {
      const base64Data = this.formatBase64Data(
        part.inlineData.data, part.inlineData.mimeType);
      const mediaType = getMediaTypeFromMimetype(part.inlineData.mimeType);
      uiEvent.inlineData = {
        displayName: part.inlineData.displayName,
        data: base64Data,
        mimeType: part.inlineData.mimeType,
        mediaType,
      };
      if (uiEvent.role === 'user' && event?.id) {
        uiEvent.event = event as any;
      }
    } else if (part.functionCall) {
      if (!uiEvent.functionCalls) {
        uiEvent.functionCalls = [];
      }

      const isLongRunning = event?.longRunningToolIds?.includes(part.functionCall.id);
      let enrichedFunctionCall = part.functionCall;

      if (isLongRunning) {
        enrichedFunctionCall = {
          ...part.functionCall,
          isLongRunning: true,
          invocationId: event.invocationId,
          functionCallEventId: event.id,
          needsResponse: true,
          responseStatus: part.functionCall.responseStatus || 'pending',
          userResponse: part.functionCall.userResponse || '',
        };
      }

      const existingIndex = uiEvent.functionCalls.findIndex(fc => fc.id === part.functionCall.id);
      if (existingIndex >= 0) {
        uiEvent.functionCalls[existingIndex] = { ...uiEvent.functionCalls[existingIndex], ...enrichedFunctionCall };
      } else {
        uiEvent.functionCalls.push(enrichedFunctionCall);
      }

      if (event?.id) {
        uiEvent.event = event as any;
      }
    } else if (part.functionResponse) {
      if (!uiEvent.functionResponses) {
        uiEvent.functionResponses = [];
      }
      uiEvent.functionResponses.push(part.functionResponse);
      if (event?.id) {
        uiEvent.event = event as any;
      }
    } else if (part.executableCode) {
      uiEvent.executableCode = part.executableCode;
    } else if (part.codeExecutionResult) {
      uiEvent.codeExecutionResult = part.codeExecutionResult;
    } else if (part.a2ui) {
      uiEvent.a2uiData = this.processA2uiPartIntoMessage(part);
    }
  }

  private handleArtifactFetchFailure(
    uiEvent: any, artifactId: string, versionId: string, err?: any) {
    this.openSnackBar(
      'Failed to fetch artifact data',
      'OK',
    );
    // Remove placeholder message and artifact on failure
    uiEvent.error = { errorMessage: 'Failed to fetch artifact data' + (err ? ': ' + (err.message || err) : '') };
    this.changeDetectorRef.detectChanges();
    this.artifacts = this.artifacts.filter(
      a => a.id !== artifactId || a.versionId !== versionId);
  }

  private renderArtifact(
    artifactId: string, versionId: string, uiEvent: UiEvent) {
    // If artifact/version already exists, do nothing.
    const artifactExists = this.artifacts.some(
      (artifact) =>
        artifact.id === artifactId && artifact.versionId === versionId,
    );
    if (artifactExists) {
      return;
    }

    // Set placeholder inlineData on the passed uiEvent.
    uiEvent.inlineData = {
      data: '',
      mimeType: 'image/png',
    };

    // Add placeholder artifact.
    const placeholderArtifact = {
      id: artifactId,
      versionId,
      data: '',
      mimeType: 'image/png',
      mediaType: MediaType.IMAGE,
    };
    this.artifacts = [...this.artifacts, placeholderArtifact];

    this.artifactService
      .getArtifactVersion(
        this.userId,
        this.appName,
        this.sessionId,
        artifactId,
        versionId,
      )
      .subscribe({
        next: (res: any) => {
          let mimeType = res.mimeType;
          let data = res.data;

          if (!mimeType || !data) {
            if (res.inlineData) {
              mimeType = res.inlineData.mimeType;
              data = res.inlineData.data;
            }
          }

          if (!mimeType && !data && res.text) {
            mimeType = 'text/plain';
            try {
              data = btoa(unescape(encodeURIComponent(res.text)));
            } catch (e) {
              console.error('Failed to encode text to base64', e);
              this.handleArtifactFetchFailure(uiEvent, artifactId, versionId, { message: 'Failed to encode text data' });
              return;
            }
          }

          if (!mimeType || !data) {
            this.handleArtifactFetchFailure(uiEvent, artifactId, versionId, { message: 'Invalid response data: missing mimeType or data or text' });
            return;
          }
          const base64Data = this.formatBase64Data(data, mimeType);

          const mediaType = getMediaTypeFromMimetype(mimeType);

          const inlineData = {
            name: this.createDefaultArtifactName(mimeType),
            data: base64Data,
            mimeType: mimeType,
            mediaType,
          };

          uiEvent.inlineData = inlineData;
          this.changeDetectorRef.detectChanges();

          // Update placeholder artifact with fetched data.
          this.artifacts = this.artifacts.map(artifact => {
            if (artifact.id === artifactId &&
              artifact.versionId === versionId) {
              return {
                id: artifactId,
                versionId,
                data: base64Data,
                mimeType,
                mediaType,
              };
            }
            return artifact;
          });
        },
        error: (err) => {
          this.handleArtifactFetchFailure(uiEvent, artifactId, versionId, err);
        }
      });
  }



  private sendOAuthResponse(
    func: any,
    authResponseUrl: string,
    redirectUri: string,
  ) {
    this.longRunningEvents.pop();

    var authConfig = structuredClone(func.args.authConfig);
    authConfig.exchangedAuthCredential.oauth2.authResponseUri = authResponseUrl;
    authConfig.exchangedAuthCredential.oauth2.redirectUri = redirectUri;

    const content = {
      role: 'user',
      parts: [
        {
          functionResponse: {
            id: func.id,
            name: func.name,
            response: authConfig,
          },
        }
      ],
      functionCallEventId: this.functionCallEventId
    };

    this.sendMessage(content);
  }

  clickEvent(i: number) {
    const message = this.uiEvents()[i];
    const key = message.event.id;

    if (!key) {
      return;
    }

    // If clicking the already selected event, ensure side panel is open but do not deselect
    if (this.selectedMessageIndex === i) {
      this.sideDrawer()?.open();
      this.showSidePanel = true;
      window.localStorage.setItem('adk-side-panel-visible', 'true');
      return;
    }

    // For user messages, clear LLM request/response since they don't have those
    if (message.role === 'user') {
      this.selectedEvent = this.eventData.get(key);
      this.selectedEventIndex = this.getIndexOfKeyInMap(key);
      this.selectedMessageIndex = i;
      this.llmRequest = undefined;
      this.llmResponse = undefined;
      this.sideDrawer()?.open();
      this.showSidePanel = true;
      window.localStorage.setItem('adk-side-panel-visible', 'true');
      this.updateRenderedGraph();
      if (this.viewMode() !== 'events') {
        this.onViewModeChange('events');
      }
      return;
    }

    this.sideDrawer()?.open();
    this.showSidePanel = true;
    window.localStorage.setItem('adk-side-panel-visible', 'true');
    this.selectEvent(key, i);
  }

  handleJumpToInvocation(invocationId: string) {
    const events = this.uiEvents();
    let targetIndex = -1;
    let lastUserIndex = -1;
    for (let i = 0; i < events.length; i++) {
      const e = events[i];
      if (e.role === 'user') {
        lastUserIndex = i;
      }
      if (e.event?.invocationId === invocationId) {
        if (lastUserIndex !== -1) {
          targetIndex = lastUserIndex;
        }
        break;
      }
    }

    if (targetIndex !== -1) {
      this.clickEvent(targetIndex);
      setTimeout(() => {
        this.chatPanel()?.scrollToSelectedMessage(targetIndex);
      }, 100);
    }
  }

  ngOnDestroy(): void {
    this.handleStopMessage();
    this.streamChatService.closeStream();
  }

  onAppSelection(event: any) {
    if (this.isAudioRecording) {
      this.stopAudioRecording();
    }
    if (this.isVideoRecording) {
      this.stopVideoRecording();
    }
    this.evalTab()?.resetEvalResults();
    this.traceData = [];
  }

  async toggleAudioRecording() {
    this.isAudioRecording ? this.stopAudioRecording() :
      await this.startAudioRecording();
  }

  async startAudioRecording() {
    if (this.sessionId && this.activeBidiSessions.has(this.sessionId)) {
      this.openSnackBar(BIDI_STREAMING_IN_PROGRESS_WARNING, 'OK');
      return;
    }

    // Lazily create a real session if it does not exist
    const isSessionActive = await this.ensureSessionActive();
    if (!isSessionActive) {
      return;
    }

    this.isAudioRecording = true;
    this.activeBidiSessions.add(this.sessionId);
    void this.streamChatService.startAudioChat({
      appName: this.appName,
      userId: this.userId,
      sessionId: this.sessionId,
    });
    this.changeDetectorRef.detectChanges();
  }

  stopAudioRecording() {
    this.audioPlayingService.stopAudio();
    this.streamChatService.stopAudioChat();
    this.isAudioRecording = false;
    this.activeBidiSessions.delete(this.sessionId);
    if (this.isVideoRecording) {
      this.stopVideoRecording();
    }
    this.changeDetectorRef.detectChanges();
  }

  toggleVideoRecording() {
    this.isVideoRecording ? this.stopVideoRecording() :
      this.startVideoRecording();
  }

  // Video is an add-on to an active call: it streams frames over the existing
  // connection rather than opening its own, so it doesn't touch the session
  // lock or the websocket.
  startVideoRecording() {
    const videoContainer = this.chatPanel()?.videoContainer;
    if (!videoContainer) {
      return;
    }
    this.isVideoRecording = true;
    void this.streamChatService.startVideoStreaming(videoContainer);
    this.changeDetectorRef.detectChanges();
  }

  stopVideoRecording() {
    const videoContainer = this.chatPanel()?.videoContainer;
    if (videoContainer) {
      this.streamChatService.stopVideoStreaming(videoContainer);
    }
    this.isVideoRecording = false;
    this.changeDetectorRef.detectChanges();
  }

  private getAsyncFunctionsFromParts(
    pendingIds: any[], parts: any[], invocationId: string) {
    for (const part of parts) {
      if (part.functionCall && pendingIds.includes(part.functionCall.id)) {
        this.longRunningEvents.push(
          { function: part.functionCall, invocationId: invocationId });
      }
    }
  }

  private openOAuthPopup(url: string): Promise<any> {
    return new Promise((resolve, reject) => {
      // Open OAuth popup
      const popup = this.safeValuesService.windowOpen(
        window, url, 'oauthPopup', 'width=600,height=700');

      if (!popup) {
        reject('Popup blocked!');
        return;
      }

      // Listen for messages from the popup
      const listener = (event: MessageEvent) => {
        if (event.origin !== window.location.origin) {
          return;  // Ignore messages from unknown sources
        }
        const { authResponseUrl } = event.data;
        if (authResponseUrl) {
          resolve(authResponseUrl);
          window.removeEventListener('message', listener);
        } else {
          console.log('OAuth failed', event);
        }
      };

      window.addEventListener('message', listener);
    });
  }

  toggleSidePanel() {
    if (this.showSidePanel) {
      this.sideDrawer()?.close();
      // Clear selected event when closing the drawer
      this.selectedEvent = undefined;
      this.selectedEventIndex = undefined;
      this.selectedMessageIndex = undefined;
    } else {
      this.sideDrawer()?.open();
    }
    this.showSidePanel = !this.showSidePanel;
    window.localStorage.setItem('adk-side-panel-visible', this.showSidePanel.toString());
  }

  toggleAppSelectorDrawer() {
    this.showSessionSelectorDrawer = false;
    this.showAppSelectorDrawer = !this.showAppSelectorDrawer;
    if (this.showAppSelectorDrawer) {
      this.appDrawerSearchControl.setValue('');
      this.explorerCurrentPath.set('./');
    }
  }

  onSelectorDrawerOpened() {
    if (this.showAppSelectorDrawer) {
      this.appSearchInput()?.nativeElement.focus();
    }
  }

  handleAppSearchKeydown(event: KeyboardEvent) {
    if (event.key === 'ArrowDown') {
      event.preventDefault();
      event.stopPropagation();
      const firstItem = this.document.querySelector('.app-selector-list .app-selector-item') as HTMLElement;
      if (firstItem) {
        firstItem.focus();
      }
    }
  }

  handleAppListKeydown(event: KeyboardEvent) {
    if (event.key !== 'ArrowDown' && event.key !== 'ArrowUp') {
      return;
    }

    event.stopPropagation();

    const items = Array.from(this.document.querySelectorAll('.app-selector-list .app-selector-item')) as HTMLElement[];
    const currentIndex = items.indexOf(this.document.activeElement as HTMLElement);

    if (currentIndex > -1) {
      event.preventDefault();
      if (event.key === 'ArrowDown') {
        const nextIndex = currentIndex + 1;
        if (nextIndex < items.length) {
          items[nextIndex].focus();
        }
      } else if (event.key === 'ArrowUp') {
        const prevIndex = currentIndex - 1;
        if (prevIndex >= 0) {
          items[prevIndex].focus();
        } else {
          this.appSearchInput()?.nativeElement.focus();
        }
      }
    }
  }

  onAppSelectorDrawerClosed() {
    this.showAppSelectorDrawer = false;
  }

  toggleSessionSelectorDrawer() {
    this.showAppSelectorDrawer = false;
    this.showSessionSelectorDrawer = !this.showSessionSelectorDrawer;
  }

  onSessionSelectorDrawerClosed() {
    this.showSessionSelectorDrawer = false;
  }

  onSelectorDrawerClosed() {
    this.showAppSelectorDrawer = false;
    this.showSessionSelectorDrawer = false;
  }

  onSessionSelectedFromDrawer(sessionId: string) {
    this.showSessionSelectorDrawer = false;
    this.loadSession(sessionId);
  }

  onSessionReloadedFromDrawer(sessionId: string) {
    this.loadSession(sessionId);
  }

  selectAppFromDrawer(app: string) {
    this.selectedAppControl.setValue(app);
    this.showAppSelectorDrawer = false;
  }

  protected handleTabChange(event: any) {
    if (!this.canChat()) {
      this.resetEditEvalCaseVars();
      this.handleReturnToSession(true);
    }
  }

  protected handleReturnToSession(event: boolean) {
    this.sessionTab?.getSession(this.sessionId);
    this.evalTab()?.resetEvalCase();
    this.chatType.set('session');
  }

  protected handleEvalNotInstalled(errorMsg: string) {
    if (errorMsg) {
      this.openSnackBar(errorMsg, 'OK');
    }
  }

  private resetEventsAndMessages({ keepMessages }: {
    keepMessages?:
    boolean
  } = {}) {
    if (!keepMessages) {
      this.eventData.clear();
      this.uiEvents.set([]);
      this.selectedEvent = undefined;
      this.selectedEventIndex = undefined;
      this.selectedMessageIndex = undefined;
    }
    this.artifacts = [];
  }

  private loadTraceData() {
    if (!this.sessionId) return;
    this.uiStateService.setIsEventRequestResponseLoading(true);
    this.eventService.getTrace(this.appName, this.sessionId)
      .pipe(first(), catchError((err) => { console.error('[DEBUG] getTrace error:', err); return of([] as Span[]); }))
      .subscribe(res => {
        this.traceData = res;
        this.updateSystemInstructionFlags();
        this.traceService.setEventData(this.eventData);
        this.traceService.setMessages(this.uiEvents());
        if (this.selectedEvent) {
          this.populateLlmRequestResponse();
        }
        this.uiStateService.setIsEventRequestResponseLoading(false);
        this.changeDetectorRef.detectChanges();
      });
    this.changeDetectorRef.detectChanges();
  }

  private updateSystemInstructionFlags() {
    if (!this.traceData || this.traceData.length === 0 || this.eventData.size === 0) return;

    const flatten = (arr: any[]): any[] => {
      let result: any[] = [];
      for (const item of arr) {
        result.push(item);
        if (item.children) {
          result = result.concat(flatten(item.children));
        }
      }
      return result;
    };

    const flatSpans = flatten(this.traceData);
    
    const llmSpans = flatSpans
      .filter(s => {
        const isGCSpan = s.attrOperationName === OPERATION_GENERATE_CONTENT;
        const isLegacySpan = s.name === 'call_llm';
        return (isGCSpan || isLegacySpan) && s.io?.inputs !== undefined;
      })
      .sort((a, b) => (a.start_time || 0) - (b.start_time || 0));

    // Clear flags first
    for (const event of this.eventData.values()) {
      event.systemInstructionChanged = false;
      event.precedingSystemInstruction = undefined;
      event.currentSystemInstruction = undefined;
    }

    // Compare consecutive LLM turns
    for (let i = 1; i < llmSpans.length; i++) {
      const currentSpan = llmSpans[i];
      const precedingSpan = llmSpans[i - 1];

      const currentSys = extractSystemInstruction(currentSpan.io?.inputs);
      const precedingSys = extractSystemInstruction(precedingSpan.io?.inputs);

      if (currentSys && precedingSys && currentSys !== precedingSys) {
        const eventId = currentSpan.attrEventId;
        if (eventId) {
          const event = this.eventData.get(eventId);
          if (event) {
            event.systemInstructionChanged = true;
            event.precedingSystemInstruction = precedingSys;
            event.currentSystemInstruction = currentSys;
          }
        }
      }
    }
  }

  private buildUiEventFromEvent(event: any, reverseOrder: boolean = false): UiEvent {
    const isA2aResponse = this.isEventA2aResponse(event);
    const rawParts = isA2aResponse ?
      this.combineA2uiDataParts(event.content?.parts) :
      event.content?.parts || [];
    const parts = this.combineTextParts(rawParts);
    const partsToProcess = reverseOrder ? [...parts].reverse() : parts;

    const role = event.author === 'user' ? 'user' : 'bot';
    const uiEvent = new UiEvent({
      role,
      event
    });

    if (event.errorCode || event.errorMessage) {
      uiEvent.error = {
        errorCode: event.errorCode,
        errorMessage: event.errorMessage
      };
    }

    if (event.inputTranscription !== undefined) {
      if (typeof event.inputTranscription === 'string') {
        uiEvent.event.inputTranscription = { text: event.inputTranscription };
      }
    }
    if (event.outputTranscription !== undefined) {
      if (typeof event.outputTranscription === 'string') {
        uiEvent.event.outputTranscription = { text: event.outputTranscription };
      }
    }

    partsToProcess.forEach((part: any) => {
      if (role === 'bot' && isA2aResponse && this.isA2uiDataPart(part)) {
        part = { a2ui: this.extractA2aDataPartJson(part).data };
      }
      this.processPartIntoMessage(part, event, uiEvent);
    });

    this.extractA2uiJsonFromText(uiEvent);

    return uiEvent;
  }


  private populateMessages(
    events: any[], reverseOrder: boolean = false,
    keepOldMessages: boolean = false) {
    this.resetEventsAndMessages({
      keepMessages:
        keepOldMessages && this.sessionIdOfLoadedMessages === this.sessionId
    });

    events.forEach((event: any) => {
      this.appendEventRow(event, reverseOrder);
    });

    this.sessionIdOfLoadedMessages = this.sessionId;
  }

  private restorePendingLongRunningCalls() {
    const messages = this.uiEvents();
    const functionResponses = new Set<string>();

    // Collect all function response IDs
    this.uiEvents().forEach(msg => {
      if (msg.functionResponses) {
        msg.functionResponses.forEach((fr: any) => {
          if (fr.id) {
            functionResponses.add(fr.id);
          }
        });
      }
    });

    // Check each function call to see if it has a response
    this.uiEvents().forEach(msg => {
      if (msg.functionCalls) {
        msg.functionCalls.forEach((fc: any) => {
          // Get the event for this message to check longRunningToolIds
          const event = msg.event.id ? this.eventData.get(msg.event.id) : null;
          const isLongRunning = fc.isLongRunning ||
            event?.longRunningToolIds?.includes(fc.id);

          // Only restore if it's long-running AND doesn't have a response yet
          if (isLongRunning && !functionResponses.has(fc.id)) {
            fc.isLongRunning = true;
            fc.invocationId = event?.invocationId;
            fc.functionCallEventId = msg.event.id || "";
            fc.needsResponse = true;
            fc.responseStatus = 'pending';
            fc.userResponse = fc.userResponse || '';
          }
        });
      }
    });
  }

  protected updateWithSelectedSession(session: Session) {
    if (!session || !session.id) {
      return;
    }
    this.traceService.resetTraceService();
    this.traceData = [];
    this.sessionId = session.id;
    this.currentSessionState = session.state || {};
    this.evalCase = null;
    this.resetEventsAndMessages();

    if ((session as any).isEvalResult) {
      this.isViewOnlySession.set(true);
      this.readonlySessionType.set('Eval Result');
      const caseName = (session as any).evalCase?.evalId;
      const runTime = (session as any).timestamp;
      this.currentEvalCaseId = caseName;
      this.currentEvalTimestamp = runTime;
      let formattedTime = runTime;
      if (runTime) {
        const numericTimestamp = Number(runTime);
        if (!isNaN(numericTimestamp)) {
          formattedTime = new Date(numericTimestamp * 1000).toLocaleString('en-US', { month: 'short', day: 'numeric', year: 'numeric', hour: 'numeric', minute: '2-digit', hour12: true });
        }
      }
      this.readonlySessionName.set(caseName && formattedTime ? `${formattedTime} > ${caseName}` : session.id);
      this.canEditSession.set(false);
      this.chatPanel()?.canEditSession?.set(false);
    } else {
      this.isViewOnlySession.set(false);
    }

    if ((session as any).evalCase) {
      this.expectedUiEvents.set(this.buildUiEventsFromEvalCase((session as any).evalCase));
    } else {
      this.expectedUiEvents.set([]);
    }

    if ((session as any).evalCaseResult) {
      this.evalCaseResult.set((session as any).evalCaseResult);
    } else {
      this.evalCaseResult.set(null);
    }
    if ((session as any).isEvalResult) {
      this.chatType.set('eval-result');
    } else {
      this.chatType.set('session');
      this.isSideBySide.set(false);
    }

    this.isSessionUrlEnabledObs.subscribe((enabled) => {
      if (enabled) {
        this.updateSelectedSessionUrl();
      }
    });

    if (session.events && session.state) {
      session.events.forEach((event: any) => {
        this.appendEventRow(event, false);


      });

      this.restorePendingLongRunningCalls();
    }

    this.changeDetectorRef.detectChanges();

    this.loadTraceData();

    if (!(session as any).isEvalResult) {
      this.sessionService.canEdit(this.userId, session)
        .pipe(first(), catchError(() => of(true)))
        .subscribe((canEdit) => {
          this.chatPanel()?.canEditSession?.set(canEdit);
          this.canEditSession.set(canEdit);
        });
    }

    this.featureFlagService.isInfinityMessageScrollingEnabled()
      .pipe(first())
      .subscribe((isInfinityMessageScrollingEnabled) => {
        if (!isInfinityMessageScrollingEnabled) {
          this.populateMessages(session.events || []);
        }
        this.loadTraceData();
      });
  }

  private formatToolUses(toolUses: any[]): any[] {
    if (!toolUses || !Array.isArray(toolUses)) {
      return [];
    }
    const formattedToolUses = [];
    for (const toolUse of toolUses) {
      formattedToolUses.push({ name: toolUse.name, args: toolUse.args });
    }
    return formattedToolUses;
  }

  private addEvalCaseResultToEvents(
    res: any, evalCaseResult: EvaluationResult) {
    const invocationResults = evalCaseResult.evalMetricResultPerInvocation!;
    let currentInvocationIndex = -1;

    if (invocationResults) {
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
              if (evalMetricResult.evalStatus === 2) {
                evalStatus = 2;
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

  protected updateWithSelectedTest(testName: string, events: any[]) {
    this.traceService.resetTraceService();
    this.traceData = [];
    if (!this.isViewOnlySession()) {
      this.originalSessionId = this.sessionId;
    }
    this.readonlySessionType.set('Test Case');
    this.readonlySessionName.set(testName);
    this.sessionId = testName;
    this.currentSessionState = {};
    this.evalCase = null;
    this.chatType.set('session');
    this.resetEventsAndMessages();

    events.forEach((event: any) => {
      this.appendEventRow(event, false);
    });

    this.canEditSession.set(false);
    this.chatPanel()?.canEditSession?.set(false);
    this.isViewOnlySession.set(true);

    this.changeDetectorRef.detectChanges();
  }

  private buildUiEventsFromEvalCase(evalCase: EvalCase): UiEvent[] {
    const savedUiEvents = this.uiEvents();
    const savedEventData = this.eventData;
    const savedChatType = this.chatType();
    const savedIsViewOnly = this.isViewOnlySession();
    const savedType = this.readonlySessionType();
    const savedName = this.readonlySessionName();

    this.uiEvents.set([]);
    this.eventData = new Map();

    this.updateWithSelectedEvalCase(evalCase);

    const expectedEvents = this.uiEvents();

    this.uiEvents.set(savedUiEvents);
    this.eventData = savedEventData;
    this.chatType.set(savedChatType);
    this.isViewOnlySession.set(savedIsViewOnly);
    this.readonlySessionType.set(savedType);
    this.readonlySessionName.set(savedName);

    return expectedEvents;
  }

  protected updateWithSelectedEvalCase(evalCase: EvalCase) {
    this.evalCase = evalCase;
    this.chatType.set('eval-case');

    this.isViewOnlySession.set(true);
    this.readonlySessionType.set('Eval Case');
    this.readonlySessionName.set(evalCase.evalId);

    this.chatType.set('eval-case');
    this.isSessionUrlEnabledObs.subscribe((enabled) => {
      if (enabled) {
        this.updateSelectedSessionUrl();
      }
    });

    this.resetEventsAndMessages();

    if (evalCase.events && evalCase.events.length > 0) {
      for (const event of evalCase.events) {
        this.appendEventRow(event, false);
      }
    } else {
      evalCase.events = [];
      let invocationIndex = 0;

      for (const invocation of evalCase.conversation) {
        if (invocation.userContent?.parts) {
          evalCase.events.push({
            author: 'user',
            content: invocation.userContent,
            invocationIndex,
          });
        }

        if (invocation.intermediateData?.invocationEvents) {
          let toolUseIndex = 0;
          for (const event of invocation.intermediateData.invocationEvents) {
            event.invocationIndex = invocationIndex;

            // Check if it's a function call to assign toolUseIndex
            if (event.content?.parts?.[0]?.functionCall) {
              event.toolUseIndex = toolUseIndex;
              toolUseIndex++;
            }

            evalCase.events.push(event);
          }
        } else if (invocation.intermediateData?.toolUses) {
          let toolUseIndex = 0;
          for (const toolUse of invocation.intermediateData.toolUses) {
            evalCase.events.push({
              author: 'bot',
              content: {
                parts: [{
                  functionCall: { name: toolUse.name, args: toolUse.args },
                }],
              },
              invocationIndex,
              toolUseIndex,
            });
            toolUseIndex++;

            evalCase.events.push({
              author: 'bot',
              content: {
                parts: [{ functionResponse: { name: toolUse.name } }],
              },
              invocationIndex,
            });
          }
        }

        if (invocation.finalResponse?.parts) {
          evalCase.events.push({
            author: 'bot',
            content: invocation.finalResponse,
            invocationIndex,
          });
        }
        invocationIndex++;
      }

      for (const event of evalCase.events) {
        this.appendEventRow(event, false);
      }
    }
  }

  protected handleEditEvalCaseRequested(evalCase: EvalCase) {
    this.updateWithSelectedEvalCase(evalCase);
    this.editEvalCase();
  }

  protected updateSelectedEvalSetId(evalSetId: string) {
    this.evalSetId = evalSetId;
  }

  protected editEvalCaseMessage(message: any) {
    this.isEvalCaseEditing.set(true);
    this.userEditEvalCaseMessage = message.text;
    message.isEditing = true;
    setTimeout(() => {
      const textarea = this.chatPanel()?.textarea?.nativeElement;
      if (!textarea) {
        return;
      }
      textarea.focus();
      let textLength = textarea.value.length;
      if (message.text.charAt(textLength - 1) === '\n') {
        textLength--;
      }
      textarea.setSelectionRange(textLength, textLength);
    }, 0);
  }

  protected editFunctionArgs(message: any) {
    this.isEvalCaseEditing.set(true);
    const dialogRef = this.dialog.open(EditJsonDialogComponent, {
      maxWidth: '90vw',
      maxHeight: '90vh',
      data: {
        dialogHeader: 'Edit function arguments',
        functionName: message.functionCall.name,
        jsonContent: message.functionCall.args,
      },
    });

    dialogRef.afterClosed().subscribe((result) => {
      this.isEvalCaseEditing.set(false);
      if (result) {
        this.hasEvalCaseChanged.set(true);
        message.functionCall.args = result;

        this.updatedEvalCase = structuredClone(this.evalCase!);
        this.updatedEvalCase!.conversation[message.invocationIndex]
          .intermediateData!.toolUses![message.toolUseIndex]
          .args = result;
      }
    });
  }

  protected saveEvalCase() {
    this.evalService
      .updateEvalCase(
        this.appName, this.evalSetId, this.updatedEvalCase!.evalId,
        this.updatedEvalCase!)
      .subscribe((res) => {
        this.openSnackBar('Eval case updated', 'OK');
        this.resetEditEvalCaseVars();
      });
  }

  protected cancelEditEvalCase() {
    this.resetEditEvalCaseVars();
    this.updateWithSelectedEvalCase(this.evalCase!);
  }

  private resetEditEvalCaseVars() {
    this.hasEvalCaseChanged.set(false);
    this.isEvalCaseEditing.set(false);
    this.isEvalEditMode.set(false);
    this.updatedEvalCase = null;
  }

  protected cancelEditMessage(message: any) {
    message.isEditing = false;
    this.isEvalCaseEditing.set(false);
  }

  protected saveEditMessage(message: any) {
    this.hasEvalCaseChanged.set(true);
    this.isEvalCaseEditing.set(false);
    message.isEditing = false;
    message.text =
      this.userEditEvalCaseMessage ? this.userEditEvalCaseMessage : ' ';

    this.updatedEvalCase = structuredClone(this.evalCase!);
    this.updatedEvalCase!.conversation[message.invocationIndex]
      .finalResponse!.parts![message.finalResponsePartIndex] = {
      text: this.userEditEvalCaseMessage
    };

    this.userEditEvalCaseMessage = '';
  }

  protected handleKeydown(event: KeyboardEvent, message: any) {
    if (event.key === 'Enter' && !event.shiftKey) {
      event.preventDefault();
      this.saveEditMessage(message);
    } else if (event.key === 'Escape') {
      this.cancelEditMessage(message);
    }
  }

  protected deleteEvalCaseMessage(message: any, index: number) {
    this.hasEvalCaseChanged.set(true);
    this.uiEvents.update((uiEvents) => uiEvents.filter((m, i) => i !== index));

    this.updatedEvalCase = structuredClone(this.evalCase!);
    this.updatedEvalCase!.conversation[message.invocationIndex]
      .finalResponse!.parts!.splice(message.finalResponsePartIndex, 1);
  }

  protected editEvalCase() {
    this.isEvalEditMode.set(true);
    this.isViewOnlySession.set(false);
  }

  protected deleteEvalCase() {
    const dialogData: DeleteSessionDialogData = {
      title: 'Confirm delete',
      message: `Are you sure you want to delete ${this.evalCase!.evalId}?`,
      confirmButtonText: 'Delete',
      cancelButtonText: 'Cancel',
    };

    const dialogRef = this.dialog.open(DeleteSessionDialogComponent, {
      width: '600px',
      data: dialogData,
    });

    dialogRef.afterClosed().subscribe((result: boolean) => {
      if (result) {
        this.evalTab()?.deleteEvalCase(this.evalCase!.evalId);
        this.openSnackBar('Eval case deleted', 'OK');
      }
    });
  }

  onNewSessionClick() {
    this.resetToNewSession();
    this.eventData.clear();
    this.uiEvents.set([]);
    this.artifacts = [];
    this.traceData = [];

    // Clear selected event
    this.selectedEvent = undefined;
    this.selectedEventIndex = undefined;
    this.selectedMessageIndex = undefined;
    this.traceService.resetTraceService();

    // Auto-focus chat input
    this.chatPanel()?.focusInput();

    // Close eval history if opened
    if (!!this.evalTab()?.showEvalHistory) {
      this.evalTab()?.toggleEvalHistoryButton();
    }
  }

  getToolbarSessionId() {
    if (!this.sessionId) {
      return 'NEW SESSION';
    }

    if (this.isViewOnlySession()) {
      return this.sessionId;
    }

    const meta = this.currentSessionState?.['__session_metadata__'] as any;
    if (meta?.displayName) {
      return meta.displayName;
    }
    return this.sessionId;
  }

  getCurrentSessionDisplayName() {
    if (!this.sessionId) {
      return 'NEW SESSION';
    }

    const meta = this.currentSessionState?.['__session_metadata__'] as any;
    return meta?.displayName || this.sessionId;
  }

  async copySessionId() {
    if (!this.sessionId) {
      return;
    }

    try {
      await navigator.clipboard.writeText(this.sessionId);
      this.openSnackBar(this.i18n.sessionIdCopiedMessage, 'OK');
    } catch {
      this.openSnackBar(this.i18n.copySessionIdFailedMessage, 'OK');
    }
  }

  saveSessionName(newName: string) {
    if (!this.sessionId) return;

    const metadataDelta = {
      __session_metadata__: {
        ...(this.currentSessionState?.['__session_metadata__'] as any || {}),
        displayName: newName
      }
    };

    this.currentSessionState = {
      ...this.currentSessionState,
      ...metadataDelta
    };

    this.updatedSessionState.set({
      ...this.updatedSessionState(),
      ...metadataDelta
    });

    this.sessionService.updateSession(this.userId, this.appName, this.sessionId, { stateDelta: metadataDelta }).subscribe({
      next: () => {
        if (this.sessionTab) {
          this.sessionTab.reloadSession(this.sessionId!);
        }
        if (this.drawerSessionTab()) {
          this.drawerSessionTab()!.reloadSession(this.sessionId!);
        }
      }
    });
  }

  get sessionDisplayNameDraft() {
    const meta = this.currentSessionState?.['__session_metadata__'] as any;
    return meta?.displayName || '';
  }

  saveUserId(updatedUserId: string) {
    updatedUserId = updatedUserId.trim();
    if (!updatedUserId) {
      this.openSnackBar(this.i18n.invalidUserIdMessage, 'OK');
      return;
    }

    this.userId = updatedUserId;
    this.isSessionUrlEnabledObs.pipe(take(1)).subscribe((enabled) => {
      if (enabled) {
        this.updateSelectedSessionUrl();
      }
    });
  }



  onFileSelect(event: Event) {
    const input = event.target as HTMLInputElement;
    if (input.files) {
      for (let i = 0; i < input.files.length; i++) {
        const file = input.files[i];
        const url = this.safeValuesService.createObjectUrl(file);
        this.selectedFiles.push({ file, url });
      }
    }
    input.value = '';
  }

  removeFile(index: number) {
    URL.revokeObjectURL(this.selectedFiles[index].url);
    this.selectedFiles.splice(index, 1);
  }

  toggleSse() {
    this.useSse.set(!this.useSse());
    window.localStorage.setItem('adk-use-sse', String(this.useSse()));
  }

  enterBuilderMode() {
    const url = this.router
      .createUrlTree([], {
        queryParams: { mode: 'builder' },
        queryParamsHandling: 'merge',
      })
      .toString();
    this.location.replaceState(url);
    this.isBuilderMode.set(true);
    this.analyticsService.sendEvent('builder_enter_click');

    // Load existing agent configuration if app is selected
    if (this.appName) {
      this.loadExistingAgentConfiguration();
    }
  }


  private loadExistingAgentConfiguration() {
    const rootYaml$ = this.agentService.getAgentBuilderTmp(this.appName);
    const pluginsYaml$ = this.agentService.getSubAgentBuilder(this.appName, 'plugins.yaml').pipe(
      catchError(() => of(''))
    );

    forkJoin([rootYaml$, pluginsYaml$]).subscribe({
      next: ([rootContent, pluginsContent]) => {
        if (rootContent) {
          this.canvasComponent()?.loadFromYaml(rootContent, this.appName, pluginsContent);
        }
      },
      error: (error: any) => {
        console.error('Error loading agent configuration:', error);
        this.openSnackBar('Error loading agent configuration', 'OK');
      },
    });
  }

  protected exitBuilderMode() {
    const url = this.router
      .createUrlTree([], {
        queryParams: { mode: null },
        queryParamsHandling: 'merge',
      })
      .toString();
    this.location.replaceState(url);
    this.isBuilderMode.set(false);
    this.agentBuilderService.clear();
  }

  protected toggleBuilderAssistant() {
    this.showBuilderAssistant = !this.showBuilderAssistant;
  }

  openAddItemDialog(): void {
    this.apps$.pipe(take(1)).subscribe((apps) => {
      const dialogRef = this.dialog.open(AddItemDialogComponent, {
        width: '600px',
        data: { existingAppNames: apps ?? [] },
      });
    });
  }

  eventGraphSvgLight: Record<string, string> = {};
  eventGraphSvgDark: Record<string, string> = {};
  selectedEventGraphPath: string = '';
  showAgentStructureOverlay = false;
  agentStructureOverlayMode: 'session' | 'event' = 'session';

  openAgentStructureGraphDialog(mode: 'session' | 'event' = 'session'): void {
    this.agentStructureOverlayMode = mode;
    this.showAgentStructureOverlay = true;
    this.analyticsService.sendEvent('graph_view_click');
  }

  saveAgentBuilder() {
    this.canvasComponent()?.saveAgent(this.appName);
  }

  onEventTabDrillDown(path: string) {
    this.updateRenderedGraph(undefined, path);
  }

  async updateRenderedGraph(overrideNodePath?: string, overrideGraphPath?: string) {
    const sessionGraphSvgLight = this.sessionGraphSvgLight;
    const sessionGraphSvgDark = this.sessionGraphSvgDark;
    if (Object.keys(sessionGraphSvgLight).length === 0 || Object.keys(sessionGraphSvgDark).length === 0) {
      this.renderedEventGraph = undefined;
      return;
    }

    // Calculate workflow paths and node names (defaults to root graph '' if no path)
    let nodePath = overrideNodePath || this.selectedEvent?.nodeInfo?.path;
    if (!overrideNodePath && this.selectedEvent?.author === 'user') {
      nodePath = '__START__';
    }

    let bareNodePath = nodePath;
    if (nodePath && nodePath !== '__START__') {
      bareNodePath = nodePath.split('/').map((s: string) => s.split('@')[0]).join('/');
    }

    let graphPath = overrideGraphPath !== undefined ? overrideGraphPath : '';
    let nodeName = '';

    if (bareNodePath && overrideGraphPath === undefined) {
      const segments = bareNodePath.split('/');
      nodeName = segments[segments.length - 1];

      if (segments.length >= 2 && segments[segments.length - 1] === 'call_llm' && segments[segments.length - 2] === this.selectedEvent?.author) {
        nodeName = segments[segments.length - 2];
        graphPath = segments.slice(1, -2).join('/');
      } else {
        graphPath = segments.slice(1, -1).join('/');
      }

      if (graphPath) {
        const hasBackendGraph = (graphPath in sessionGraphSvgLight) && !(graphPath in this.dynamicGraphDot);
        if (!hasBackendGraph) {
          const dynamicDot = this.tryGenerateDynamicGraph(graphPath);
          if (dynamicDot) {
            if (this.dynamicGraphDot[graphPath] !== dynamicDot) {
              try {
                const svg = await this.graphService.render(dynamicDot);
                this.sessionGraphSvgLight[graphPath] = svg;
                this.sessionGraphSvgDark[graphPath] = svg;
                this.dynamicGraphDot[graphPath] = dynamicDot;
              } catch (err) {
                console.error('Failed to render dynamic graph', err);
              }
            }
          }
        }
      }

      while (graphPath && !(graphPath in sessionGraphSvgLight)) {
        const pathSegments = graphPath.split('/');
        pathSegments.pop();
        graphPath = pathSegments.join('/');
      }
    }

    let dot = this.sessionGraphDot[graphPath] || this.sessionGraphDot[''] || '';
    let modifiedDot = dot;
    let isModified = false;

    if (this.selectedEvent) {
      const highlightPairs = this.getV1HighlightPairs(this.selectedEvent);
      for (const [from, to] of highlightPairs) {
        // Check if it's a function response (from=function, to=agent)
        if (from && to && to === this.selectedEvent.author) {
          const edgeRegex = new RegExp(`("${to}"|${to})\\s*->\\s*("${from}"|${from})`, 'g');
          if (edgeRegex.test(dot)) {
            modifiedDot = dot.replace(edgeRegex, `$& [dir=back]`);
            isModified = true;
          }
        }
      }
    }

    let highlightedSvgLight = '';
    let highlightedSvgDark = '';

    if (isModified) {
      try {
        highlightedSvgLight = await this.graphService.render(modifiedDot);
        highlightedSvgDark = highlightedSvgLight; // Fallback to same SVG for dark mode if needed
      } catch (err) {
        console.error('Failed to render modified graph', err);
        highlightedSvgLight = sessionGraphSvgLight[graphPath] || sessionGraphSvgLight[''] || '';
        highlightedSvgDark = sessionGraphSvgDark[graphPath] || sessionGraphSvgDark[''] || '';
      }
    } else {
      highlightedSvgLight = sessionGraphSvgLight[graphPath] || sessionGraphSvgLight[''] || '';
      highlightedSvgDark = sessionGraphSvgDark[graphPath] || sessionGraphSvgDark[''] || '';
    }

    // Apply V1-style highlighting (based on function calls) if applicable
    if (this.selectedEvent) {
      const highlightPairs = this.getV1HighlightPairs(this.selectedEvent);
      if (highlightPairs.length > 0) {
        highlightedSvgLight = this.applyV1Highlighting(highlightedSvgLight, highlightPairs, false);
        highlightedSvgDark = this.applyV1Highlighting(highlightedSvgDark, highlightPairs, true);
      }
    }

    const runNodeNames: string[] = [];
    const allRunNodeNames: string[] = [];
    if (this.selectedEventIndex !== undefined) {
      // V2 backend: use existing workflow path logic
      const eventArray = Array.from(this.eventData.values());
      const selectedEvent: any = eventArray[this.selectedEventIndex];
      const targetInvocationId = selectedEvent?.invocationId;

      for (let i = 0; i < eventArray.length; i++) {
        const ev: any = eventArray[i];

        if (targetInvocationId && ev.invocationId !== targetInvocationId) {
          continue;
        }

        let np = ev.nodeInfo?.path;
        if (ev.author === 'user') {
          np = '__START__';
        }

        let bareNp = np;
        if (np && np !== '__START__') {
          bareNp = np.split('/').map((s: string) => s.split('@')[0]).join('/');
        }

        if (bareNp) {
          const segments = bareNp.split('/');
          let evNodeName = segments[segments.length - 1];
          let evGraphPath = '';

          if (segments.length >= 2 && segments[segments.length - 1] === 'call_llm' && segments[segments.length - 2] === ev.author) {
            evNodeName = segments[segments.length - 2];
            evGraphPath = segments.slice(1, -2).join('/');
          } else {
            evGraphPath = segments.slice(1, -1).join('/');
          }

          const isDynamic = graphPath in this.dynamicGraphDot;
          const fullSegments = np ? np.split('/') : [];
          const fullEvNodeName = fullSegments.length > 0 ? fullSegments[fullSegments.length - 1] : '';
          const nameToUse = isDynamic ? fullEvNodeName : evNodeName;

          if (evGraphPath === graphPath) {
            if (i <= this.selectedEventIndex) {
              if (runNodeNames.length === 0 || runNodeNames[runNodeNames.length - 1] !== nameToUse) {
                runNodeNames.push(nameToUse);
              }
            }
            if (allRunNodeNames.length === 0 || allRunNodeNames[allRunNodeNames.length - 1] !== nameToUse) {
              allRunNodeNames.push(nameToUse);
            }
          }
        }
      }
    }

    // Add V1 highlight targets to execution path so V2 logic treats them as visited
    if (this.selectedEvent) {
      const highlightPairs = this.getV1HighlightPairs(this.selectedEvent);
      for (const [from, to] of highlightPairs) {
        if (to && to !== '') {
          if (!allRunNodeNames.includes(to)) allRunNodeNames.push(to);
          if (!runNodeNames.includes(to)) runNodeNames.push(to);
        }
        if (from && from !== '') {
          if (!allRunNodeNames.includes(from)) allRunNodeNames.push(from);
          if (!runNodeNames.includes(from)) runNodeNames.push(from);
        }
      }
    }

    if (allRunNodeNames.length > 0 && highlightedSvgLight && highlightedSvgDark) {
      highlightedSvgLight = this.highlightExecutionPathInSvg(highlightedSvgLight, runNodeNames, allRunNodeNames, 'light');
      highlightedSvgDark = this.highlightExecutionPathInSvg(highlightedSvgDark, runNodeNames, allRunNodeNames, 'dark');
    }

    this.selectedEventGraphPath = graphPath;
    this.eventGraphSvgLight = { ...sessionGraphSvgLight, [graphPath]: highlightedSvgLight };
    this.eventGraphSvgDark = { ...sessionGraphSvgDark, [graphPath]: highlightedSvgDark };

    const highlightedSvg = this.themeService?.currentTheme() === 'dark' ? highlightedSvgDark : highlightedSvgLight;

    this.rawSvgString = highlightedSvg;
    this.renderedEventGraph = this.safeValuesService.bypassSecurityTrustHtml(highlightedSvg);
    this.changeDetectorRef.detectChanges();
  }

  tryGenerateDynamicGraph(graphPath: string): string | null {
    const eventArray = Array.from(this.eventData.values());
    const runs: { run: string, branch?: string }[] = [];

    for (const ev of eventArray) {
      const np = ev.nodeInfo?.path;
      if (!np) continue;

      const segments = np.split('/');
      const bareSegments = segments.map((s: string) => s.split('@')[0]);

      let evGraphPath = '';
      if (bareSegments.length >= 2 && bareSegments[bareSegments.length - 1] === 'call_llm' && bareSegments[bareSegments.length - 2] === ev.author) {
        evGraphPath = bareSegments.slice(1, -2).join('/');
      } else {
        evGraphPath = bareSegments.slice(1, -1).join('/');
      }

      if (evGraphPath === graphPath) {
        const lastSegment = segments[segments.length - 1];
        runs.push({ run: lastSegment, branch: ev.branch });
      }
    }

    if (runs.length === 0) {
      return null;
    }

    const uniqueRuns = new Set<string>();
    const runToBranch = new Map<string, string>();

    for (const r of runs) {
      uniqueRuns.add(r.run);
      if (r.branch) {
        runToBranch.set(r.run, r.branch);
      }
    }

    if (uniqueRuns.size === 0) return null;

    let dot = 'digraph G {\n';
    dot += '  rankdir=TB;\n';
    dot += '  node [shape=box, style=filled, fillcolor="#e6f4ea", color="#34a853"];\n';

    // Add START node
    dot += '  "START" [shape=ellipse, style=filled, fillcolor="#fce8e6", color="#ea4335"];\n';

    const groupedRuns = new Map<string, string[]>();
    for (const run of uniqueRuns) {
      const bareName = run.split('@')[0];
      if (!groupedRuns.has(bareName)) {
        groupedRuns.set(bareName, []);
      }
      groupedRuns.get(bareName)!.push(run);
    }

    for (const [bareName, runs] of Array.from(groupedRuns.entries())) {
      dot += `  subgraph cluster_${bareName} {\n`;
      dot += `    label="${bareName}";\n`;
      dot += `    style=dashed;\n`;
      dot += `    color="#b0b0b0";\n`;
      for (const run of runs) {
        const runId = run.split('@')[1] || '';
        dot += `    "${run}" [label="@${runId}"];\n`;
      }
      dot += `  }\n`;
    }

    const edges = new Set<string>();
    for (const run of uniqueRuns) {
      const branch = runToBranch.get(run);
      if (branch) {
        const segments = branch.split('.');
        if (segments.length >= 2) {
          const origin = segments[segments.length - 2];
          const target = segments[segments.length - 1];
          edges.add(`"${origin}" -> "${target}"`);
        } else if (segments.length === 1) {
          edges.add(`"START" -> "${segments[0]}"`);
        }
      } else {
        edges.add(`"START" -> "${run}"`);
      }
    }

    for (const edge of edges) {
      dot += `  ${edge};\n`;
    }

    dot += '}';
    return dot;
  }

  highlightExecutionPathInSvg(svgString: string, runNodeNames: string[], allRunNodeNames: string[], theme: 'light' | 'dark' = 'light'): string {
    if (!allRunNodeNames || allRunNodeNames.length === 0) return svgString;

    const parser = new DOMParser();
    const doc = parser.parseFromString(svgString, 'image/svg+xml');

    const reverseAdjacencyList = new Map<string, string[]>();
    const forwardAdjacencyList = new Map<string, string[]>();
    const edgeElements = doc.querySelectorAll('g.edge');

    edgeElements.forEach((edgeElement: any) => {
      const titleElement = edgeElement.querySelector('title');
      let title = titleElement?.textContent?.trim() || '';
      if (title.includes('->')) {
        const parts = title.split('->');
        const from = parts[0].trim().replace(/^"|"$/g, '');
        const to = parts[1].trim().replace(/^"|"$/g, '');

        if (!reverseAdjacencyList.has(to)) reverseAdjacencyList.set(to, []);
        reverseAdjacencyList.get(to)!.push(from);
        if (!forwardAdjacencyList.has(from)) forwardAdjacencyList.set(from, []);
        forwardAdjacencyList.get(from)!.push(to);
      }
    });

    const nodeNameToId = new Map<string, string>();
    const nodeElements = doc.querySelectorAll('g.node');
    nodeElements.forEach((nodeElement: any) => {
      const textElements = Array.from(nodeElement.querySelectorAll('text'));
      const textContent = textElements.map((t: any) => t.textContent?.trim() || '').join('');

      const titleElement = nodeElement.querySelector('title');
      const titleName = titleElement?.textContent?.trim() || '';
      const cleanTitleName = titleName.replace(/^"|"$/g, '');

      nodeNameToId.set(textContent, cleanTitleName);
      if (titleName) {
        nodeNameToId.set(titleName, cleanTitleName);
      }
    });

    const findNodeId = (name: string) => {
      const cleanName = name.toLowerCase();

      // First pass: exact match (case insensitive, space normalized)
      for (const [text, id] of nodeNameToId.entries()) {
        const cleanText = text.toLowerCase().replace(/\s+/g, '_');
        if (cleanText === cleanName || cleanText === `"${cleanName}"`) {
          return id;
        }
      }

      // Second pass: includes
      for (const [text, id] of nodeNameToId.entries()) {
        const cleanText = text.toLowerCase().replace(/\s+/g, '_');
        if (cleanText.includes(cleanName)) {
          return id;
        }
      }
      return null;
    };

    const targetNodeIds = runNodeNames.map(name => findNodeId(name)).filter(id => id) as string[];
    const allTargetNodeIds = allRunNodeNames.map(name => findNodeId(name)).filter(id => id) as string[];

    const { visitedNodes, visitedEdges } = this.calculateVisitedPath(targetNodeIds, reverseAdjacencyList);
    const { visitedNodes: allVisitedNodes } = this.calculateVisitedPath(allTargetNodeIds, reverseAdjacencyList);
    const edgeCounts = this.calculateEdgeCounts(targetNodeIds, visitedNodes, visitedEdges, forwardAdjacencyList);

    const visitedEdgeColor = theme === 'dark' ? '#34a853' : '#a1c2a1';
    const activeStrokeColor = theme === 'dark' ? '#ceead6' : '#0d652d';
    const activeFillColor = theme === 'dark' ? '#137333' : '#a6d8b5';
    const visitedStrokeColor = theme === 'dark' ? '#34a853' : '#a1c2a1';
    const visitedFillColor = theme === 'dark' ? '#0d652d' : '#e6f4ea';

    // Find the edge that triggered the last active node
    let triggeringEdge: string | null = null;
    const lastTargetId = targetNodeIds[targetNodeIds.length - 1];
    if (targetNodeIds.length > 0 && lastTargetId) {
      const fullSeq = [...targetNodeIds];
      const startNode = Array.from(visitedNodes).find(n => n.toLowerCase() === '__start__');

      if (fullSeq.length > 0 && fullSeq[0].toLowerCase() !== '__start__' && startNode) {
        fullSeq.unshift(startNode);
      }

      const activeNodeIndex = fullSeq.lastIndexOf(lastTargetId);

      if (activeNodeIndex > 0) {
        const src = fullSeq[activeNodeIndex - 1];
        const dst = fullSeq[activeNodeIndex];

        const queue: { node: string, path: string[] }[] = [];
        const visited = new Set<string>();

        const initialChildren = forwardAdjacencyList.get(src) || [];
        for (const child of initialChildren) {
          const edgeKey = `${src}->${child}`;
          if (visitedEdges.has(edgeKey)) {
            queue.push({ node: child, path: [edgeKey] });
            visited.add(child);
          }
        }

        while (queue.length > 0) {
          const current = queue.shift()!;
          if (current.node === dst) {
            if (current.path.length > 0) {
              triggeringEdge = current.path[current.path.length - 1];
            }
            break;
          }

          const children = forwardAdjacencyList.get(current.node) || [];
          for (const child of children) {
            const edgeKey = `${current.node}->${child}`;
            if (visitedEdges.has(edgeKey) && !visited.has(child)) {
              visited.add(child);
              queue.push({ node: child, path: [...current.path, edgeKey] });
            }
          }
        }
      }
    }

    edgeElements.forEach((edgeElement: any) => {
      const titleElement = edgeElement.querySelector('title');
      let title = titleElement?.textContent?.trim() || '';
      if (title.includes('->')) {
        const parts = title.split('->');
        const from = parts[0].trim().replace(/^"|"$/g, '');
        const to = parts[1].trim().replace(/^"|"$/g, '');
        const edgeKey = `${from}->${to}`;

        if (visitedEdges.has(edgeKey)) {
          const isTrigger = edgeKey === triggeringEdge;
          const shape = edgeElement.querySelector('path');
          if (shape) {
            shape.setAttribute('stroke', isTrigger ? activeStrokeColor : visitedEdgeColor);
            shape.setAttribute('stroke-width', isTrigger ? '4' : '2');
          }
          const polygon = edgeElement.querySelector('polygon');
          if (polygon) {
            polygon.setAttribute('fill', isTrigger ? activeStrokeColor : visitedEdgeColor);
            polygon.setAttribute('stroke', isTrigger ? activeStrokeColor : visitedEdgeColor);
          }

          const count = edgeCounts.get(edgeKey) || 0;
          if (count > 1) {
            const existingText = edgeElement.querySelector('text');
            if (existingText) {
              existingText.textContent = `${existingText.textContent} (${count}x)`;
              existingText.setAttribute('fill', theme === 'dark' ? '#ffffff' : '#000000');
              existingText.setAttribute('font-weight', 'bold');
            } else if (shape) {
              const d = shape.getAttribute('d') || '';
              const matches = [...d.matchAll(/[-+]?[0-9]*\.?[0-9]+/g)];
              if (matches.length >= 4) {
                const nums = matches.map(m => parseFloat(m[0]));
                const mx = (nums[0] + nums[nums.length - 2]) / 2;
                const my = (nums[1] + nums[nums.length - 1]) / 2;

                const badgeGroup = doc.createElementNS("http://www.w3.org/2000/svg", "g");
                const badge = doc.createElementNS("http://www.w3.org/2000/svg", "rect");
                badge.setAttribute('x', (mx - 14).toString());
                badge.setAttribute('y', (my - 10).toString());
                badge.setAttribute('width', '28');
                badge.setAttribute('height', '20');
                badge.setAttribute('rx', '4');
                badge.setAttribute('fill', theme === 'dark' ? '#0d652d' : '#e6f4ea');
                badge.setAttribute('stroke', visitedEdgeColor);
                badge.setAttribute('stroke-width', '1');
                badgeGroup.appendChild(badge);

                const txt = doc.createElementNS("http://www.w3.org/2000/svg", "text");
                txt.setAttribute('x', mx.toString());
                txt.setAttribute('y', (my + 4).toString());
                txt.setAttribute('text-anchor', 'middle');
                txt.setAttribute('fill', theme === 'dark' ? '#ffffff' : '#000000');
                txt.setAttribute('font-size', '12px');
                txt.setAttribute('font-weight', 'bold');
                txt.textContent = count.toString() + 'x';
                badgeGroup.appendChild(txt);

                edgeElement.appendChild(badgeGroup);
              }
            }
          }
        }
      }
    });

    nodeElements.forEach((nodeElement: any) => {
      const titleElement = nodeElement.querySelector('title');
      const titleName = titleElement?.textContent?.trim().replace(/^"|"$/g, '') || '';

      if (visitedNodes.has(titleName)) {
        const shape = nodeElement.querySelector('ellipse, polygon, path, rect');
        if (shape) {
          const isActive = titleName === lastTargetId || titleName.toLowerCase() === '__end__';
          shape.setAttribute('stroke', isActive ? activeStrokeColor : visitedStrokeColor);
          shape.setAttribute('fill', isActive ? activeFillColor : visitedFillColor);
          shape.setAttribute('stroke-width', isActive ? '4' : '2');
        }
      }

      if (!allVisitedNodes.has(titleName)) {
        nodeElement.classList.add('unvisited-node');
        const shape = nodeElement.querySelector('ellipse, polygon, path, rect');
        if (shape) {
          shape.setAttribute('stroke', theme === 'dark' ? '#666666' : '#b0b0b0');
          shape.setAttribute('fill', theme === 'dark' ? '#424242' : '#e0e0e0');
          const shapeTitle = doc.createElementNS('http://www.w3.org/2000/svg', 'title');
          shapeTitle.textContent = 'Not run in this invocation';
          shape.appendChild(shapeTitle);
        }
        const textElements = nodeElement.querySelectorAll('text');
        textElements.forEach((t: any) => {
          t.setAttribute('fill', theme === 'dark' ? '#888888' : '#757575');
          const textTitle = doc.createElementNS('http://www.w3.org/2000/svg', 'title');
          textTitle.textContent = 'Not run in this invocation';
          t.appendChild(textTitle);
        });
        if (titleElement) {
          titleElement.textContent = 'Not run in this invocation';
        } else {
          const newTitle = doc.createElementNS('http://www.w3.org/2000/svg', 'title');
          newTitle.textContent = 'Not run in this invocation';
          nodeElement.appendChild(newTitle);
        }
        const aElements = nodeElement.querySelectorAll('a');
        aElements.forEach((aElem: any) => {
          aElem.title = 'Not run in this invocation';
        });
      }
    });

    return new XMLSerializer().serializeToString(doc);
  }

  /**
   * Extract highlight pairs (edge tuples) for v1 backend.
   * Mimics v1 backend logic from adk_web_server.py:1960-1983
   */
  private getV1HighlightPairs(event: any): [string, string][] {
    const pairs: [string, string][] = [];

    const functionCalls = event.content?.parts?.filter((p: any) => p.functionCall) || [];
    const functionResponses = event.content?.parts?.filter((p: any) => p.functionResponse) || [];

    if (functionCalls.length > 0) {
      // If event has function calls: highlight edges from author -> function_call.name
      for (const part of functionCalls) {
        if (part.functionCall?.name && event.author) {
          pairs.push([event.author, part.functionCall.name]);
        }
      }
    } else if (functionResponses.length > 0) {
      // If event has function responses: highlight edges from function_response.name -> author
      for (const part of functionResponses) {
        if (part.functionResponse?.name && event.author) {
          pairs.push([part.functionResponse.name, event.author]);
        }
      }
    } else {
      // Otherwise: just highlight the author node (edge to empty string)
      if (event.author) {
        pairs.push([event.author, '']);
      }
    }

    return pairs;
  }

  /**
   * Apply v1-style highlighting to SVG.
   */
  private applyV1Highlighting(svgString: string, highlightPairs: [string, string][], isDarkMode: boolean): string {
    const parser = new DOMParser();
    const doc = parser.parseFromString(svgString, 'image/svg+xml');

    const darkGreen = '#0F5223';
    const lightGreen = '#69CB87';
    const textColor = isDarkMode ? '#cccccc' : '#000000';

    // Get all node names that appear in highlight pairs
    const highlightedNodeNames = new Set<string>();
    for (const [from, to] of highlightPairs) {
      if (from) highlightedNodeNames.add(from);
      if (to) highlightedNodeNames.add(to);
    }

    // Highlight nodes
    const nodeElements = doc.querySelectorAll('g.node');
    nodeElements.forEach((nodeElement: any) => {
      const titleElement = nodeElement.querySelector('title');
      const nodeName = titleElement?.textContent?.trim().replace(/^"|"$/g, '') || '';

      const textElements = Array.from(nodeElement.querySelectorAll('text'));
      const textContent = textElements.map((t: any) => t.textContent?.trim() || '').join('').toLowerCase().replace(/\s+/g, '_');

      let isHighlighted = highlightedNodeNames.has(nodeName);
      if (!isHighlighted) {
        for (const name of highlightedNodeNames) {
          const cleanName = name.toLowerCase().replace(/\s+/g, '_');
          if (textContent.includes(cleanName)) {
            isHighlighted = true;
            break;
          }
        }
      }

      if (isHighlighted) {
        // Highlight this node with dark green
        const ellipse = nodeElement.querySelector('ellipse, polygon, path, rect');
        if (ellipse) {
          ellipse.setAttribute('fill', darkGreen);
          ellipse.setAttribute('stroke', darkGreen);
        }
        textElements.forEach((t: any) => t.setAttribute('fill', textColor));
      } else {
        // Unhighlighted nodes: set text color based on theme
        textElements.forEach((t: any) => t.setAttribute('fill', textColor));
      }
    });

    // Highlight edges
    const edgeElements = doc.querySelectorAll('g.edge');
    edgeElements.forEach((edgeElement: any) => {
      const titleElement = edgeElement.querySelector('title');
      const title = titleElement?.textContent?.trim() || '';

      if (title.includes('->')) {
        const [fromRaw, toRaw] = title.split('->');
        const from = fromRaw.trim().replace(/^"|"$/g, '');
        const to = toRaw.trim().replace(/^"|"$/g, '');

        // Check if this edge matches any highlight pair
        for (const [highlightFrom, highlightTo] of highlightPairs) {
          if ((from === highlightFrom && to === highlightTo) ||
            (from === highlightTo && to === highlightFrom)) {
            // Highlight this edge with light green
            const pathElement = edgeElement.querySelector('path');
            if (pathElement) {
              pathElement.setAttribute('stroke', lightGreen);
            }
            const polygonElement = edgeElement.querySelector('polygon');
            if (polygonElement) {
              polygonElement.setAttribute('stroke', lightGreen);
              polygonElement.setAttribute('fill', lightGreen);
            }
            break;
          }
        }
      }
    });

    return new XMLSerializer().serializeToString(doc);
  }

  private calculateVisitedPath(targetNodeIds: string[], reverseAdjacencyList: Map<string, string[]>): { visitedNodes: Set<string>, visitedEdges: Set<string> } {
    const visitedNodes = new Set<string>(targetNodeIds);
    let added = true;

    while (added) {
      added = false;
      const currentVisited = Array.from(visitedNodes);
      for (const node of currentVisited) {
        const parents = reverseAdjacencyList.get(node) || [];
        if (parents.length === 1) {
          const parent = parents[0];
          if (!visitedNodes.has(parent)) {
            visitedNodes.add(parent);
            added = true;
          }
        }
      }
    }

    // "light up end if any of END's incoming node is visited or active"
    for (const [nodeId, parents] of reverseAdjacencyList.entries()) {
      if (nodeId.toLowerCase() === '__end__') {
        for (const parent of parents) {
          if (visitedNodes.has(parent)) {
            visitedNodes.add(nodeId);
            break;
          }
        }
      }
    }

    const visitedEdges = new Set<string>();

    for (const node of visitedNodes) {
      if (node === '__start__') continue;

      const parents = reverseAdjacencyList.get(node) || [];
      if (parents.length === 1) {
        visitedEdges.add(`${parents[0]}->${node}`);
      } else if (parents.length > 1) {
        // "only highlight the edge between visited node and the node with multiple inward edge"
        for (const parent of parents) {
          if (visitedNodes.has(parent) || parent === '__start__') {
            visitedEdges.add(`${parent}->${node}`);
          }
        }
      }
    }

    return { visitedNodes, visitedEdges };
  }

  private calculateEdgeCounts(
    sequence: string[],
    visitedNodes: Set<string>,
    visitedEdges: Set<string>,
    adjacencyList: Map<string, string[]>
  ): Map<string, number> {
    const edgeCounts = new Map<string, number>();
    const fullSeq = [...sequence];

    const startNode = Array.from(visitedNodes).find(n => n.toLowerCase() === '__start__');
    const endNode = Array.from(visitedNodes).find(n => n.toLowerCase() === '__end__');

    if (fullSeq.length > 0 && fullSeq[0].toLowerCase() !== '__start__' && startNode) {
      fullSeq.unshift(startNode);
    }
    if (fullSeq.length > 0 && endNode) {
      if (fullSeq[fullSeq.length - 1].toLowerCase() !== '__end__') {
        fullSeq.push(endNode);
      }
    }

    for (let i = 0; i < fullSeq.length - 1; i++) {
      const src = fullSeq[i];
      const dst = fullSeq[i + 1];

      let foundPath: string[] | null = null;
      const queue: { node: string, path: string[] }[] = [];
      const visited = new Set<string>();

      const initialChildren = adjacencyList.get(src) || [];
      for (const child of initialChildren) {
        const edgeKey = `${src}->${child}`;
        if (visitedEdges.has(edgeKey)) {
          queue.push({ node: child, path: [edgeKey] });
          visited.add(child);
        }
      }

      while (queue.length > 0) {
        const current = queue.shift()!;
        if (current.node === dst) {
          foundPath = current.path;
          break;
        }

        const children = adjacencyList.get(current.node) || [];
        for (const child of children) {
          const edgeKey = `${current.node}->${child}`;
          if (visitedEdges.has(edgeKey) && !visited.has(child)) {
            visited.add(child);
            queue.push({ node: child, path: [...current.path, edgeKey] });
          }
        }
      }

      if (foundPath) {
        for (const edge of foundPath) {
          edgeCounts.set(edge, (edgeCounts.get(edge) || 0) + 1);
        }
      }
    }

    return edgeCounts;
  }

  onManualScroll() {
    this.autoSelectLatestEvent = false;
  }

  selectEvent(key: string, messageIndex?: number, isManual = true) {
    if (isManual) {
      this.autoSelectLatestEvent = false;
    }
    this.traceService.selectedRow(undefined);
    this.selectedEvent = this.eventData.get(key);
    this.selectedEventIndex = this.getIndexOfKeyInMap(key);
    this.selectedMessageIndex = messageIndex !== undefined ? messageIndex : this.uiEvents().findIndex(msg => msg.event.id === key);

    if (isManual && this.viewMode() !== 'events') {
      this.onViewModeChange('events');
    }

    // Auto-scroll to the selected event row in the chat panel
    this.chatPanel()?.scrollToSelectedMessage(this.selectedMessageIndex);

    this.populateLlmRequestResponse();

    this.updateRenderedGraph();
  }

  private populateLlmRequestResponse() {
    this.llmRequest = undefined;
    this.llmResponse = undefined;

    if (!this.selectedEvent) return;

    const io = this.findSpanIoForSelectedEvent();
    if (io === undefined) return;

    // The downstream JSON viewer renders whatever shape comes in, so we
    // pass the discriminated {@link SpanIo} payload through verbatim.
    this.llmRequest = io.inputs;
    this.llmResponse = io.outputs;
  }

  private findSpanIoForSelectedEvent(): SpanIo | undefined {
    const eventId = this.selectedEvent?.id;
    if (eventId === undefined) return undefined;

    const generateContentSpan = this.traceData?.find(
      (span) =>
        span.attrOperationName === OPERATION_GENERATE_CONTENT
        && span.attrEventId === eventId
    );
    if (generateContentSpan?.io !== undefined) return generateContentSpan.io;

    const legacySpan = this.traceData?.find(
      (span) => span.attrEventId === eventId && span.name === 'call_llm',
    );
    return legacySpan?.io;
  }

  deleteSession(session: string) {
    const dialogData: DeleteSessionDialogData = {
      title: 'Confirm delete',
      message:
        `Are you sure you want to delete this session ${this.sessionId}?`,
      confirmButtonText: 'Delete',
      cancelButtonText: 'Cancel',
    };

    const dialogRef = this.dialog.open(DeleteSessionDialogComponent, {
      width: '600px',
      data: dialogData,
    });

    dialogRef.afterClosed().subscribe((result: boolean) => {
      if (result) {
        this.sessionService.deleteSession(this.userId, this.appName, session)
          .subscribe((res) => {
            const nextSession = this.sessionTab?.refreshSession(session);
            if (nextSession) {
              this.sessionTab?.getSession(nextSession.id);
            } else {
              window.location.reload();
            }
          });
      }
    });
  }

  private syncSelectedAppFromUrl() {
    // Optimistically select app from URL to avoid waiting for listApps
    const initialApp = this.activatedRoute.snapshot?.queryParams?.['app'];
    if (initialApp) {
      this.selectedAppControl.setValue(initialApp, { emitEvent: false });
      this.selectApp(initialApp);
    }

    combineLatest([
      this.activatedRoute.queryParams, this.apps$
    ]).subscribe(([params, apps]) => {
      const app = params['app'];
      if (apps && apps.length && app) {
        if (!apps.includes(app)) {
          this.openSnackBar(`Agent '${app}' not found`, 'OK');
          return;
        }

        if (app !== this.appName) {
          this.selectedAppControl.setValue(app, { emitEvent: false });
          this.selectApp(app);
        }
        this.agentService.getAppInfo(app).subscribe(info => {
          setTimeout(() => {
            this.agentGraphData.set(info);
            this.agentReadme = info?.readme || '';
          });
        })
        this.sessionGraphSvgLight = {};
        this.sessionGraphSvgDark = {};
        this.dynamicGraphDot = {};
        setTimeout(() => this.graphsAvailable.set(true));

        // Fetch graph image (supports both v1 and v2 agents)
        this.agentService.getAppGraphImage(app, false).pipe(
          catchError((error: HttpErrorResponse) => {
            console.error('Error fetching light mode graphs:', error);
            this.graphsAvailable.set(false);
            return of(null);
          })
        ).subscribe({
          next: async (res) => {
            try {
              if (res) {
                console.log('Light mode graph response:', res);
                // Render each path's graph (supports both v1 and v2 responses)
                this.sessionGraphSvgLight = {};
                this.dynamicGraphDot = {};
                for (const [path, graph] of Object.entries(res)) {
                  if ((graph as any)?.dotSrc) {
                    // Normalize path: strip @run_id and skip first segment (root_agent)
                    const barePath = path.split('/').map((s: string) => s.split('@')[0]).join('/');
                    const segments = barePath.split('/');
                    const normalizedPath = segments.length > 1 ? segments.slice(1).join('/') : (segments[0] === 'root_agent' || segments[0] === app ? '' : segments[0]);
                    this.sessionGraphDot[normalizedPath] = (graph as any).dotSrc;
                    this.sessionGraphSvgLight[normalizedPath] = await this.graphService.render((graph as any).dotSrc);
                  }
                }
                console.log('sessionGraphSvgLight after rendering:', Object.keys(this.sessionGraphSvgLight));
                console.log('graphsAvailable:', this.graphsAvailable());
                if (this.selectedEvent && this.selectedEventIndex !== undefined) {
                  void this.updateRenderedGraph();
                }
              }
            } catch (error) {
              console.error('Error rendering light mode graphs:', error);
              setTimeout(() => this.graphsAvailable.set(false));
            }
          },
          error: (error) => {
            console.error('Error fetching light mode graphs:', error);
            setTimeout(() => this.graphsAvailable.set(false));
          }
        });

        // Fetch dark mode graph image
        this.agentService.getAppGraphImage(app, true).pipe(
          catchError((error: HttpErrorResponse) => {
            console.error('Error fetching dark mode graphs:', error);
            return of(null);
          })
        ).subscribe({
          next: async (res) => {
            try {
              if (res) {
                // Render each path's graph
                this.sessionGraphSvgDark = {};
                for (const [path, graph] of Object.entries(res)) {
                  if ((graph as any)?.dotSrc) {
                    // Normalize path: strip @run_id and skip first segment (root_agent)
                    const barePath = path.split('/').map((s: string) => s.split('@')[0]).join('/');
                    const segments = barePath.split('/');
                    const normalizedPath = segments.length > 1 ? segments.slice(1).join('/') : (segments[0] === 'root_agent' || segments[0] === app ? '' : segments[0]);
                    this.sessionGraphSvgDark[normalizedPath] = await this.graphService.render((graph as any).dotSrc);
                  }
                }
                if (this.selectedEvent && this.selectedEventIndex !== undefined) {
                  void this.updateRenderedGraph();
                }
              }
            } catch (error) {
              console.error('Error rendering dark mode graphs:', error);
              setTimeout(() => this.graphsAvailable.set(false));
            }
          },
          error: (error) => {
            console.error('Error fetching dark mode graphs:', error);
            setTimeout(() => this.graphsAvailable.set(false));
          }
        });
        this.agentService.getAgentBuilder(app).pipe(
          catchError((error: HttpErrorResponse) => {
            setTimeout(() => this.disableBuilderSwitch = true);
            this.agentBuilderService.setLoadedAgentData(undefined);
            return of('');
          })
        ).subscribe((res: any) => {
          if (!res || res == '') {
            setTimeout(() => this.disableBuilderSwitch = true);
            this.agentBuilderService.setLoadedAgentData(undefined);
          } else {
            setTimeout(() => this.disableBuilderSwitch = false);
            this.agentBuilderService.setLoadedAgentData(res);
          }
        });
        this.isBuilderMode.set(false);
      }
      if (params['mode'] === 'builder') {
        this.enterBuilderMode();
      }
    });
  }

  private updateSelectedAppUrl() {
    this.selectedAppControl.valueChanges
      .pipe(distinctUntilChanged(), filter(Boolean))
      .subscribe((app: string) => {
        this.selectApp(app);

        // Navigate if selected app changed.
        const selectedAgent = this.activatedRoute.snapshot?.queryParams?.['app'];
        if (app === selectedAgent) {
          return;
        }
        this.router.navigate([], {
          queryParams: { 'app': app, 'mode': null },
          queryParamsHandling: 'merge',
        });
      });
  }

  private updateSelectedSessionUrl() {
    const type = this.chatType();
    const queryParams: any = {
      'userId': this.userId,
    };

    queryParams['session'] = null;
    queryParams['evalCase'] = null;
    queryParams['evalResult'] = null;
    queryParams['file'] = null;

    switch (type) {
      case 'session':
        queryParams['session'] = this.sessionId;
        break;
      case 'eval-case':
        queryParams['evalCase'] = `${this.evalSetId}/${this.evalCase?.evalId}`;
        break;
      case 'eval-result':
        queryParams['evalResult'] = `${this.evalSetId}/${this.currentEvalCaseId}/${this.currentEvalTimestamp}`;
        break;
      case 'file':
        queryParams['file'] = this.readonlySessionName();
        break;
    }

    const url = this.router
      .createUrlTree([], {
        queryParams: queryParams,
        queryParamsHandling: 'merge',
      })
      .toString();
    this.location.replaceState(url);
  }

  private clearSessionUrl() {
    this.isSessionUrlEnabledObs.pipe(first()).subscribe((enabled) => {
      if (enabled) {
        const url = this.router
          .createUrlTree([], {
            queryParams: {
              'session': null,
            },
            queryParamsHandling: 'merge',
          })
          .toString();
        this.location.replaceState(url);
      }
    });
  }

  handlePageEvent(event: any) {
    if (event.pageIndex >= 0) {
      const key = this.getKeyAtIndexInMap(event.pageIndex);
      if (key) {
        this.selectEvent(key);

        // Scroll to the corresponding message in the chat panel
        setTimeout(() => {
          const messageIndex = this.uiEvents().findIndex(msg => msg.event.id === key);
          if (messageIndex !== -1) {
            const scrollContainer = this.chatPanel()?.scrollContainer?.nativeElement;
            if (!scrollContainer) return;

            const messageElements = scrollContainer.querySelectorAll('.message-row-container');
            if (messageElements && messageElements[messageIndex]) {
              messageElements[messageIndex].scrollIntoView({
                behavior: 'smooth',
                block: 'nearest',
                inline: 'nearest'
              });
            }
          }
        }, 0);
      }
    }
  }

  closeSelectedEvent() {
    this.selectedEvent = undefined;
    this.selectedEventIndex = undefined;
    this.selectedMessageIndex = undefined;
  }

  @HostListener('window:keydown', ['$event'])
  handleEscapeKey(event: KeyboardEvent) {
    if (event.key === 'Escape' && this.selectedEvent) {
      event.preventDefault();
      this.selectedEvent = undefined;
      this.selectedEventIndex = undefined;
      this.selectedMessageIndex = undefined;
    }
  }

  private getIndexOfKeyInMap(key: string): number | undefined {
    let index = 0;
    const mapOrderPreservingSort = (a: any, b: any): number =>
      0;  // Simple compare function

    const sortedKeys = Array.from(this.eventData.keys())
      .sort(
        mapOrderPreservingSort,
      );

    for (const k of sortedKeys) {
      if (k === key) {
        return index;
      }
      index++;
    }
    return undefined;  // Key not found
  }

  private getKeyAtIndexInMap(index: number): string | undefined {
    const mapOrderPreservingSort = (a: any, b: any): number =>
      0;  // Simple compare function

    const sortedKeys = Array.from(this.eventData.keys())
      .sort(
        mapOrderPreservingSort,
      );

    if (index >= 0 && index < sortedKeys.length) {
      return sortedKeys[index];
    }
    return undefined;  // Index out of bounds
  }

  openSnackBar(message: string, action?: string, duration?: number) {
    if (duration !== undefined) {
      this._snackbarService.open(message, action, { duration });
    } else {
      this._snackbarService.open(message, action);
    }
  }

  private processThoughtText(text: string) {
    return text.replace('/*PLANNING*/', '').replace('/*ACTION*/', '');
  }

  openLink(url: string) {
    this.safeValuesService.windowOpen(window, url, '_blank');
  }

  openViewImageDialog(data: string | null | { images: string[], currentIndex: number, urls?: string[], coordinates?: ({ x: number, y: number } | null)[] }) {
    let imageData: string | null = null;
    let images: string[] | undefined = undefined;
    let currentIndex: number | undefined = undefined;
    let urls: string[] | undefined = undefined;
    let coordinates: ({ x: number, y: number } | null)[] | undefined = undefined;

    if (typeof data === 'string' || data === null) {
      imageData = data;
    } else {
      images = data.images;
      currentIndex = data.currentIndex;
      urls = data.urls;
      coordinates = data.coordinates;
      if (images && currentIndex !== undefined) {
        imageData = images[currentIndex];
      }
    }

    const dialogRef = this.dialog.open(ViewImageDialogComponent, {
      maxWidth: '100vw',
      maxHeight: '100vh',
      width: '100vw',
      height: '100vh',
      panelClass: 'custom-image-dialog',
      data: {
        imageData,
        images,
        currentIndex,
        urls,
        coordinates,
      },
    });
  }

  private createDefaultArtifactName(mimeType: string): string {
    if (!mimeType || !mimeType.includes('/')) {
      return '';
    }

    return mimeType.replace('/', '.');
  }

  protected exportSession() {
    this.sessionService.getSession(this.userId, this.appName, this.sessionId)
      .subscribe((res) => {
        console.log(res);
        const meta = (res.state as any)?.['__session_metadata__'] || (this.currentSessionState as any)?.['__session_metadata__'];
        const displayName = meta?.displayName;
        const filename = (displayName && displayName.trim())
          ? `${displayName.trim().replace(/[/\\?%*:|"<>]/g, '_')}.json`
          : `session-${this.sessionId}.json`;
        this.downloadService.downloadObjectAsJson(res, filename);
      });
  }

  updateState() {
    const dialogRef = this.dialog.open(EditJsonDialogComponent, {
      maxWidth: '90vw',
      maxHeight: '90vh',
      data: {
        dialogHeader: 'Update state',
        jsonContent: this.currentSessionState,
      },
    });

    dialogRef.afterClosed().subscribe((result: any) => {
      if (result) {
        this.updatedSessionState.set(result);
      }
    });
  }

  removeStateUpdate() {
    this.updatedSessionState.set(null);
  }



  protected importSession() {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = 'application/json';

    input.onchange = () => {
      if (!input.files || input.files.length === 0) {
        return;
      }

      const file = input.files[0];
      const reader = new FileReader();

      reader.onload = (e) => {
        if (e.target?.result) {
          try {
            const sessionData =
              JSON.parse(e.target.result as string) as Session;
            if (!sessionData.events || sessionData.events.length === 0) {
              this.openSnackBar('Invalid session file: no events found', 'OK');
              return;
            }

            if (sessionData.appName && sessionData.appName !== this.appName) {
              const dialogData: DeleteSessionDialogData = {
                title: 'App name mismatch',
                message: `The session file was exported from app "${sessionData.appName}" but the current app is "${this.appName}". Do you want to import it anyway?`,
                confirmButtonText: 'Import',
                cancelButtonText: 'Cancel',
              };
              const dialogRef = this.dialog.open(DeleteSessionDialogComponent, {
                width: '600px',
                data: dialogData,
              });
              dialogRef.afterClosed().subscribe((confirmed: boolean) => {
                if (confirmed) {
                  this.doImportSession(sessionData);
                }
              });
            } else {
              this.doImportSession(sessionData);
            }
          } catch (error) {
            this.openSnackBar('Error parsing session file', 'OK');
          }
        }
      };

      reader.readAsText(file);
    };

    input.click();
  }

  protected viewSession() {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = 'application/json';

    input.onchange = () => {
      if (!input.files || input.files.length === 0) {
        return;
      }

      const file = input.files[0];
      const reader = new FileReader();

      reader.onload = (e) => {
        if (e.target?.result) {
          try {
            const sessionData =
              JSON.parse(e.target.result as string) as Session;
            if (!sessionData.events || sessionData.events.length === 0) {
              this.openSnackBar('Invalid session file: no events found', 'OK');
              return;
            }

            this.doViewSession(sessionData, file.name);
          } catch (error) {
            this.openSnackBar('Error parsing session file', 'OK');
          }
        }
      };

      reader.readAsText(file);
    };

    input.click();
  }

  private doViewSession(sessionData: Session, filename: string) {
    const fileApp = sessionData.appName;

    if (fileApp && fileApp !== this.appName) {
      this.apps$.pipe(take(1)).subscribe(apps => {
        if (apps?.includes(fileApp)) {
          // Switch to app
          this.router.navigate([], { queryParams: { 'app': fileApp }, queryParamsHandling: 'merge' }).then(() => {
            this.openSnackBar(`Switched to app '${fileApp}'`, 'OK');
            this.performViewSessionLoading(sessionData, filename);
          });
        } else {
          // Show warning
          this.isLoadedAppUnavailable.set(true);
          this.unavailableAppName.set(fileApp);
          this.performViewSessionLoading(sessionData, filename);
        }
      });
    } else {
      this.performViewSessionLoading(sessionData, filename);
    }
  }

  private performViewSessionLoading(sessionData: Session, filename: string) {
    this.traceService.resetTraceService();
    this.traceData = [];
    if (!this.isViewOnlySession()) {
      this.originalSessionId = this.sessionId;
    }
    this.readonlySessionType.set('File');
    this.readonlySessionName.set(filename);
    this.sessionId = `File: ${filename}`;
    this.currentSessionState = sessionData.state || {};
    this.evalCase = null;
    this.chatType.set('session');
    this.updateSelectedSessionUrl();
    this.showSessionSelectorDrawer = false;
    this.resetEventsAndMessages();

    this.isViewOnlySession.set(true);
    this.canEditSession.set(false);
    this.chatPanel()?.canEditSession?.set(false);

    const mismatch = !!(sessionData.appName && sessionData.appName !== this.appName);
    this.isViewOnlyAppNameMismatch.set(mismatch);

    if (sessionData.events) {
      sessionData.events.forEach((event: any) => {
        this.appendEventRow(event, false);

      });
    }

    this.changeDetectorRef.detectChanges();
  }

  protected closeReadonlySession() {
    this.isViewOnlySession.set(false);
    this.readonlySessionType.set('');
    this.readonlySessionName.set('');
    this.evalCase = null;

    this.router.navigate([], { queryParams: { session: null, evalCase: null, evalResult: null, file: null }, queryParamsHandling: 'merge' });

    this.createSessionAndReset();
    this.originalSessionId = '';
  }

  private doImportSession(sessionData: Session) {
    const now = Date.now() / 1000;
    const events = sessionData.events!.map(event => ({
      ...event,
      timestamp: now,
    }));

    this.sessionService
      .importSession(this.userId, this.appName, events, sessionData.state)
      .subscribe((res) => {
        this.openSnackBar(
          `Session imported successfully (ID: ${res.id})`, 'OK');
        this.sessionTab?.refreshSession();
        this.showSessionSelectorDrawer = false;
        this.updateWithSelectedSession(res);
      });
  }

  @HostListener('window:resize', [])
  onResize() {
    this.checkScreenSize();
  }

  private checkScreenSize() {
    const mobile = window.innerWidth <= 768;
    this.isMobile.set(mobile);
  }
}
