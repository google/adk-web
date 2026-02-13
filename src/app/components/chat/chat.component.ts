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

import {AsyncPipe, DOCUMENT, NgClass} from '@angular/common';
import {HttpErrorResponse} from '@angular/common/http';
import {AfterViewInit, ChangeDetectorRef, Component, ElementRef, HostListener, inject, Injectable, OnDestroy, OnInit, Renderer2, signal, viewChild, WritableSignal} from '@angular/core';
import {toSignal} from '@angular/core/rxjs-interop';
import {FormControl, FormsModule, ReactiveFormsModule} from '@angular/forms';
import {MatButton, MatFabButton} from '@angular/material/button';
import {MatCard} from '@angular/material/card';
import {MatDialog} from '@angular/material/dialog';
import {MatDivider} from '@angular/material/divider';
import {MatIcon} from '@angular/material/icon';
import {MatPaginatorIntl} from '@angular/material/paginator';
import {MatDrawer, MatDrawerContainer} from '@angular/material/sidenav';
import {MatSlideToggle} from '@angular/material/slide-toggle';
import {MatSnackBar} from '@angular/material/snack-bar';
import {MatTooltip} from '@angular/material/tooltip';
import {SafeHtml} from '@angular/platform-browser';
import {ActivatedRoute, NavigationEnd, Router} from '@angular/router';
import {NgxJsonViewerModule} from 'ngx-json-viewer';
import {BehaviorSubject, combineLatest, Observable, of} from 'rxjs';
import {catchError, distinctUntilChanged, filter, first, map, shareReplay, switchMap, take, tap} from 'rxjs/operators';

import {URLUtil} from '../../../utils/url-util';
import {AgentRunRequest} from '../../core/models/AgentRunRequest';
import {EvalCase} from '../../core/models/Eval';
import {Session, SessionState} from '../../core/models/Session';
import {Event as AdkEvent, Part} from '../../core/models/types';
import {AGENT_SERVICE} from '../../core/services/interfaces/agent';
import {AGENT_BUILDER_SERVICE} from '../../core/services/interfaces/agent-builder';
import {ARTIFACT_SERVICE} from '../../core/services/interfaces/artifact';
import {DOWNLOAD_SERVICE} from '../../core/services/interfaces/download';
import {EVAL_SERVICE} from '../../core/services/interfaces/eval';
import {EVENT_SERVICE} from '../../core/services/interfaces/event';
import {FEATURE_FLAG_SERVICE} from '../../core/services/interfaces/feature-flag';
import {GRAPH_SERVICE} from '../../core/services/interfaces/graph';
import {LOCAL_FILE_SERVICE} from '../../core/services/interfaces/localfile';
import {SAFE_VALUES_SERVICE} from '../../core/services/interfaces/safevalues';
import {SESSION_SERVICE} from '../../core/services/interfaces/session';
import {STREAM_CHAT_SERVICE} from '../../core/services/interfaces/stream-chat';
import {STRING_TO_COLOR_SERVICE} from '../../core/services/interfaces/string-to-color';
import {TRACE_SERVICE} from '../../core/services/interfaces/trace';
import {ListResponse} from '../../core/services/interfaces/types';
import {UI_STATE_SERVICE} from '../../core/services/interfaces/ui-state';
import {LOCATION_SERVICE} from '../../core/services/location.service';
import {ResizableBottomDirective} from '../../directives/resizable-bottom.directive';
import {ResizableDrawerDirective} from '../../directives/resizable-drawer.directive';
import {AddItemDialogComponent} from '../add-item-dialog/add-item-dialog.component';
import {getMediaTypeFromMimetype, MediaType} from '../artifact-tab/artifact-tab.component';
import {BuilderTabsComponent} from '../builder-tabs/builder-tabs.component';
import {CanvasComponent} from '../canvas/canvas.component';
import {ChatPanelComponent} from '../chat-panel/chat-panel.component';
import {EditJsonDialogComponent} from '../edit-json-dialog/edit-json-dialog.component';
import {EvalTabComponent} from '../eval-tab/eval-tab.component';
import {PendingEventDialogComponent} from '../pending-event-dialog/pending-event-dialog.component';
import {DeleteSessionDialogComponent, DeleteSessionDialogData,} from '../session-tab/delete-session-dialog/delete-session-dialog.component';
import {SidePanelComponent} from '../side-panel/side-panel.component';
import {TraceEventComponent} from '../trace-tab/trace-event/trace-event.component';
import {ViewImageDialogComponent} from '../view-image-dialog/view-image-dialog.component';

import {ChatMessagesInjectionToken} from './chat.component.i18n';

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
  selector: 'app-chat',
  templateUrl: './chat.component.html',
  styleUrl: './chat.component.scss',
  providers: [
    {provide: MatPaginatorIntl, useClass: CustomPaginatorIntl},
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
    NgClass,
    MatButton,
    MatSlideToggle,
    MatDivider,
    MatCard,
    MatFabButton,
    ResizableBottomDirective,
    TraceEventComponent,
    AsyncPipe,
    ChatPanelComponent,
    SidePanelComponent,
    CanvasComponent,
    BuilderTabsComponent,
  ],
})
export class ChatComponent implements OnInit, AfterViewInit, OnDestroy {
  protected readonly i18n = inject(ChatMessagesInjectionToken);
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
  private readonly stringToColorService = inject(STRING_TO_COLOR_SERVICE);
  private readonly traceService = inject(TRACE_SERVICE);
  protected readonly uiStateService = inject(UI_STATE_SERVICE);
  protected readonly agentBuilderService = inject(AGENT_BUILDER_SERVICE);

  chatPanel = viewChild.required(ChatPanelComponent);
  canvasComponent = viewChild.required(CanvasComponent);
  sideDrawer = viewChild.required<MatDrawer>('sideDrawer');
  sidePanel = viewChild.required(SidePanelComponent);
  evalTab = viewChild(EvalTabComponent);
  bottomPanelRef = viewChild.required<ElementRef>('bottomPanel');
  enableSseIndicator = signal(false);
  isChatMode = signal(true);
  isEvalCaseEditing = signal(false);
  hasEvalCaseChanged = signal(false);
  isEvalEditMode = signal(false);
  isBuilderMode = signal(false);  // Default to builder mode off
  videoElement!: HTMLVideoElement;
  currentMessage = '';
  messages = signal<any[]>([]);
  lastTextChunk: string = '';
  streamingTextMessage: any|null = null;
  latestThought: string = '';
  artifacts: any[] = [];
  userInput: string = '';
  userEditEvalCaseMessage: string = '';
  userId = 'user';
  appName = '';
  sessionId = ``;
  sessionIdOfLoadedMessages = '';
  evalCase: EvalCase|null = null;
  updatedEvalCase: EvalCase|null = null;
  evalSetId = '';
  isAudioRecording = false;
  isVideoRecording = false;
  longRunningEvents: any[] = [];
  functionCallEventId = '';
  redirectUri = URLUtil.getBaseUrlWithoutPath();
  showSidePanel = true;
  showBuilderAssistant = true;
  useSse = false;
  currentSessionState: SessionState|undefined = {};
  root_agent = ROOT_AGENT;
  updatedSessionState: WritableSignal<any> = signal(null);
  private readonly isModelThinkingSubject = new BehaviorSubject(false);
  protected readonly canEditSession = signal(true);

  // TODO: Remove this once backend supports restarting bidi streaming.
  sessionHasUsedBidi = new Set<string>();

  eventData = new Map<string, any>();
  traceData: any[] = [];
  renderedEventGraph: SafeHtml|undefined;
  rawSvgString: string|null = null;

  selectedEvent: any = undefined;
  selectedEventIndex: any = undefined;
  llmRequest: any = undefined;
  llmResponse: any = undefined;
  llmRequestKey = 'gcp.vertex.agent.llm_request';
  llmResponseKey = 'gcp.vertex.agent.llm_response';

  getMediaTypeFromMimetype = getMediaTypeFromMimetype;

  selectedFiles: {file: File; url: string}[] = [];

  protected MediaType = MediaType;

  // Sync query params with value from agent picker.
  protected readonly selectedAppControl = new FormControl<string>('', {
    nonNullable: true,
  });

  protected openBase64InNewTab(data: string, mimeType: string) {
    this.safeValuesService.openBase64InNewTab(data, mimeType);
  }

  // Load apps
  protected isLoadingApps: WritableSignal<boolean> = signal(false);
  loadingError: WritableSignal<string> = signal('');
  protected readonly apps$: Observable<string[]|undefined> = of([]).pipe(
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
            queryParams: {app: app[0]},
          });
        }
      }),
      shareReplay(),
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

  // Trace detail
  bottomPanelVisible = false;
  hoveredEventMessageIndices: number[] = [];

  // Builder
  disableBuilderSwitch = false;

  constructor() {}

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

    // OAuth HACK: Opens oauth poup in a new window. If the oauth callback
    // is successful, the new window acquires the auth token, state and
    // optionally the scope. Send this back to the main window.
    const location = new URL(window.location.href);
    const searchParams = location.searchParams;
    if (searchParams.has('code')) {
      const authResponseUrl = window.location.href;
      // Send token to the main window
      window.opener?.postMessage({authResponseUrl}, window.origin);
      // Close the popup
      window.close();
    }

    this.agentService.getApp().subscribe((app) => {
      this.appName = app;
    });

    combineLatest([
      this.agentService.getLoadingState(),
      this.isModelThinkingSubject,
    ]).subscribe(([isLoading, isModelThinking]) => {
      const lastMessage = this.messages()[this.messages().length - 1];

      if (isLoading) {
        if (!lastMessage?.isLoading && !this.streamingTextMessage) {
          this.messages.update(
              (messages) =>
                  [...messages,
                   {role: 'bot', isLoading: true},
          ]);
        }
      } else if (lastMessage?.isLoading && !isModelThinking) {
        this.messages.update((messages) => messages.slice(0, -1));
        this.changeDetectorRef.detectChanges();
      }
    });

    this.traceService.selectedTraceRow$.subscribe(node => {
      const eventId = node?.attributes['gcp.vertex.agent.event_id'];

      if (eventId && this.eventData.has(eventId)) {
        this.bottomPanelVisible = true;
      } else {
        this.bottomPanelVisible = false;
      }
    });

    this.traceService.hoveredMessageIndices$.subscribe(
        i => this.hoveredEventMessageIndices = i);

    this.featureFlagService.isInfinityMessageScrollingEnabled()
        .pipe(first())
        .subscribe((enabled) => {
          if (enabled) {
            this.uiStateService.onNewMessagesLoaded().subscribe(
                (response: ListResponse<any>&{isBackground?: boolean}) => {
                  this.populateMessages(
                      response.items, true, !response.isBackground);
                  this.loadTraceData();
                });

            this.uiStateService.onNewMessagesLoadingFailed().subscribe(
                (error: {message: string}) => {
                  this.openSnackBar(error.message, 'OK');
                });
          }
        });
  }

  get sessionTab() {
    return this.sidePanel().sessionTabComponent();
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
      this.agentService.setApp(appName);

      this.loadSessionByUrlOrReset();
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
        this.sessionService.getSession(this.userId, this.appName, sessionUrl)
            .pipe(take(1), catchError((error) => {
                    this.openSnackBar(
                        'Cannot find specified session. Creating a new one.',
                        'OK');
                    this.createSessionAndReset();
                    return of(null);
                  }))
            .subscribe((session) => {
              if (session) {
                this.updateWithSelectedSession(session);
              }
            });
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
    this.createSession();
    this.eventData = new Map<string, any>();
    this.messages.set([]);
    this.artifacts = [];
    this.userInput = '';
    this.longRunningEvents = [];
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

  async sendMessage(event: Event) {
    event.preventDefault();
    if (!this.userInput.trim() && this.selectedFiles.length <= 0) return;

    if (event instanceof KeyboardEvent) {
      // support for japanese IME
      if (event.isComposing || event.keyCode === 229) {
        return;
      }
    }

    const userEventId = `user_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    const userParts: any[] = [];

    // Build combined user message
    const userMessage: any = {
      role: 'user',
      eventId: userEventId
    };

    // Add user message text
    if (!!this.userInput.trim()) {
      userParts.push({ text: this.userInput });
      userMessage.text = this.userInput;
    }

    // Add user message attachments
    if (this.selectedFiles.length > 0) {
      const messageAttachments = this.selectedFiles.map((file) => ({
                                                          file: file.file,
                                                          url: file.url,
                                                        }));

      for (const file of this.selectedFiles) {
        const part = await this.localFileService.createMessagePartFromFile(file.file);
        userParts.push(part);
      }

      userMessage.attachments = messageAttachments;
    }

    // Add the combined user message as a single row
    this.messages.update(messages => [...messages, userMessage]);

    const userEvent = {
      id: userEventId,
      author: 'user',
      content: { parts: userParts }
    };
    this.eventData.set(userEventId, userEvent);
    this.eventData = new Map(this.eventData);

    const req: AgentRunRequest = {
      appName: this.appName,
      userId: this.userId,
      sessionId: this.sessionId,
      newMessage: {
        role: 'user',
        parts: await this.getUserMessageParts(),
      },
      streaming: this.useSse,
      stateDelta: this.updatedSessionState(),
    };
    this.selectedFiles = [];
    this.streamingTextMessage = null;
    this.agentService.runSse(req).subscribe({
      next: async (chunkJson: AdkEvent) => {
        if (chunkJson.error) {
          this.openSnackBar(chunkJson.error, 'OK');
          return;
        }
        if (chunkJson.content) {
          let parts = this.combineTextParts(chunkJson.content.parts);
          if (this.isEventA2aResponse(chunkJson)) {
            parts = this.combineA2uiDataParts(parts);
          }

          for (let part of parts) {
            this.processPart(chunkJson, part);
            this.traceService.setEventData(this.eventData);
          }
        } else if (chunkJson.errorMessage) {
          this.processErrorMessage(chunkJson);
        }
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
        this.streamingTextMessage = null;
        this.featureFlagService.isSessionReloadOnNewMessageEnabled()
            .pipe(first())
            .subscribe((enabled) => {
              if (enabled) {
                this.sessionTab?.reloadSession(this.sessionId);
              }
            });
        this.eventService.getTrace(this.sessionId)
            .pipe(first(), catchError((error) => {
                    return of([]);
                  }))
            .subscribe((res) => {
              this.traceData = res;
              this.changeDetectorRef.detectChanges();
            });
        this.traceService.setMessages(this.messages());
        this.changeDetectorRef.detectChanges();
      },
    });
    // Clear input
    this.userInput = '';
    // Clear the query param for the initial user input once it is sent.
    const updatedUrl = this.router.parseUrl(this.location.path());
    if (updatedUrl.queryParams[INITIAL_USER_INPUT_QUERY_PARAM]) {
      delete updatedUrl.queryParams[INITIAL_USER_INPUT_QUERY_PARAM];
      this.location.replaceState(updatedUrl.toString());
    }
    this.changeDetectorRef.detectChanges();
  }

  private processErrorMessage(chunkJson: any) {
    this.storeEvents(chunkJson, chunkJson);
    this.insertMessageBeforeLoadingMessage(
        {text: chunkJson.errorMessage, role: 'bot'})
  }

  private processPart(chunkJson: any, part: any) {
    const renderedContent =
        chunkJson.groundingMetadata?.searchEntryPoint?.renderedContent;

    if (part.text) {
      this.isModelThinkingSubject.next(false);
      const newChunk = part.text;
      if (part.thought) {
        if (newChunk !== this.latestThought) {
          this.storeEvents(part, chunkJson);
          let thoughtMessage = {
            role: 'bot',
            text: this.processThoughtText(newChunk),
            thought: true,
            eventId: chunkJson.id,
          };

          this.insertMessageBeforeLoadingMessage(thoughtMessage);
        }
        this.latestThought = newChunk;
      } else if (!this.streamingTextMessage) {
        this.streamingTextMessage = {
          role: 'bot',
          text: this.processThoughtText(newChunk),
          thought: part.thought ? true : false,
          eventId: chunkJson.id,
        };

        if (renderedContent) {
          this.streamingTextMessage.renderedContent =
              chunkJson.groundingMetadata.searchEntryPoint.renderedContent;
        }

        if (!this.useSse) {
          this.insertMessageBeforeLoadingMessage(this.streamingTextMessage);
          this.storeEvents(part, chunkJson);
          this.streamingTextMessage = null;
          return;
        } else {
          this.insertMessageBeforeLoadingMessage(this.streamingTextMessage);
        }
      } else {
        if (renderedContent) {
          this.streamingTextMessage.renderedContent =
              chunkJson.groundingMetadata.searchEntryPoint.renderedContent;
        }

        if (newChunk == this.streamingTextMessage.text) {
          // Final chunk arrived - update the existing message's eventId
          const oldEventId = this.streamingTextMessage.eventId;
          this.messages.update((messages) => {
            return messages.map(m => {
              if (m.eventId === oldEventId && m.role === 'bot') {
                return {...m, eventId: chunkJson.id};
              }
              return m;
            });
          });
          this.storeEvents(part, chunkJson);
          this.streamingTextMessage = null;
          return;
        }
        // Update the streaming text and insert to trigger UI update
        this.streamingTextMessage.text += newChunk;
        this.insertMessageBeforeLoadingMessage(this.streamingTextMessage);
      }
    } else if (!part.thought) {
      // Skip partial events for non-text parts to avoid duplicates
      if (this.useSse && chunkJson.partial) {
        return;
      }

      // If the part is an A2A DataPart, display it as a message (e.g., A2UI or
      // Json)
      if (this.isA2aDataPart(part)) {
        const parsedObject = this.extractA2aDataPartJson(part);
        const isA2uiDataPart = parsedObject && parsedObject.kind === 'data' &&
            parsedObject.metadata?.mimeType === A2UI_MIME_TYPE;
        const displayPart =
            isA2uiDataPart ? {a2ui: parsedObject.data} : {text: parsedObject};
        this.isModelThinkingSubject.next(false);
        this.storeEvents(part, chunkJson);
        this.storeMessage(
            displayPart, chunkJson,
            chunkJson.author === 'user' ? 'user' : 'bot');
        return;
      }

      this.isModelThinkingSubject.next(false);
      this.storeEvents(part, chunkJson);

      const existingMessages = this.messages();
      const existingMessageIndex = existingMessages.findIndex(
        msg => msg.eventId === chunkJson.id && msg.role === 'bot'
      );

      if (existingMessageIndex !== -1) {
        // Update existing message by adding this part
        this.messages.update(messages => {
          const updatedMessages = [...messages];
          this.processPartIntoMessage(part, chunkJson, updatedMessages[existingMessageIndex]);
          return updatedMessages;
        });
      } else {
        this.storeMessage(
            part, chunkJson, chunkJson.author === 'user' ? 'user' : 'bot');
      }
    } else {
      this.isModelThinkingSubject.next(true);
    }
  }

  async getUserMessageParts() {
    let parts: any = [];

    if (!!this.userInput.trim()) {
      parts.push({text: `${this.userInput}`});
    }

    if (this.selectedFiles.length > 0) {
      for (const file of this.selectedFiles) {
        parts.push(
            await this.localFileService.createMessagePartFromFile(file.file));
      }
    }
    return parts;
  }

  private getArtifactDelta(actions: any): {[key: string]: any}|undefined {
    const artifactDelta = actions?.artifactDelta ?? actions?.artifact_delta;
    if (!artifactDelta || Object.keys(artifactDelta).length === 0) {
      return undefined;
    }
    return artifactDelta;
  }

  private renderArtifactsFromActions(actions: any, prepend: boolean = false) {
    const artifactDelta = this.getArtifactDelta(actions);
    if (!artifactDelta) {
      return;
    }

    for (const key in artifactDelta) {
      if (Object.prototype.hasOwnProperty.call(artifactDelta, key)) {
        this.renderArtifact(key, artifactDelta[key], prepend);
      }
    }
  }

  private processActionArtifact(e: AdkEvent) {
    if (this.getArtifactDelta(e.actions)) {
      this.storeEvents(null, e);
      this.storeMessage(null, e, 'bot');
    }
  }

  private processActionStateDelta(e: AdkEvent) {
    if (e.actions && e.actions.stateDelta &&
        Object.keys(e.actions.stateDelta).length > 0) {
      this.currentSessionState = e.actions.stateDelta;
    }
  }

  /**
   * Collapse consecutive text parts into a single part. Preserves relative
   * order of other parts.
   */
  private combineTextParts(parts: Part[]) {
    const result: Part[] = [];
    let combinedTextPart: Part|undefined;

    for (const part of parts) {
      if (part.text && !part.thought) {
        if (!combinedTextPart) {
          combinedTextPart = {text: part.text};
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
    let combinedDataPart: Part|undefined;

    for (const part of parts) {
      if (this.isA2uiDataPart(part)) {
        combinedA2uiJson.push(this.extractA2aDataPartJson(part));
        // Insert the combined data part into the result array here so that the
        // order of the a2ui components is preserved.
        if (!combinedDataPart) {
          combinedDataPart = {
            inlineData: {mimeType: 'text/plain', data: part.inlineData!.data}
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
    if (e?.author) {
      this.createAgentIconColorClass(e.author);
    }

    if (e?.longRunningToolIds && e.longRunningToolIds.length > 0) {
      this.getAsyncFunctionsFromParts(
          e.longRunningToolIds, e.content.parts, e.invocationId);
      const func = this.longRunningEvents[0].function;
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
              this.functionCallEventId = e.id;
              this.sendOAuthResponse(func, authResponseUrl, this.redirectUri);
            })
            .catch((error) => {
              console.error('OAuth Error:', error);
            });
      } else {
        this.functionCallEventId = e.id;
      }
    }
    this.renderArtifactsFromActions(e?.actions, prepend);

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
        message.eventId = e?.id;
      } else if (part.functionCall) {
        message.functionCalls = [part.functionCall];
        message.eventId = e?.id;
      } else if (part.functionResponse) {
        message.functionResponses = [part.functionResponse];
        message.eventId = e?.id;
      } else if (part.executableCode) {
        message.executableCode = part.executableCode;
      } else if (part.codeExecutionResult) {
        message.codeExecutionResult = part.codeExecutionResult;
      }
    }

    if (part && Object.keys(part).length > 0) {
      if (prepend) {
        this.messages.update((messages) => [message, ...messages]);
      } else {
        this.insertMessageBeforeLoadingMessage(message);
      }
    }
  }

  private insertMessageBeforeLoadingMessage(message: any) {
    this.messages.update((messages) => {
      // If SSE streaming is enabled and this is a text message with eventId
      if (this.useSse && message.text && message.eventId &&
          message.role === 'bot') {
        // Find existing streaming message with the same eventId
        const existingIndex = messages.findIndex(
            m => m.eventId === message.eventId && m.role === 'bot' &&
                !m.isLoading);
        if (existingIndex !== -1) {
          const updatedMessages = [...messages];
          updatedMessages[existingIndex] = {
            ...updatedMessages[existingIndex],
            text: message.text,
            renderedContent: message.renderedContent ||
                updatedMessages[existingIndex].renderedContent
          };
          return updatedMessages;
        }
      }

      // Default behavior: insert new message
      const lastMessage = messages[messages.length - 1];
      if (lastMessage?.isLoading) {
        return [...messages.slice(0, -1), message, lastMessage];
      } else {
        return [...messages, message];
      }
    });
  }

  private formatBase64Data(data: string, mimeType: string) {
    const fixedBase64Data = fixBase64String(data);
    return `data:${mimeType};base64,${fixedBase64Data}`;
  }

  private processPartIntoMessage(part: any, event: any, message: any) {
    if (!part) return;

    if (part.text) {
      message.text = part.text;
      message.thought = part.thought ? true : false;
      if (event?.groundingMetadata && event.groundingMetadata.searchEntryPoint &&
          event.groundingMetadata.searchEntryPoint.renderedContent) {
        message.renderedContent =
            event.groundingMetadata.searchEntryPoint.renderedContent;
      }
      if (event?.id) {
        message.eventId = event.id;
      }
    } else if (part.inlineData) {
      const base64Data = this.formatBase64Data(
          part.inlineData.data, part.inlineData.mimeType);
      message.inlineData = {
        displayName: part.inlineData.displayName,
        data: base64Data,
        mimeType: part.inlineData.mimeType,
      };
      if (message.role === 'user' && event?.id) {
        message.eventId = event.id;
      }
    } else if (part.functionCall) {
      if (!message.functionCalls) {
        message.functionCalls = [];
      }
      message.functionCalls.push(part.functionCall);
      if (event?.id) {
        message.eventId = event.id;
      }
    } else if (part.functionResponse) {
      if (!message.functionResponses) {
        message.functionResponses = [];
      }
      message.functionResponses.push(part.functionResponse);
      if (event?.id) {
        message.eventId = event.id;
      }
    } else if (part.executableCode) {
      message.executableCode = part.executableCode;
    } else if (part.codeExecutionResult) {
      message.codeExecutionResult = part.codeExecutionResult;
    } else if (part.a2ui) {
      message.a2uiData = this.processA2uiPartIntoMessage(part);
    }
  }

  private handleArtifactFetchFailure(
      message: any, artifactId: string, versionId: string) {
    this.openSnackBar(
        'Failed to fetch artifact data',
        'OK',
    );
    // Remove placeholder message and artifact on failure
    this.messages.update(messages => messages.filter((m) => m !== message));
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
    let message = {
      role: 'bot',
      inlineData: {
        data: '',
        mimeType: 'image/png',
      },
    };
    if (prepend) {
      this.messages.update((messages) => [message, ...messages]);
    } else {
      this.insertMessageBeforeLoadingMessage(message);
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
            const {mimeType, data} = res.inlineData ?? {};
            if (!mimeType || !data) {
              this.handleArtifactFetchFailure(message, artifactId, versionId);
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

            this.messages.update(messages => {
              return messages.map(m => {
                if (m === message) {
                  return {
                    role: 'bot',
                    inlineData,
                  };
                }
                return m;
              });
            });

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
            this.handleArtifactFetchFailure(message, artifactId, versionId);
          }
        });
  }

  private storeEvents(part: any, e: any) {
    let title = '';
    if (part == null && this.getArtifactDelta(e?.actions)) {
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
    const authResponse: AgentRunRequest = {
      appName: this.appName,
      userId: this.userId,
      sessionId: this.sessionId,
      newMessage: {
        role: 'user',
        parts: [],
      },
    };

    var authConfig = structuredClone(func.args.authConfig);
    authConfig.exchangedAuthCredential.oauth2.authResponseUri = authResponseUrl;
    authConfig.exchangedAuthCredential.oauth2.redirectUri = redirectUri;

    authResponse.functionCallEventId = this.functionCallEventId;
    authResponse.newMessage.parts.push({
      function_response: {
        id: func.id,
        name: func.name,
        response: authConfig,
      },
    });

    let response: any[] = [];
    this.agentService.runSse(authResponse).subscribe({
      next: async (chunkJson) => {
        response.push(chunkJson);
      },
      error: (err) => console.error('SSE error:', err),
      complete: () => {
        this.processRunSseResponse(response);
      },
    });
  }

  private processRunSseResponse(response: any) {
    for (const e of response) {
      if (e.content) {
        for (let part of e.content.parts) {
          this.processPart(e, part);
        }
      }
    }
  }

  openDialog(): void {
    const dialogRef = this.dialog.open(PendingEventDialogComponent, {
      width: '600px',
      data: {
        event: this.longRunningEvents[0].function,
        appName: this.appName,
        userId: this.userId,
        sessionId: this.sessionId,
        functionCallEventId: this.functionCallEventId,
        invocationId: this.longRunningEvents[0].invocationId
      },
    });

    dialogRef.afterClosed().subscribe((t) => {
      if (t) {
        this.removeFinishedLongRunningEvents(t.events);
        this.processRunSseResponse(t.response);
        this.changeDetectorRef.detectChanges();
      }
    });
  }

  removeFinishedLongRunningEvents(finishedEvents: any[]) {
    const idsToExclude = new Set(finishedEvents.map((obj: any) => obj.id));
    this.longRunningEvents =
        this.longRunningEvents.filter(obj => !idsToExclude.has(obj.id));
  }

  createAgentIconColorClass(agentName: string) {
    const agentIconColor = this.stringToColorService.stc(agentName);

    const agentIconColorClass =
        `custom-icon-color-${agentIconColor.replace('#', '')}`;

    // Inject the style for this unique class
    this.injectCustomIconColorStyle(agentIconColorClass, agentIconColor);
  }

  clickEvent(i: number) {
    const message = this.messages()[i];
    const key = message.eventId;

    if (!key) {
      return;
    }

    // If clicking the already selected event, deselect it
    if (this.selectedEvent && this.selectedEvent.id === key) {
      this.selectedEvent = undefined;
      this.selectedEventIndex = undefined;
      return;
    }

    // For user messages, clear LLM request/response since they don't have those
    if (message.role === 'user') {
      this.selectedEvent = this.eventData.get(key);
      this.selectedEventIndex = this.getIndexOfKeyInMap(key);
      this.llmRequest = undefined;
      this.llmResponse = undefined;
      this.sideDrawer()?.open();
      this.showSidePanel = true;
      return;
    }

    this.sideDrawer()?.open();
    this.showSidePanel = true;
    this.selectEvent(key);
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
    this.bottomPanelVisible = false;
  }

  toggleAudioRecording() {
    this.isAudioRecording ? this.stopAudioRecording() :
                            this.startAudioRecording();
  }

  startAudioRecording() {
    if (this.sessionHasUsedBidi.has(this.sessionId)) {
      this.openSnackBar(BIDI_STREAMING_RESTART_WARNING, 'OK');
      return;
    }

    this.isAudioRecording = true;
    this.streamChatService.startAudioChat({
      appName: this.appName,
      userId: this.userId,
      sessionId: this.sessionId,
    });
    this.messages.update(
        messages =>
            [...messages,
             {role: 'user', text: 'Speaking...'},
             {role: 'bot', text: 'Speaking...'},
    ]);
    this.sessionHasUsedBidi.add(this.sessionId);
  }

  stopAudioRecording() {
    this.streamChatService.stopAudioChat();
    this.isAudioRecording = false;
  }

  toggleVideoRecording() {
    this.isVideoRecording ? this.stopVideoRecording() :
                            this.startVideoRecording();
  }

  startVideoRecording() {
    if (this.sessionHasUsedBidi.has(this.sessionId)) {
      this.openSnackBar(BIDI_STREAMING_RESTART_WARNING, 'OK');
      return;
    }
    const videoContainer = this.chatPanel()?.videoContainer;
    if (!videoContainer) {
      return;
    }
    this.isVideoRecording = true;
    this.streamChatService.startVideoChat({
      appName: this.appName,
      userId: this.userId,
      sessionId: this.sessionId,
      videoContainer,
    });
    this.messages.update(
        messages => [...messages, {role: 'user', text: 'Speaking...'}]);
    this.sessionHasUsedBidi.add(this.sessionId);
  }

  stopVideoRecording() {
    const videoContainer = this.chatPanel()?.videoContainer;
    if (!videoContainer) {
      return;
    }
    this.streamChatService.stopVideoChat(videoContainer);
    this.isVideoRecording = false;
  }

  private getAsyncFunctionsFromParts(
      pendingIds: any[], parts: any[], invocationId: string) {
    for (const part of parts) {
      if (part.functionCall && pendingIds.includes(part.functionCall.id)) {
        this.longRunningEvents.push(
            {function: part.functionCall, invocationId: invocationId});
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
        const {authResponseUrl} = event.data;
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
    } else {
      this.sideDrawer()?.open();
    }
    this.showSidePanel = !this.showSidePanel;
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

  private resetEventsAndMessages({keepMessages}: {keepMessages?:
                                                      boolean} = {}) {
    if (!keepMessages) {
      this.eventData.clear();
      this.messages.set([]);
    }
    this.artifacts = [];
  }

  private loadTraceData() {
    this.eventService.getTrace(this.sessionId)
        .pipe(first(), catchError(() => of([])))
        .subscribe(res => {
          this.traceData = res;
          this.traceService.setEventData(this.eventData);
          this.traceService.setMessages(this.messages());
        });
    this.bottomPanelVisible = false;
    this.changeDetectorRef.detectChanges();
  }

  private populateMessages(
      events: any[], reverseOrder: boolean = false,
      keepOldMessages: boolean = false) {
    this.resetEventsAndMessages({
      keepMessages:
          keepOldMessages && this.sessionIdOfLoadedMessages === this.sessionId
    });

    events.forEach((event: any) => {
      const isA2aResponse = this.isEventA2aResponse(event);
      const parts = isA2aResponse ?
          this.combineA2uiDataParts(event.content?.parts) :
          event.content?.parts || [];
      const partsToProcess = reverseOrder ? [...parts].reverse() : parts;

      if (event.author === 'user') {
        // For user messages, combine all parts into a single message
        const userMessage: any = {
          role: 'user',
          eventId: event.id
        };

        partsToProcess.forEach((part: any) => {
          this.processPartIntoMessage(part, event, userMessage);
        });

        if (reverseOrder) {
          this.messages.update((messages) => [userMessage, ...messages]);
        } else {
          this.messages.update((messages) => [...messages, userMessage]);
        }

        // Store the event in eventData
        if (!this.eventData.has(event.id)) {
          this.eventData.set(event.id, event);
          this.eventData = new Map(this.eventData);
        }
      } else {
        // For bot messages, combine all parts into a single message
        const botMessage: any = {
          role: 'bot',
          eventId: event.id
        };

        partsToProcess.forEach((part: any) => {
          if (isA2aResponse && this.isA2uiDataPart(part)) {
            part = {a2ui: this.extractA2aDataPartJson(part).data};
          }
          this.processPartIntoMessage(part, event, botMessage);
        });

        this.renderArtifactsFromActions(event?.actions, reverseOrder);

        if (reverseOrder) {
          this.messages.update((messages) => [botMessage, ...messages]);
        } else {
          this.messages.update((messages) => [...messages, botMessage]);
        }

        // Store the event in eventData
        if (!this.eventData.has(event.id)) {
          this.eventData.set(event.id, event);
          this.eventData = new Map(this.eventData);
        }
      }
    });

    this.sessionIdOfLoadedMessages = this.sessionId;
  }

  protected updateWithSelectedSession(session: Session) {
    if (!session || !session.id || !session.events || !session.state) {
      return;
    }
    this.traceService.resetTraceService();
    this.sessionId = session.id;
    this.currentSessionState = session.state;
    this.evalCase = null;
    this.isChatMode.set(true);

    this.isSessionUrlEnabledObs.subscribe((enabled) => {
      if (enabled) {
        this.updateSelectedSessionUrl();
      }
    });

    this.resetEventsAndMessages();

    session.events.forEach((event: any) => {
      if (event.author === 'user') {
        // For user messages, combine all parts into a single message
        const userMessage: any = {
          role: 'user',
          eventId: event.id
        };

        event.content?.parts?.forEach((part: any) => {
          this.processPartIntoMessage(part, event, userMessage);
        });

        this.messages.update((messages) => [...messages, userMessage]);

        // Store the event in eventData
        if (!this.eventData.has(event.id)) {
          this.eventData.set(event.id, event);
          this.eventData = new Map(this.eventData);
        }
      } else {
        // For bot messages, combine all parts into a single message
        const botMessage: any = {
          role: 'bot',
          eventId: event.id
        };

        event.content?.parts?.forEach((part: any) => {
          this.processPartIntoMessage(part, event, botMessage);
        });

        this.renderArtifactsFromActions(event?.actions, false);

        this.messages.update((messages) => [...messages, botMessage]);

        // Store the event in eventData
        if (!this.eventData.has(event.id)) {
          this.eventData.set(event.id, event);
          this.eventData = new Map(this.eventData);
        }
      }
    });

    this.eventService.getTrace(this.sessionId)
        .pipe(first(), catchError(() => of([])))
        .subscribe(res => {
          this.traceData = res;
          this.traceService.setEventData(this.eventData);
          this.traceService.setMessages(this.messages());
        });

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
            functionCall: {name: toolUse.name, args: toolUse.args},
          };
          this.storeMessage(
              functionCallPart, null, 'bot', invocationIndex, {toolUseIndex});
          toolUseIndex++;

          const functionResponsePart = {functionResponse: {name: toolUse.name}};
          this.storeMessage(functionResponsePart, null, 'bot');
        }
      }

      if (invocation.finalResponse?.parts) {
        let finalResponsePartIndex = 0;
        for (const part of invocation.finalResponse.parts) {
          this.storeMessage(
              part, null, 'bot', invocationIndex, {finalResponsePartIndex});
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
    this.messages.update((messages) => messages.filter((m, i) => i !== index));

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
    this.createSession();
    this.eventData.clear();
    this.messages.set([]);
    this.artifacts = [];
    this.traceData = [];
    this.bottomPanelVisible = false;

    // Clear selected event
    this.selectedEvent = undefined;
    this.selectedEventIndex = undefined;

    // Close eval history if opened
    if (!!this.evalTab()?.showEvalHistory) {
      this.evalTab()?.toggleEvalHistoryButton();
    }
  }

  onFileSelect(event: Event) {
    const input = event.target as HTMLInputElement;
    if (input.files) {
      for (let i = 0; i < input.files.length; i++) {
        const file = input.files[i];
        const url = this.safeValuesService.createObjectUrl(file);
        this.selectedFiles.push({file, url});
      }
    }
    input.value = '';
  }

  removeFile(index: number) {
    URL.revokeObjectURL(this.selectedFiles[index].url);
    this.selectedFiles.splice(index, 1);
  }

  toggleSse() {
    this.useSse = !this.useSse;
  }

  enterBuilderMode() {
    const url = this.router
                    .createUrlTree([], {
                      queryParams: {mode: 'builder'},
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
                      queryParams: {mode: null},
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
        data: {existingAppNames: apps ?? []},
      });
    });
  }

  saveAgentBuilder() {
    this.canvasComponent()?.saveAgent(this.appName);
  }

  selectEvent(key: string) {
    this.selectedEvent = this.eventData.get(key);
    this.selectedEventIndex = this.getIndexOfKeyInMap(key);

    let filter = undefined;
    if (this.isEventFilteringEnabled() && this.selectedEvent.invocationId &&
        (this.selectedEvent.timestamp ||
         this.selectedEvent.timestampInMillis)) {
      filter = {
        invocationId: this.selectedEvent.invocationId,
        timestamp:
            this.selectedEvent.timestamp ?? this.selectedEvent.timestampInMillis
      };
    }

    const eventTraceParam = {id: this.selectedEvent.id, ...filter};
    this.uiStateService.setIsEventRequestResponseLoading(true);
    this.eventService.getEventTrace(eventTraceParam)
        .subscribe(
            (res) => {
              if (res[this.llmRequestKey]) {
                this.llmRequest = JSON.parse(res[this.llmRequestKey]);
              }
              if (res[this.llmResponseKey]) {
                this.llmResponse = JSON.parse(res[this.llmResponseKey]);
              }
              this.uiStateService.setIsEventRequestResponseLoading(false);
            },
            () => {
              this.uiStateService.setIsEventRequestResponseLoading(false);
            });
    this.eventService
        .getEvent(
            this.userId,
            this.appName,
            this.sessionId,
            this.selectedEvent.id,
            )
        .subscribe(async (res) => {
          if (!res.dotSrc) {
            this.renderedEventGraph = undefined;
            return;
          }
          const svg = await this.graphService.render(res.dotSrc);
          this.rawSvgString = svg;
          this.renderedEventGraph =
              this.safeValuesService.bypassSecurityTrustHtml(svg);
        });
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

        this.selectedAppControl.setValue(app, {emitEvent: false});
        this.selectApp(app);

        this.agentService.getAgentBuilder(app).subscribe((res: any) => {
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
            queryParams: {'app': app, 'mode': null},
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

  handlePageEvent(event: any) {
    if (event.pageIndex >= 0) {
      const key = this.getKeyAtIndexInMap(event.pageIndex);
      if (key) {
        this.selectEvent(key);

        // Scroll to the corresponding message in the chat panel
        setTimeout(() => {
          const messageIndex = this.messages().findIndex(msg => msg.eventId === key);
          if (messageIndex !== -1) {
            const scrollContainer = this.chatPanel()?.scrollContainer?.nativeElement;
            if (!scrollContainer) return;

            const messageElements = scrollContainer.querySelectorAll('.message-column-container');
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
  }

  @HostListener('window:keydown', ['$event'])
  handleEscapeKey(event: KeyboardEvent) {
    if (event.key === 'Escape' && this.selectedEvent) {
      event.preventDefault();
      this.selectedEvent = undefined;
      this.selectedEventIndex = undefined;
    }
  }

  private getIndexOfKeyInMap(key: string): number|undefined {
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

  private getKeyAtIndexInMap(index: number): string|undefined {
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

  openSnackBar(message: string, action: string) {
    this._snackBar.open(message, action);
  }

  private processThoughtText(text: string) {
    return text.replace('/*PLANNING*/', '').replace('/*ACTION*/', '');
  }

  openLink(url: string) {
    this.safeValuesService.windowOpen(window, url, '_blank');
  }

  openViewImageDialog(imageData: string|null) {
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

  closeTraceEventDetailPanel() {
    this.bottomPanelVisible = false;
    this.traceService.selectedRow(undefined);
    this.traceService.setHoveredMessages(undefined, '')
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
            if (!sessionData.userId || !sessionData.appName ||
                !sessionData.events) {
              this.openSnackBar('Invalid session file format', 'OK');
              return;
            }
            this.sessionService
                .importSession(
                    sessionData.userId, sessionData.appName, sessionData.events)
                .subscribe((res) => {
                  this.openSnackBar('Session imported', 'OK');
                  this.sessionTab?.refreshSession();
                });
          } catch (error) {
            this.openSnackBar('Error parsing session file', 'OK');
          }
        }
      };

      reader.readAsText(file);
    };

    input.click();
  }

  // Helper method to dynamically inject the style
  private injectCustomIconColorStyle(className: string, color: string): void {
    // Check if the style already exists to prevent duplicates
    if (this.document.getElementById(className)) {
      return;
    }

    const style = this.renderer.createElement('style');
    this.renderer.setAttribute(
        style, 'id', className);  // Set an ID to check for existence later
    this.renderer.setAttribute(style, 'type', 'text/css');

    // Define the CSS
    const css = `
      .${className} {
        background-color: ${color} !important;
      }
    `;

    this.renderer.appendChild(style, this.renderer.createText(css));
    this.renderer.appendChild(
        this.document.head, style);  // Append to the head of the document
  }
}
