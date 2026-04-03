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

import { AsyncPipe, DOCUMENT, NgClass, NgComponentOutlet } from '@angular/common';
import { HttpErrorResponse } from '@angular/common/http';
import { AfterViewInit, ChangeDetectionStrategy, ChangeDetectorRef, Component, computed, ElementRef, effect, HostListener, inject, Injectable, OnDestroy, OnInit, Renderer2, signal, Type, viewChild, WritableSignal } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { FormControl, FormsModule, ReactiveFormsModule } from '@angular/forms';
import { MatButton, MatIconButton, MatFabButton } from '@angular/material/button';
import { MatCard } from '@angular/material/card';
import { MatDialog } from '@angular/material/dialog';
import { MatFormField } from '@angular/material/form-field';
import { MatInput } from '@angular/material/input';
import { MatIcon } from '@angular/material/icon';
import { MatMenuModule } from '@angular/material/menu';
import { MatPaginatorIntl } from '@angular/material/paginator';
import { MatDrawer, MatDrawerContainer } from '@angular/material/sidenav';
import { MatProgressSpinner } from '@angular/material/progress-spinner';
import { MatSnackBar } from '@angular/material/snack-bar';
import { MatTooltip } from '@angular/material/tooltip';
import { MatToolbar } from '@angular/material/toolbar';
import { SafeHtml } from '@angular/platform-browser';
import { ActivatedRoute, NavigationEnd, Router } from '@angular/router';
import { NgxJsonViewerModule } from 'ngx-json-viewer';
import { combineLatest, firstValueFrom, Observable, of } from 'rxjs';
import { catchError, distinctUntilChanged, filter, first, map, shareReplay, startWith, switchMap, take, tap } from 'rxjs/operators';

import { URLUtil } from '../../../utils/url-util';
import { AgentRunRequest } from '../../core/models/AgentRunRequest';
import { EvalCase } from '../../core/models/Eval';
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

import { ChatMessagesInjectionToken } from './chat.component.i18n';
import { SidePanelMessagesInjectionToken } from '../side-panel/side-panel.component.i18n';

const ROOT_AGENT = 'root_agent';
/** Query parameter for pre-filling user input. */
export const INITIAL_USER_INPUT_QUERY_PARAM = 'q';
/** Query parameter for hiding the side panel. */
export const HIDE_SIDE_PANEL_QUERY_PARAM = 'hideSidePanel';


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

const BIDI_STREAMING_RESTART_WARNING =
  'Restarting bidirectional streaming is not currently supported. Please refresh the page or start a new session.';

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
    MatTooltip,
    MatDrawer,
    ResizableDrawerDirective,
    FormsModule,
    ReactiveFormsModule,
    MatIcon,
    NgxJsonViewerModule,
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
    ChatPanelComponent,
    AgentStructureGraphDialogComponent,
    SidePanelComponent,
    CanvasComponent,
    BuilderTabsComponent,
    SessionTabComponent,
    InlineEditComponent,
  ],
})
export class ChatComponent implements OnInit, AfterViewInit, OnDestroy {
  protected readonly i18n = inject(ChatMessagesInjectionToken);
  protected readonly sidePanelI18n = inject(SidePanelMessagesInjectionToken);
  private readonly _snackBar = inject(MatSnackBar);
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
  private readonly sessionService = inject(SESSION_SERVICE);
  private readonly streamChatService = inject(STREAM_CHAT_SERVICE);
  private readonly webSocketService = inject(WEBSOCKET_SERVICE);
  private readonly audioRecordingService = inject(AUDIO_RECORDING_SERVICE);
  private readonly audioPlayingService = inject(AUDIO_PLAYING_SERVICE);
  private readonly stringToColorService = inject(STRING_TO_COLOR_SERVICE);
  private readonly traceService = inject(TRACE_SERVICE);
  protected readonly uiStateService = inject(UI_STATE_SERVICE);
  protected readonly agentBuilderService = inject(AGENT_BUILDER_SERVICE);
  protected readonly themeService = inject(THEME_SERVICE);
  protected readonly logoComponent: Type<Component> | null = inject(LOGO_COMPONENT, {
    optional: true,
  });

  chatPanel = viewChild.required(ChatPanelComponent);
  canvasComponent = viewChild.required(CanvasComponent);
  sideDrawer = viewChild.required<MatDrawer>('sideDrawer');
  sidePanel = viewChild.required(SidePanelComponent);
  drawerSessionTab = viewChild<SessionTabComponent>('drawerSessionTab');
  evalTab = viewChild(EvalTabComponent);
  appSearchInput = viewChild<ElementRef<HTMLInputElement>>('appSearchInput');

  isChatMode = signal(true);
  isEvalCaseEditing = signal(false);
  hasEvalCaseChanged = signal(false);
  isEvalEditMode = signal(false);
  isBuilderMode = signal(false);  // Default to builder mode off
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
  updatedEvalCase: EvalCase | null = null;
  evalSetId = '';
  isAudioRecording = false;
  micVolume = this.audioRecordingService.volumeLevel;
  isVideoRecording = false;
  longRunningEvents: any[] = [];
  functionCallEventId = '';
  redirectUri = URLUtil.getBaseUrlWithoutPath();
  showSidePanel = window.localStorage.getItem('adk-side-panel-visible') !== 'false';
  showBuilderAssistant = true;
  showAppSelectorDrawer = false;
  showSessionSelectorDrawer = false;
  useSse = signal(window.localStorage.getItem('adk-use-sse') === 'true');
  currentSessionState: SessionState | undefined = {};
  root_agent = ROOT_AGENT;
  updatedSessionState: WritableSignal<any> = signal(null);

  protected readonly canEditSession = signal(true);
  hideIntermediateEvents = signal(window.localStorage.getItem('adk-hide-intermediate-events') === 'true');

  toggleHideIntermediateEvents() {
    const newVal = !this.hideIntermediateEvents();
    this.hideIntermediateEvents.set(newVal);
    window.localStorage.setItem('adk-hide-intermediate-events', String(newVal));
  }

  // TODO: Remove this once backend supports restarting bidi streaming.
  sessionHasUsedBidi = new Set<string>();

  eventData = new Map<string, any>();
  traceData: any[] = [];
  renderedEventGraph: SafeHtml | undefined;
  rawSvgString: string | null = null;
  agentGraphData: any = null;
  sessionGraphSvgLight: Record<string, string> = {};
  sessionGraphSvgDark: Record<string, string> = {};
  agentReadme: string = '';
  graphsAvailable: boolean = true;

  get hasSubWorkflows(): boolean {
    return Object.keys(this.sessionGraphSvgLight).length > 1;
  }

  selectedEvent: any = undefined;
  selectedEventIndex: any = undefined;
  selectedMessageIndex: number | undefined = undefined;
  llmRequest: any = undefined;
  llmResponse: any = undefined;
  llmRequestKey = 'gcp.vertex.agent.llm_request';
  llmResponseKey = 'gcp.vertex.agent.llm_response';

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

  protected readonly filteredDrawerApps$: Observable<string[] | undefined> = this.apps$.pipe(
    switchMap(apps =>
      combineLatest([
        of(apps),
        this.appDrawerSearchControl.valueChanges.pipe(startWith('')),
      ])
    ),
    map(([apps, searchTerm]) => {
      if (!apps) return apps;
      if (!searchTerm || searchTerm.trim() === '') return apps;
      const lower = searchTerm.toLowerCase().trim();
      return apps.filter(app => app.toLowerCase().includes(lower));
    }),
  );

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

  constructor() {
    effect(() => {
      // Re-render graph when theme changes
      if (this.themeService.currentTheme()) {
        this.updateRenderedGraph();
      }
    });
  }

  ngOnInit(): void {
    this.syncSelectedAppFromUrl();
    this.updateSelectedAppUrl();
    this.hideSidePanelIfNeeded();

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
        const apiEvent = JSON.parse(message);

        if (apiEvent.inputTranscription !== undefined) {
          apiEvent.author = 'user';
          apiEvent.partial = true;
        } else if (apiEvent.outputTranscription !== undefined) {
          apiEvent.author = 'bot';
          apiEvent.partial = true;
        }

        if (apiEvent.interrupted || apiEvent.turnComplete) {
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
  }

  get sessionTab() {
    return this.drawerSessionTab();
  }

  switchToTraceView() {
    this.chatPanel()?.onViewModeChange('traces');
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
      const queryParams = this.activatedRoute.snapshot.queryParams;
      const sessionUrl = queryParams['session'];
      const userUrl = queryParams['userId'];

      if (userUrl) {
        this.userId = userUrl;
      }

      if (!sessionUrlEnabled || !sessionUrl) {
        this.createSessionAndReset();

        return;
      }

      if (sessionUrl) {
        this.sessionId = sessionUrl;
        this.loadSession(sessionUrl, true);
      }
    });
  }

  protected loadSession(sessionId: string, isFromUrl: boolean = false) {
    this.uiStateService.setIsSessionLoading(true);

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
    this.agentService.runSse(req).subscribe({
      next: async (chunkJson: any) => {
        if (chunkJson.error) {
          this.openSnackBar(chunkJson.error, 'OK');
          return;
        }

        this.appendEventRow(chunkJson);

        if (chunkJson.actions) {
          this.processActionArtifact(chunkJson);
          this.processActionStateDelta(chunkJson);
        }
        this.changeDetectorRef.detectChanges();
      },
      error: (err) => {
        console.error('Send message error:', err);
        this.openSnackBar(err, 'OK');
      },
      complete: () => {
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

  private appendEventRow(apiEvent: any, reverseOrder: boolean = false) {
    if (apiEvent.inputTranscription !== undefined || apiEvent.outputTranscription !== undefined) {
      apiEvent.partial = true;
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
          const checkIndex = reverseOrder ? 0 : events.length - 1;
          const checkEvent = events[checkIndex];
          if ((checkEvent.event as any)?.partial) {
            const isLastTranscription = !!((checkEvent.event as any)?.inputTranscription || (checkEvent.event as any)?.outputTranscription);
            const isCurrentTranscription = !!(apiEvent.inputTranscription || apiEvent.outputTranscription);

            if (isLastTranscription === isCurrentTranscription) {
              existingIndex = checkIndex;
            } else {
              existingIndex = -1;
            }
          }
        }

        if (existingIndex >= 0) {
          const newEvents = [...events];
          newEvents[existingIndex] = uiEvent;
          return newEvents;
        } else {
          return reverseOrder ? [uiEvent, ...events] : [...events, uiEvent];
        }
      });
    }

    if (apiEvent.actions?.artifactDelta) {
      for (const key in apiEvent.actions.artifactDelta) {
        if (apiEvent.actions.artifactDelta.hasOwnProperty(key)) {
          this.renderArtifact(key, apiEvent.actions.artifactDelta[key], reverseOrder);
        }
      }
    }
  }

  private mergePartialEvent(lastEvent: UiEvent, apiEvent: any): UiEvent {
    const updatedEvent = new UiEvent({ ...lastEvent, event: apiEvent as any });

    let parts = apiEvent.content?.parts || [];
    if (this.isEventA2aResponse(apiEvent)) {
      parts = this.combineA2uiDataParts(parts);
    }
    parts = this.combineTextParts(parts);

    parts.forEach((part: any) => {
      if (part.text !== undefined && part.text !== null) {
        updatedEvent.text = (updatedEvent.text || '') + part.text;
        if (part.thought) {
          updatedEvent.thought = true;
          updatedEvent.text = this.processThoughtText(updatedEvent.text || '');
        }
      } else {
        this.processPartIntoMessage(part, apiEvent, updatedEvent);
      }
    });

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

  private processActionArtifact(e: AdkEvent) {
    if (e.actions && e.actions.artifactDelta &&
      Object.keys(e.actions.artifactDelta).length > 0) {
      this.storeEvents(null, e);
      this.storeMessage(null, e, 'bot');
    }
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
      if (part.text && !part.thought) {
        if (!combinedTextPart) {
          combinedTextPart = { text: part.text };
          result.push(combinedTextPart);
        } else {
          combinedTextPart.text += part.text;
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

  private storeMessage(
    part: any, e: any, role: string, invocationIndex?: number,
    additionalIndices?: any, prepend: boolean = false) {
    if (e?.longRunningToolIds && e.longRunningToolIds.length > 0) {
      const startIndex = this.longRunningEvents.length;
      this.getAsyncFunctionsFromParts(
        e.longRunningToolIds, e.content.parts, e.invocationId);

      // Store event ID for later reference
      this.functionCallEventId = e.id;

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
    if (e?.actions && e.actions.artifactDelta && !part) {
      for (const key in e.actions.artifactDelta) {
        if (e.actions.artifactDelta.hasOwnProperty(key)) {
          this.renderArtifact(key, e.actions.artifactDelta[key], prepend);
        }
      }
    }

    if (e?.evalStatus) {
      this.isChatMode.set(false);
    }

    let message: any = {
      role,
      evalStatus: e?.evalStatus,
      failedMetric: e?.failedMetric,
      evalScore: e?.evalScore,
      evalThreshold: e?.evalThreshold,
      actualInvocationToolUses: e?.actualInvocationToolUses,
      expectedInvocationToolUses: e?.expectedInvocationToolUses,
      actualFinalResponse: e?.actualFinalResponse,
      expectedFinalResponse: e?.expectedFinalResponse,
      invocationIndex: invocationIndex !== undefined ? invocationIndex :
        undefined,
      finalResponsePartIndex:
        additionalIndices?.finalResponsePartIndex !== undefined ?
          additionalIndices.finalResponsePartIndex :
          undefined,
      toolUseIndex: additionalIndices?.toolUseIndex !== undefined ?
        additionalIndices.toolUseIndex :
        undefined,
    };

    // Process the part and add its content to the message
    if (part) {
      if (part.inlineData) {
        const base64Data = this.formatBase64Data(
          part.inlineData.data, part.inlineData.mimeType);
        message.inlineData = {
          displayName: part.inlineData.displayName,
          data: base64Data,
          mimeType: part.inlineData.mimeType,
        };
      } else if (part.a2ui) {
        message.a2uiData = this.processA2uiPartIntoMessage(part);
      } else if (part.text) {
        message.text = part.text;
        message.thought = part.thought ? true : false;
        if (e?.groundingMetadata && e.groundingMetadata.searchEntryPoint &&
          e.groundingMetadata.searchEntryPoint.renderedContent) {
          message.renderedContent =
            e.groundingMetadata.searchEntryPoint.renderedContent;
        }
        message.event = e as any;
      } else if (part.functionCall) {
        // Enrich function call with long-running metadata if applicable
        const isLongRunning =
          e?.longRunningToolIds?.includes(part.functionCall.id);
        const enrichedFunctionCall = {
          ...part.functionCall,
          ...(isLongRunning && {
            isLongRunning: true,
            invocationId: e.invocationId,
            functionCallEventId: e.id,
            needsResponse: true,
            responseStatus: 'pending',
            userResponse: '',
          }),
        };
        message.functionCalls = [enrichedFunctionCall];
        message.event = e as any;
      } else if (part.functionResponse) {
        message.functionResponses = [part.functionResponse];
        message.event = e as any;
      } else if (part.executableCode) {
        message.executableCode = part.executableCode;
      } else if (part.codeExecutionResult) {
        message.codeExecutionResult = part.codeExecutionResult;
        if (e.actions && e.actions.artifact_delta) {
          for (const key in e.actions.artifact_delta) {
            if (e.actions.artifact_delta.hasOwnProperty(key)) {
              this.renderArtifact(key, e.actions.artifact_delta[key], prepend);
            }
          }
        }
      }
    }

    if (part && Object.keys(part).length > 0) {
      if (prepend) {
        this.uiEvents.update((uiEvents) => [message, ...uiEvents]);
      } else {
        this.insertOrUpdateMessage(message);
      }
    }
  }

  private insertOrUpdateMessage(message: any) {
    this.uiEvents.update((uiEvents) => {
      // If SSE streaming is enabled and this is a text message with eventId
      if (this.useSse() && message.text && message.event.id &&
        message.role === 'bot') {
        if (uiEvents.length > 0) {
          const lastIndex = uiEvents.length - 1;
          const lastMessage = uiEvents[lastIndex];
          if (lastMessage.event.id === message.event.id && lastMessage.role === 'bot') {
            const updatedMessages = [...uiEvents];
            // Replace with the new message to preserve all fields (including inlineData)
            updatedMessages[lastIndex] = message;
            return updatedMessages;
          }
        }
      }

      // Default behavior: insert new message
      return [...uiEvents, message];
    });
  }

  private formatBase64Data(data: string, mimeType: string) {
    const fixedBase64Data = fixBase64String(data);
    return `data:${mimeType};base64,${fixedBase64Data}`;
  }

  private processPartIntoMessage(part: any, event: any, uiEvent: UiEvent) {
    if (!part) return;

    if (event) {
      uiEvent.event = event;
    }

    if (part.text) {
      uiEvent.text = part.text;
      uiEvent.thought = part.thought ? true : false;
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
    uiEvent: any, artifactId: string, versionId: string) {
    this.openSnackBar(
      'Failed to fetch artifact data',
      'OK',
    );
    // Remove placeholder message and artifact on failure
    uiEvent.error = { errorMessage: 'Failed to fetch artifact data' };
    this.changeDetectorRef.detectChanges();
    this.artifacts = this.artifacts.filter(
      a => a.id !== artifactId || a.versionId !== versionId);
  }

  private renderArtifact(
    artifactId: string, versionId: string, prepend: boolean = false) {
    // If artifact/version already exists, do nothing.
    const artifactExists = this.artifacts.some(
      (artifact) =>
        artifact.id === artifactId && artifact.versionId === versionId,
    );
    if (artifactExists) {
      return;
    }

    // Add a placeholder message for the artifact
    // Feed the placeholder with the artifact data after it's fetched
    let uiEvent = new UiEvent({
      role: 'bot',
      event: { id: 'artifact-' + artifactId } as any,
      inlineData: {
        data: '',
        mimeType: 'image/png',
      },
    });
    if (prepend) {
      this.uiEvents.update((uiEvents) => [uiEvent, ...uiEvents]);
    } else {
      this.insertOrUpdateMessage(uiEvent);
    }

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
        next: (res) => {
          const { mimeType, data } = res.inlineData ?? {};
          if (!mimeType || !data) {
            this.handleArtifactFetchFailure(uiEvent, artifactId, versionId);
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
          this.handleArtifactFetchFailure(uiEvent, artifactId, versionId);
        }
      });
  }

  private storeEvents(part: any, e: any) {
    let title = '';
    if (part == null && e.actions.artifactDelta) {
      title += 'eventAction: artifact';
    } else if (part) {
      if (part.text) {
        title += 'text:' + part.text;
      } else if (part.functionCall) {
        title += 'functionCall:' + part.functionCall.name;
      } else if (part.functionResponse) {
        title += 'functionResponse:' + part.functionResponse.name;
      } else if (part.executableCode) {
        title += 'executableCode:' + part.executableCode.code.slice(0, 10);
      } else if (part.codeExecutionResult) {
        title += 'codeExecutionResult:' + part.codeExecutionResult.outcome;
      } else if (part.errorMessage) {
        title += 'errorMessage:' + part.errorMessage
      }
    }

    e.title = title;

    this.eventData.set(e.id, e);
    this.eventData = new Map(this.eventData);
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
      if (this.chatPanel()?.viewMode() !== 'events') {
        this.chatPanel()?.onViewModeChange('events');
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
    this.streamChatService.closeStream();
  }

  onAppSelection(event: any) {
    if (this.isAudioRecording) {
      this.stopAudioRecording();
      this.isAudioRecording = false;
    }
    if (this.isVideoRecording) {
      this.stopVideoRecording();
      this.isVideoRecording = false;
    }
    this.evalTab()?.resetEvalResults();
    this.traceData = [];
  }

  async toggleAudioRecording() {
    this.isAudioRecording ? this.stopAudioRecording() :
      await this.startAudioRecording();
  }

  async startAudioRecording() {
    if (this.sessionId && this.sessionHasUsedBidi.has(this.sessionId)) {
      this.openSnackBar(BIDI_STREAMING_RESTART_WARNING, 'OK');
      return;
    }

    // Lazily create a real session if it does not exist
    const isSessionActive = await this.ensureSessionActive();
    if (!isSessionActive) {
      return;
    }

    this.isAudioRecording = true;
    this.streamChatService.startAudioChat({
      appName: this.appName,
      userId: this.userId,
      sessionId: this.sessionId,
    });
    this.sessionHasUsedBidi.add(this.sessionId);
  }

  stopAudioRecording() {
    this.audioPlayingService.stopAudio();
    this.streamChatService.stopAudioChat();
    this.isAudioRecording = false;
    if (this.isVideoRecording) {
      this.stopVideoRecording();
    }
  }

  toggleVideoRecording() {
    this.isVideoRecording ? this.stopVideoRecording() :
      this.startVideoRecording();
  }

  startVideoRecording() {
    const videoContainer = this.chatPanel()?.videoContainer;
    if (!videoContainer) {
      return;
    }
    this.isVideoRecording = true;
    this.streamChatService.startVideoStreaming(videoContainer);
  }

  stopVideoRecording() {
    const videoContainer = this.chatPanel()?.videoContainer;
    if (!videoContainer) {
      return;
    }
    this.streamChatService.stopVideoStreaming(videoContainer);
    this.isVideoRecording = false;
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
    if (!this.isChatMode()) {
      this.resetEditEvalCaseVars();
      this.handleReturnToSession(true);
    }
  }

  protected handleReturnToSession(event: boolean) {
    this.sessionTab?.getSession(this.sessionId);
    this.evalTab()?.resetEvalCase();
    this.isChatMode.set(true);
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
    this.eventService.getTrace(this.sessionId)
      .pipe(first(), catchError((err) => { console.error('[DEBUG] getTrace error:', err); return of([]); }))
      .subscribe(res => {
        this.traceData = res;
        this.traceService.setEventData(this.eventData);
        this.traceService.setMessages(this.uiEvents());
        this.changeDetectorRef.detectChanges();
      });
    this.changeDetectorRef.detectChanges();
  }

  private buildUiEventFromEvent(event: any, reverseOrder: boolean = false): UiEvent {
    const isA2aResponse = this.isEventA2aResponse(event);
    const parts = isA2aResponse ?
      this.combineA2uiDataParts(event.content?.parts) :
      event.content?.parts || [];
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
    this.isChatMode.set(true);
    this.resetEventsAndMessages();

    this.isSessionUrlEnabledObs.subscribe((enabled) => {
      if (enabled) {
        this.updateSelectedSessionUrl();
      }
    });

    if (session.events && session.state) {
      session.events.forEach((event: any) => {
        this.appendEventRow(event, false);

        const isBot = event.author !== 'user';
        if (isBot && event.actions?.artifactDelta) {
          for (const key in event.actions.artifactDelta) {
            if (event.actions.artifactDelta.hasOwnProperty(key)) {
              this.renderArtifact(key, event.actions.artifactDelta[key]);
            }
          }
        }
      });

      this.restorePendingLongRunningCalls();
    }

    this.changeDetectorRef.detectChanges();

    this.loadTraceData();

    this.sessionService.canEdit(this.userId, session)
      .pipe(first(), catchError(() => of(true)))
      .subscribe((canEdit) => {
        this.chatPanel()?.canEditSession.set(canEdit);
        this.canEditSession.set(canEdit);
      });

    this.featureFlagService.isInfinityMessageScrollingEnabled()
      .pipe(first())
      .subscribe((isInfinityMessageScrollingEnabled) => {
        if (!isInfinityMessageScrollingEnabled) {
          this.populateMessages(session.events || []);
        }
        this.loadTraceData();
      });
  }

  protected updateWithSelectedEvalCase(evalCase: EvalCase) {
    this.evalCase = evalCase;
    this.isChatMode.set(false);

    this.resetEventsAndMessages();
    let invocationIndex = 0;

    for (const invocation of evalCase.conversation) {
      if (invocation.userContent?.parts) {
        for (const part of invocation.userContent.parts) {
          this.storeMessage(part, null, 'user');
        }
      }

      if (invocation.intermediateData?.toolUses) {
        let toolUseIndex = 0;
        for (const toolUse of invocation.intermediateData.toolUses) {
          const functionCallPart = {
            functionCall: { name: toolUse.name, args: toolUse.args },
          };
          this.storeMessage(
            functionCallPart, null, 'bot', invocationIndex, { toolUseIndex });
          toolUseIndex++;

          const functionResponsePart = { functionResponse: { name: toolUse.name } };
          this.storeMessage(functionResponsePart, null, 'bot');
        }
      }

      if (invocation.finalResponse?.parts) {
        let finalResponsePartIndex = 0;
        for (const part of invocation.finalResponse.parts) {
          this.storeMessage(
            part, null, 'bot', invocationIndex, { finalResponsePartIndex });
          finalResponsePartIndex++;
        }
      }
      invocationIndex++;
    }
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

    const meta = this.currentSessionState?.['__session_metadata__'] as any;
    if (meta?.displayName) {
      const shortId = this.sessionId.substring(0, 4);
      return `[${shortId}] ${meta.displayName}`;
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

    // Load existing agent configuration if app is selected
    if (this.appName) {
      this.loadExistingAgentConfiguration();
    }
  }


  private loadExistingAgentConfiguration() {
    this.agentService.getAgentBuilderTmp(this.appName).subscribe({
      next: (yamlContent: string) => {
        if (yamlContent) {
          this.canvasComponent()?.loadFromYaml(yamlContent, this.appName);
        }
      },
      error: (error: any) => {
        console.error('Error loading agent configuration:', error);
        this._snackBar.open('Error loading agent configuration', 'OK');
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
  }

  saveAgentBuilder() {
    this.canvasComponent()?.saveAgent(this.appName);
  }

  onEventTabDrillDown(path: string) {
    this.updateRenderedGraph(undefined, path);
  }

  updateRenderedGraph(overrideNodePath?: string, overrideGraphPath?: string) {
    const sessionGraphSvgLight = this.sessionGraphSvgLight;
    const sessionGraphSvgDark = this.sessionGraphSvgDark;
    if (Object.keys(sessionGraphSvgLight).length === 0 || Object.keys(sessionGraphSvgDark).length === 0) {
      this.renderedEventGraph = undefined;
      return;
    }

    // Check if we're using v1 backend (only root graph, no workflow paths)
    const isV1Backend = Object.keys(sessionGraphSvgLight).length === 1 && '' in sessionGraphSvgLight;

    if (isV1Backend && this.selectedEvent) {
      // V1 backend: Simple edge/node highlighting for single event only
      const graphPath = '';
      let highlightedSvgLight = sessionGraphSvgLight[graphPath];
      let highlightedSvgDark = sessionGraphSvgDark[graphPath];

      const highlightPairs = this.getV1HighlightPairs(this.selectedEvent);
      highlightedSvgLight = this.applyV1Highlighting(highlightedSvgLight, highlightPairs, false);
      highlightedSvgDark = this.applyV1Highlighting(highlightedSvgDark, highlightPairs, true);

      this.selectedEventGraphPath = graphPath;
      this.eventGraphSvgLight = { ...sessionGraphSvgLight, [graphPath]: highlightedSvgLight };
      this.eventGraphSvgDark = { ...sessionGraphSvgDark, [graphPath]: highlightedSvgDark };
      const highlightedSvg = this.themeService.currentTheme() === 'dark' ? highlightedSvgDark : highlightedSvgLight;
      this.rawSvgString = highlightedSvg;
      this.renderedEventGraph = this.safeValuesService.bypassSecurityTrustHtml(highlightedSvg);
      return;
    }

    // V2 backend: Calculate workflow paths and node names
    let nodePath = overrideNodePath || this.selectedEvent?.nodeInfo?.path;
    if (!overrideNodePath && this.selectedEvent?.author === 'user') {
      nodePath = '__START__';
    }

    let graphPath = overrideGraphPath !== undefined ? overrideGraphPath : '';
    let nodeName = '';

    if (nodePath && overrideGraphPath === undefined) {
      const segments = nodePath.split('/');
      nodeName = segments[segments.length - 1];

      if (segments.length >= 2 && segments[segments.length - 1] === 'call_llm' && segments[segments.length - 2] === this.selectedEvent?.author) {
        nodeName = segments[segments.length - 2];
        graphPath = segments.slice(1, -2).join('/');
      } else {
        graphPath = segments.slice(1, -1).join('/');
      }

      if (!(graphPath in sessionGraphSvgLight)) {
        graphPath = '';
      }
    }

    let highlightedSvgLight = sessionGraphSvgLight[graphPath] || sessionGraphSvgLight[''] || Object.values(sessionGraphSvgLight)[0] || '';
    let highlightedSvgDark = sessionGraphSvgDark[graphPath] || sessionGraphSvgDark[''] || Object.values(sessionGraphSvgDark)[0] || '';

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

        if (np) {
          const segments = np.split('/');
          let evNodeName = segments[segments.length - 1];
          let evGraphPath = '';

          if (segments.length >= 2 && segments[segments.length - 1] === 'call_llm' && segments[segments.length - 2] === ev.author) {
            evNodeName = segments[segments.length - 2];
            evGraphPath = segments.slice(1, -2).join('/');
          } else {
            evGraphPath = segments.slice(1, -1).join('/');
          }

          if (evGraphPath === graphPath) {
            if (i <= this.selectedEventIndex) {
              if (runNodeNames.length === 0 || runNodeNames[runNodeNames.length - 1] !== evNodeName) {
                runNodeNames.push(evNodeName);
              }
            }
            if (allRunNodeNames.length === 0 || allRunNodeNames[allRunNodeNames.length - 1] !== evNodeName) {
              allRunNodeNames.push(evNodeName);
            }
          }
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

    const highlightedSvg = this.themeService.currentTheme() === 'dark' ? highlightedSvgDark : highlightedSvgLight;

    this.rawSvgString = highlightedSvg;
    this.renderedEventGraph = this.safeValuesService.bypassSecurityTrustHtml(highlightedSvg);
  }

  highlightExecutionPathInSvg(svgString: string, runNodeNames: string[], allRunNodeNames: string[], theme: 'light' | 'dark' = 'light'): string {
    if (!allRunNodeNames || allRunNodeNames.length === 0) return svgString;

    const parser = new DOMParser();
    const doc = parser.parseFromString(svgString, 'image/svg+xml');

    const reverseAdjacencyList = new Map<string, string[]>();
    const forwardAdjacencyList = new Map<string, string[]>();
    const edgeElements = doc.querySelectorAll('g.edge');

    edgeElements.forEach((edgeElement) => {
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
    nodeElements.forEach((nodeElement) => {
      const textElements = Array.from(nodeElement.querySelectorAll('text'));
      const textContent = textElements.map(t => t.textContent?.trim() || '').join('');

      const titleElement = nodeElement.querySelector('title');
      const titleName = titleElement?.textContent?.trim() || '';
      const cleanTitleName = titleName.replace(/^"|"$/g, '');

      nodeNameToId.set(textContent, cleanTitleName);
      if (titleName) {
        nodeNameToId.set(titleName, cleanTitleName);
      }
    });

    const targetNodeIds = runNodeNames.map(name => {
      for (const [text, id] of nodeNameToId.entries()) {
        if (text === name || text.includes(name) || text === `"${name}"`) {
          return id;
        }
      }
      return null;
    }).filter(id => id) as string[];

    const allTargetNodeIds = allRunNodeNames.map(name => {
      for (const [text, id] of nodeNameToId.entries()) {
        if (text === name || text.includes(name) || text === `"${name}"`) {
          return id;
        }
      }
      return null;
    }).filter(id => id) as string[];

    const { visitedNodes, visitedEdges } = this.calculateVisitedPath(targetNodeIds, reverseAdjacencyList);
    const { visitedNodes: allVisitedNodes } = this.calculateVisitedPath(allTargetNodeIds, reverseAdjacencyList);
    const edgeCounts = this.calculateEdgeCounts(targetNodeIds, visitedNodes, visitedEdges, forwardAdjacencyList);

    const visitedEdgeColor = theme === 'dark' ? '#34a853' : '#a1c2a1';
    const activeStrokeColor = theme === 'dark' ? '#ceead6' : '#0d652d';
    const activeFillColor = theme === 'dark' ? '#137333' : '#a6d8b5';
    const visitedStrokeColor = theme === 'dark' ? '#34a853' : '#a1c2a1';
    const visitedFillColor = theme === 'dark' ? '#0d652d' : '#e6f4ea';

    edgeElements.forEach((edgeElement) => {
      const titleElement = edgeElement.querySelector('title');
      let title = titleElement?.textContent?.trim() || '';
      if (title.includes('->')) {
        const parts = title.split('->');
        const from = parts[0].trim().replace(/^"|"$/g, '');
        const to = parts[1].trim().replace(/^"|"$/g, '');
        const edgeKey = `${from}->${to}`;

        if (visitedEdges.has(edgeKey)) {
          const shape = edgeElement.querySelector('path');
          if (shape) {
            shape.setAttribute('stroke', visitedEdgeColor);
            shape.setAttribute('stroke-width', '2');
          }
          const polygon = edgeElement.querySelector('polygon');
          if (polygon) {
            polygon.setAttribute('fill', visitedEdgeColor);
            polygon.setAttribute('stroke', visitedEdgeColor);
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

    const lastTargetId = targetNodeIds[targetNodeIds.length - 1];

    nodeElements.forEach((nodeElement) => {
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
        textElements.forEach((t) => {
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
        aElements.forEach((aElem) => {
          aElem.setAttribute('title', 'Not run in this invocation');
          aElem.setAttributeNS('http://www.w3.org/1999/xlink', 'title', 'Not run in this invocation');
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
    nodeElements.forEach((nodeElement) => {
      const titleElement = nodeElement.querySelector('title');
      const nodeName = titleElement?.textContent?.trim().replace(/^"|"$/g, '') || '';

      const textElements = nodeElement.querySelectorAll('text');

      if (highlightedNodeNames.has(nodeName)) {
        // Highlight this node with dark green
        const ellipse = nodeElement.querySelector('ellipse, polygon, path');
        if (ellipse) {
          ellipse.setAttribute('fill', darkGreen);
          ellipse.setAttribute('stroke', darkGreen);
        }
        textElements.forEach(t => t.setAttribute('fill', textColor));
      } else {
        // Unhighlighted nodes: set text color based on theme
        textElements.forEach(t => t.setAttribute('fill', textColor));
      }
    });

    // Highlight edges
    const edgeElements = doc.querySelectorAll('g.edge');
    edgeElements.forEach((edgeElement) => {
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

  selectEvent(key: string, messageIndex?: number) {
    this.traceService.selectedRow(undefined);
    this.selectedEvent = this.eventData.get(key);
    this.selectedEventIndex = this.getIndexOfKeyInMap(key);
    this.selectedMessageIndex = messageIndex !== undefined ? messageIndex : this.uiEvents().findIndex(msg => msg.event.id === key);

    if (this.chatPanel()?.viewMode() !== 'events') {
      this.chatPanel()?.onViewModeChange('events');
    }

    // Auto-scroll to the selected event row in the chat panel
    this.chatPanel()?.scrollToSelectedMessage(this.selectedMessageIndex);

    this.llmRequest = undefined;
    this.llmResponse = undefined;

    const matchingSpan = this.traceData?.find(
      (span: any) => span?.attributes?.['gcp.vertex.agent.event_id'] === this.selectedEvent.id && span?.name === 'call_llm'
    );

    if (matchingSpan) {
      const requestStr = matchingSpan.attributes?.[this.llmRequestKey];
      const responseStr = matchingSpan.attributes?.[this.llmResponseKey];

      if (requestStr) {
        try {
          this.llmRequest = typeof requestStr === 'string' ? JSON.parse(requestStr) : requestStr;
        } catch (e) {
          console.warn('Failed to parse LLM request', e);
        }
      }

      if (responseStr) {
        try {
          this.llmResponse = typeof responseStr === 'string' ? JSON.parse(responseStr) : responseStr;
        } catch (e) {
          console.warn('Failed to parse LLM response', e);
        }
      }
    }

    this.updateRenderedGraph();
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
    combineLatest([
      this.activatedRoute.queryParams, this.apps$
    ]).subscribe(([params, apps]) => {
      const app = params['app'];
      if (apps && apps.length && app) {
        if (!apps.includes(app)) {
          this.openSnackBar(`Agent '${app}' not found`, 'OK');
          return;
        }

        this.selectedAppControl.setValue(app, { emitEvent: false });
        this.selectApp(app);
        this.agentService.getAppInfo(app).subscribe(info => {
          this.agentGraphData = info;
          this.agentReadme = info?.readme || '';
        })
        this.sessionGraphSvgLight = {};
        this.sessionGraphSvgDark = {};
        this.graphsAvailable = true;

        // Try v2 approach first (getAppGraphImage for light mode)
        this.agentService.getAppGraphImage(app, false).pipe(
          catchError((error: HttpErrorResponse) => {
            if (error.status === 404) {
              // V2 endpoint not available, try v1 fallback with light theme
              return this.agentService.getAppGraphDot(app, false).pipe(
                catchError(() => {
                  this.graphsAvailable = false;
                  return of(null);
                })
              );
            }
            return of(null);
          })
        ).subscribe({
          next: async (res) => {
            try {
              if (res) {
                console.log('Light mode graph response:', res);
                // Check if this is v1 response (single dotSrc) or v2 response (path->graph map)
                if (res.dotSrc && typeof res.dotSrc === 'string') {
                  // V1 response - render light theme graph
                  this.sessionGraphSvgLight = {};
                  this.sessionGraphSvgLight[''] = await this.graphService.render(res.dotSrc);
                  if (this.selectedEvent && this.selectedEventIndex !== undefined) {
                    this.updateRenderedGraph();
                  }
                } else {
                  // V2 response - render each path's graph
                  this.sessionGraphSvgLight = {};
                  for (const [path, graph] of Object.entries(res)) {
                    if ((graph as any)?.dotSrc) {
                      // Normalize path: map "root_agent" to "" for consistency with dialog expectations
                      const normalizedPath = path === 'root_agent' ? '' : path;
                      this.sessionGraphSvgLight[normalizedPath] = await this.graphService.render((graph as any).dotSrc);
                    }
                  }
                  console.log('sessionGraphSvgLight after rendering:', Object.keys(this.sessionGraphSvgLight));
                  console.log('graphsAvailable:', this.graphsAvailable);
                  if (this.selectedEvent && this.selectedEventIndex !== undefined) {
                    this.updateRenderedGraph();
                  }
                }
              }
            } catch (error) {
              console.error('Error rendering light mode graphs:', error);
              this.graphsAvailable = false;
            }
          },
          error: (error) => {
            console.error('Error fetching light mode graphs:', error);
            this.graphsAvailable = false;
          }
        });

        // For dark mode, try v2 first, then v1 fallback with dark theme
        this.agentService.getAppGraphImage(app, true).pipe(
          catchError((error: HttpErrorResponse) => {
            if (error.status === 404) {
              // V1 fallback - fetch dark theme graph
              return this.agentService.getAppGraphDot(app, true).pipe(
                catchError(() => of(null))
              );
            }
            return of(null);
          })
        ).subscribe({
          next: async (res) => {
            try {
              if (res) {
                if (res.dotSrc && typeof res.dotSrc === 'string') {
                  // V1 response
                  this.sessionGraphSvgDark = {};
                  this.sessionGraphSvgDark[''] = await this.graphService.render(res.dotSrc);
                  if (this.selectedEvent && this.selectedEventIndex !== undefined) {
                    this.updateRenderedGraph();
                  }
                } else {
                  // V2 response
                  this.sessionGraphSvgDark = {};
                  for (const [path, graph] of Object.entries(res)) {
                    if ((graph as any)?.dotSrc) {
                      // Normalize path: map "root_agent" to "" for consistency with dialog expectations
                      const normalizedPath = path === 'root_agent' ? '' : path;
                      this.sessionGraphSvgDark[normalizedPath] = await this.graphService.render((graph as any).dotSrc);
                    }
                  }
                  if (this.selectedEvent && this.selectedEventIndex !== undefined) {
                    this.updateRenderedGraph();
                  }
                }
              }
            } catch (error) {
              console.error('Error rendering dark mode graphs:', error);
              this.graphsAvailable = false;
            }
          },
          error: (error) => {
            console.error('Error fetching dark mode graphs:', error);
            this.graphsAvailable = false;
          }
        });
        this.agentService.getAgentBuilder(app).pipe(
          catchError((error: HttpErrorResponse) => {
            this.disableBuilderSwitch = true;
            this.agentBuilderService.setLoadedAgentData(undefined);
            return of('');
          })
        ).subscribe((res: any) => {
          if (!res || res == '') {
            this.disableBuilderSwitch = true;
            this.agentBuilderService.setLoadedAgentData(undefined);
          } else {
            this.disableBuilderSwitch = false;
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
        const selectedAgent = this.activatedRoute.snapshot.queryParams['app'];
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
    const url = this.router
      .createUrlTree([], {
        queryParams: {
          'session': this.sessionId,
          'userId': this.userId,
        },
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
      this._snackBar.open(message, action, { duration });
    } else {
      this._snackBar.open(message, action);
    }
  }

  private processThoughtText(text: string) {
    return text.replace('/*PLANNING*/', '').replace('/*ACTION*/', '');
  }

  openLink(url: string) {
    this.safeValuesService.windowOpen(window, url, '_blank');
  }

  openViewImageDialog(imageData: string | null) {
    const dialogRef = this.dialog.open(ViewImageDialogComponent, {
      maxWidth: '90vw',
      maxHeight: '90vh',
      data: {
        imageData,
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
        this.downloadService.downloadObjectAsJson(
          res, `session-${this.sessionId}.json`);
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
      });
  }
}
