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

import {CdkTextareaAutosize} from '@angular/cdk/text-field';
import {AsyncPipe, DOCUMENT, Location, NgClass, NgStyle} from '@angular/common';
import {HttpErrorResponse} from '@angular/common/http';
import {AfterViewInit, ChangeDetectionStrategy, ChangeDetectorRef, Component, computed, ElementRef, HostListener, Inject, inject, Injectable, OnDestroy, OnInit, Renderer2, signal, viewChild, WritableSignal} from '@angular/core';
import {FormControl, FormsModule, ReactiveFormsModule} from '@angular/forms';
import {MatButton, MatFabButton, MatIconButton, MatMiniFabButton} from '@angular/material/button';
import {MatCard} from '@angular/material/card';
import {MatOption} from '@angular/material/core';
import {MatDialog, MatDialogModule} from '@angular/material/dialog';
import {MatDivider} from '@angular/material/divider';
import {MatIcon} from '@angular/material/icon';
import {MatInput} from '@angular/material/input';
import {MatPaginator, MatPaginatorIntl} from '@angular/material/paginator';
import {MatProgressBar} from '@angular/material/progress-bar';
import {MatSelect} from '@angular/material/select';
import {MatDrawer, MatDrawerContainer} from '@angular/material/sidenav';
import {MatSlideToggle} from '@angular/material/slide-toggle';
import {MatSnackBar} from '@angular/material/snack-bar';
import {MatTooltip} from '@angular/material/tooltip';
import {DomSanitizer, SafeHtml} from '@angular/platform-browser';
import {ActivatedRoute, NavigationEnd, Router} from '@angular/router';
import {NgxJsonViewerModule} from 'ngx-json-viewer';
import {BehaviorSubject, combineLatest, Observable, of} from 'rxjs';
import {catchError, distinctUntilChanged, filter, map, shareReplay, switchMap, take, tap} from 'rxjs/operators';

import {URLUtil} from '../../../utils/url-util';
import {AgentRunRequest} from '../../core/models/AgentRunRequest';
import {EvalCase} from '../../core/models/Eval';
import {Session, SessionState} from '../../core/models/Session';
import {Event as AdkEvent} from '../../core/models/types';
import {AGENT_SERVICE, AgentService} from '../../core/services/agent.service';
import {ARTIFACT_SERVICE, ArtifactService} from '../../core/services/artifact.service';
import {AUDIO_SERVICE, AudioService} from '../../core/services/audio.service';
import {DOWNLOAD_SERVICE, DownloadService} from '../../core/services/download.service';
import {EVAL_SERVICE, EvalService} from '../../core/services/eval.service';
import {EVENT_SERVICE, EventService} from '../../core/services/event.service';
import {FEATURE_FLAG_SERVICE, FeatureFlagService} from '../../core/services/feature-flag.service';
import {GRAPH_SERVICE, GraphService} from '../../core/services/graph.service';
import {SAFE_VALUES_SERVICE, SafeValuesService} from '../../core/services/interfaces/safevalues';
import {STRING_TO_COLOR_SERVICE} from '../../core/services/interfaces/string-to-color';
import {SESSION_SERVICE, SessionService} from '../../core/services/session.service';
import {TRACE_SERVICE, TraceService} from '../../core/services/trace.service';
import {VIDEO_SERVICE, VideoService} from '../../core/services/video.service';
import {WEBSOCKET_SERVICE, WebSocketService} from '../../core/services/websocket.service';
import {ResizableBottomDirective} from '../../directives/resizable-bottom.directive';
import {ResizableDrawerDirective} from '../../directives/resizable-drawer.directive';
import {ArtifactTabComponent, getMediaTypeFromMimetype, MediaType} from '../artifact-tab/artifact-tab.component';
import {AudioPlayerComponent} from '../audio-player/audio-player.component';
import {ChatPanelComponent} from '../chat-panel/chat-panel.component';
import {EditJsonDialogComponent} from '../edit-json-dialog/edit-json-dialog.component';
import {EvalTabComponent} from '../eval-tab/eval-tab.component';
import {PendingEventDialogComponent} from '../pending-event-dialog/pending-event-dialog.component';
import {DeleteSessionDialogComponent, DeleteSessionDialogData,} from '../session-tab/delete-session-dialog/delete-session-dialog.component';
import {SessionTabComponent} from '../session-tab/session-tab.component';
import {SidePanelComponent} from '../side-panel/side-panel.component';
import {StateTabComponent} from '../state-tab/state-tab.component';
import {TraceEventComponent} from '../trace-tab/trace-event/trace-event.component';
import {TraceTabComponent} from '../trace-tab/trace-tab.component';
import {ViewImageDialogComponent} from '../view-image-dialog/view-image-dialog.component';

const ROOT_AGENT = 'root_agent';

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
  changeDetection: ChangeDetectionStrategy.OnPush,
  providers: [
    {provide: MatPaginatorIntl, useClass: CustomPaginatorIntl},
  ],
  imports: [
    MatDrawerContainer,
    MatTooltip,
    MatDrawer,
    ResizableDrawerDirective,
    MatSelect,
    FormsModule,
    ReactiveFormsModule,
    MatOption,
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
  ],
})
export class ChatComponent implements OnInit, AfterViewInit, OnDestroy {
  chatPanel = viewChild.required(ChatPanelComponent);
  sideDrawer = viewChild.required<MatDrawer>('sideDrawer');
  sessionTab = viewChild(SessionTabComponent);
  evalTab = viewChild(EvalTabComponent);
  private scrollContainer = viewChild.required<ElementRef>('autoScroll');
  bottomPanelRef = viewChild.required<ElementRef>('bottomPanel');
  private _snackBar = inject(MatSnackBar);
  shouldShowEvalTab = signal(true);
  enableSseIndicator = signal(false);
  isChatMode = signal(true);
  isEvalCaseEditing = signal(false);
  hasEvalCaseChanged = signal(false);
  isEvalEditMode = signal(false);
  videoElement!: HTMLVideoElement;
  currentMessage = '';
  messages = signal<any[]>([]);
  lastTextChunk: string = '';
  streamingTextMessage: any | null = null;
  latestThought: string = '';
  artifacts: any[] = [];
  userInput: string = '';
  userEditEvalCaseMessage: string = '';
  userId = 'user';
  appName = '';
  sessionId = ``;
  evalCase: EvalCase | null = null;
  updatedEvalCase: EvalCase | null = null;
  evalSetId = '';
  isAudioRecording = false;
  isVideoRecording = false;
  longRunningEvents: any[] = [];
  functionCallEventId = '';
  redirectUri = URLUtil.getBaseUrlWithoutPath();
  showSidePanel = true;
  useSse = false;
  currentSessionState: SessionState|undefined = {};
  root_agent = ROOT_AGENT;
  updatedSessionState: WritableSignal<any> = signal(null);
  private readonly streamingTextMessageSubject =
      new BehaviorSubject<any|null>(null);
  private readonly isModelThinkingSubject = new BehaviorSubject(false);
  private readonly scrollInterruptedSubject = new BehaviorSubject(false);

  // TODO: Remove this once backend supports restarting bidi streaming.
  sessionHasUsedBidi = new Set<string>();

  eventData = new Map<string, any>();
  traceData: any[] = [];
  eventMessageIndexArray: any[] = [];
  renderedEventGraph: SafeHtml | undefined;
  rawSvgString: string | null = null;

  selectedEvent: any = undefined;
  selectedEventIndex: any = undefined;
  llmRequest: any = undefined;
  llmResponse: any = undefined;
  llmRequestKey = 'gcp.vertex.agent.llm_request';
  llmResponseKey = 'gcp.vertex.agent.llm_response';

  getMediaTypeFromMimetype = getMediaTypeFromMimetype;

  selectedFiles: { file: File; url: string }[] = [];
  private previousMessageCount = 0;

  protected MediaType = MediaType;

  // Sync query params with value from agent picker.
  private readonly router = inject(Router);
  private readonly activatedRoute = inject(ActivatedRoute);
  protected readonly selectedAppControl = new FormControl<string>('', {
    nonNullable: true,
  });

  private readonly changeDetectorRef = inject(ChangeDetectorRef);
  private readonly stringToColorService = inject(STRING_TO_COLOR_SERVICE);
  private readonly safeValuesService = inject(SAFE_VALUES_SERVICE);
  protected openBase64InNewTab = this.safeValuesService.openBase64InNewTab;

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
          relativeTo: this.route,
          queryParams: { app: app[0] },
        });
      }
    }),
    shareReplay(),
  );

  // Import session
  importSessionEnabledObs: Observable<boolean>;

  // Edit eval tool use
  isEditFunctionArgsEnabledObs: Observable<boolean>;

  // Session url
  isSessionUrlEnabledObs: Observable<boolean>;

  // Application selector
  isApplicationSelectorEnabledObs: Observable<boolean>;

  // Trace detail
  bottomPanelVisible = false;
  hoveredEventMessageIndices: number[] = [];

  constructor(
      @Inject(SESSION_SERVICE) private sessionService: SessionService,
      @Inject(ARTIFACT_SERVICE) private artifactService: ArtifactService,
      @Inject(AUDIO_SERVICE) private audioService: AudioService,
      @Inject(WEBSOCKET_SERVICE) private webSocketService: WebSocketService,
      @Inject(VIDEO_SERVICE) private videoService: VideoService,
      private dialog: MatDialog,
      @Inject(EVENT_SERVICE) private eventService: EventService,
      private route: ActivatedRoute,
      @Inject(DOWNLOAD_SERVICE) private downloadService: DownloadService,
      @Inject(EVAL_SERVICE) private evalService: EvalService,
      @Inject(TRACE_SERVICE) private traceService: TraceService,
      private location: Location,
      private renderer: Renderer2,
      @Inject(DOCUMENT) private document: Document,
      @Inject(AGENT_SERVICE) private agentService: AgentService,
      @Inject(FEATURE_FLAG_SERVICE) private featureFlagService:
          FeatureFlagService,
      @Inject(GRAPH_SERVICE) private graphService: GraphService,
  ) {
    this.importSessionEnabledObs =
        this.featureFlagService.isImportSessionEnabled();
    this.isEditFunctionArgsEnabledObs =
        this.featureFlagService.isEditFunctionArgsEnabled();
    this.isSessionUrlEnabledObs = this.featureFlagService.isSessionUrlEnabled();
    this.isApplicationSelectorEnabledObs =
        this.featureFlagService.isApplicationSelectorEnabled();
  }

  ngOnInit(): void {
    this.syncSelectedAppFromUrl();
    this.updateSelectedAppUrl();

    this.webSocketService.onCloseReason().subscribe((closeReason) => {
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
      window.opener?.postMessage({ authResponseUrl }, window.origin);
      // Close the popup
      window.close();
    }

    this.agentService.getApp().subscribe((app) => {
      this.appName = app;
    });

    combineLatest([
      this.agentService.getLoadingState(), this.isModelThinkingSubject
    ]).subscribe(([isLoading, isModelThinking]) => {
      const lastMessage = this.messages()[this.messages().length - 1];

      if (isLoading) {
        if (!lastMessage?.isLoading && !this.streamingTextMessage) {
          this.messages.update(
              messages => [...messages, {role: 'bot', isLoading: true}]);
        }
      } else if (lastMessage?.isLoading && !isModelThinking) {
        this.messages.update(messages => messages.slice(0, -1));
        this.changeDetectorRef.detectChanges();
      }
    });

    this.traceService.selectedTraceRow$.subscribe(node => {
      const eventId = node?.attributes['gcp.vertex.agent.event_id']
      if (eventId && this.eventData.has(eventId)) {
        this.bottomPanelVisible = true;
      } else {
        this.bottomPanelVisible = false;
      }
    })

    this.traceService.hoveredMessageIndicies$.subscribe(i => this.hoveredEventMessageIndices = i);
  }

  ngAfterViewInit() {
    this.showSidePanel = true;
    this.sideDrawer()?.open();
  }

  selectApp(appName: string) {
    if (appName != this.appName) {
      this.agentService.setApp(appName);

      this.isSessionUrlEnabledObs.subscribe((sessionUrlEnabled) => {
        const sessionUrl = this.activatedRoute.snapshot.queryParams['session'];

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
  }

  private createSessionAndReset() {
    this.createSession();
    this.eventData = new Map<string, any>();
    this.eventMessageIndexArray = [];
    this.messages.set([]);
    this.artifacts = [];
    this.userInput = '';
    this.longRunningEvents = [];
  }

  createSession() {
    this.sessionService.createSession(this.userId, this.appName)
      .subscribe((res) => {
        this.currentSessionState = res.state;
        this.sessionId = res.id;
        this.sessionTab()?.refreshSession();

        this.isSessionUrlEnabledObs.subscribe((enabled) => {
          if (enabled) {
            this.updateSelectedSessionUrl();
          }
        });
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

    // Add user message
    if (!!this.userInput.trim()) {
      this.messages.update(
          messages => [...messages, {role: 'user', text: this.userInput}]);
    }

    // Add user message attachments
    if (this.selectedFiles.length > 0) {
      const messageAttachments = this.selectedFiles.map((file) => ({
        file: file.file,
        url: file.url,
      }));
      this.messages.update(
          messages =>
              [...messages, {role: 'user', attachments: messageAttachments}]);
    }

    const req: AgentRunRequest = {
      appName: this.appName,
      userId: this.userId,
      sessionId: this.sessionId,
      newMessage: {
        'role': 'user',
        'parts': await this.getUserMessageParts(),
      },
      streaming: this.useSse,
      stateDelta: this.updatedSessionState(),
    };
    this.selectedFiles = [];
    let index = this.eventMessageIndexArray.length - 1;
    this.streamingTextMessage = null;
    this.agentService.runSse(req).subscribe({
      next: async (chunkJson: AdkEvent) => {
        if (chunkJson.error) {
          this.openSnackBar(chunkJson.error, 'OK');
          return;
        }
        if (chunkJson.content) {
          for (let part of chunkJson.content.parts) {
            index += 1;
            this.processPart(chunkJson, part, index);
            this.traceService.setEventData(this.eventData);
          }
        } else if (chunkJson.errorMessage) {
          this.processErrorMessage(chunkJson, index)
        }
        this.changeDetectorRef.detectChanges();
      },
      error: (err) => {
        console.error('Send message error:', err);
        this.openSnackBar(err, 'OK');
      },
      complete: () => {
        this.streamingTextMessage = null;
        this.sessionTab()?.reloadSession(this.sessionId);
        this.eventService.getTrace(this.sessionId)
            .pipe(catchError((error) => {
              if (error.status === 404) {
                return of(null);
              }
              return of([]);
            }))
            .subscribe(res => {
              this.traceData = res;
              this.changeDetectorRef.detectChanges();
            });
        this.traceService.setMessages(this.messages());
      },
    });
    // Clear input
    this.userInput = '';
    this.updatedSessionState.set(null);
    this.changeDetectorRef.detectChanges();
  }

  private processErrorMessage(chunkJson: any, index: number) {
    this.storeEvents(chunkJson, chunkJson, index);
    this.insertMessageBeforeLoadingMessage(
        {text: chunkJson.errorMessage, role: 'bot'})
  }

  private processPart(chunkJson: any, part: any, index: number) {
    const renderedContent =
      chunkJson.groundingMetadata?.searchEntryPoint?.renderedContent;

    if (part.text) {
      this.isModelThinkingSubject.next(false);
      const newChunk = part.text;
      if (part.thought) {
        if (newChunk !== this.latestThought) {
          this.storeEvents(part, chunkJson, index);
          let thoughtMessage = {
            role: 'bot',
            text: this.processThoughtText(newChunk),
            thought: true,
            eventId: chunkJson.id
          };

          this.insertMessageBeforeLoadingMessage(thoughtMessage);
        }
        this.latestThought = newChunk;
      } else if (!this.streamingTextMessage) {
        this.streamingTextMessage = {
          role: 'bot',
          text: this.processThoughtText(newChunk),
          thought: part.thought ? true : false,
          eventId: chunkJson.id
        };

        if (renderedContent) {
          this.streamingTextMessage.renderedContent =
            chunkJson.groundingMetadata.searchEntryPoint.renderedContent;
        }

        this.insertMessageBeforeLoadingMessage(this.streamingTextMessage);

        if (!this.useSse) {
          this.storeEvents(part, chunkJson, index);
          this.eventMessageIndexArray[index] = newChunk;
          this.streamingTextMessage = null;
          return;
        }
      } else {
        if (renderedContent) {
          this.streamingTextMessage.renderedContent =
            chunkJson.groundingMetadata.searchEntryPoint.renderedContent;
        }

        if (newChunk == this.streamingTextMessage.text) {
          this.storeEvents(part, chunkJson, index);
          this.eventMessageIndexArray[index] = newChunk;
          this.streamingTextMessage = null;
          return;
        }
        this.streamingTextMessage.text += newChunk;
        this.streamingTextMessageSubject.next(this.streamingTextMessage);
      }
    } else if (!part.thought) {
      this.isModelThinkingSubject.next(false);
      this.storeEvents(part, chunkJson, index);
      this.storeMessage(
        part, chunkJson, index, chunkJson.author === 'user' ? 'user' : 'bot');
    } else {
      this.isModelThinkingSubject.next(true);
    }
  }

  async getUserMessageParts() {
    let parts: any = [];

    if (!!this.userInput.trim()) {
      parts.push({'text': `${this.userInput}`});
    }

    if (this.selectedFiles.length > 0) {
      for (const file of this.selectedFiles) {
        parts.push({
          inlineData: {
            displayName: file.file.name,
            data: await this.readFileAsBytes(file.file),
            mimeType: file.file.type,
          },
        });
      }
    }
    return parts;
  }

  readFileAsBytes(file: File): Promise<ArrayBuffer> {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = (e: any) => {
        const base64Data = e.target.result.split(',')[1];
        resolve(base64Data);
      };
      reader.onerror = reject;
      reader.readAsDataURL(file);  // Read as raw bytes
    });
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
      part: any, e: any, index: number, role: string, invocationIndex?: number,
      additionalIndeces?: any) {
    if (e?.author) {
      this.createAgentIconColorClass(e.author);
    }

    if (e?.longRunningToolIds && e.longRunningToolIds.length > 0) {
      this.getAsyncFunctionsFromParts(e.longRunningToolIds, e.content.parts);
      const func = this.longRunningEvents[0];
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
    if (e?.actions && e.actions.artifactDelta) {
      for (const key in e.actions.artifactDelta) {
        if (e.actions.artifactDelta.hasOwnProperty(key)) {
          this.renderArtifact(key, e.actions.artifactDelta[key]);
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
          additionalIndeces?.finalResponsePartIndex !== undefined ?
          additionalIndeces.finalResponsePartIndex :
          undefined,
      toolUseIndex: additionalIndeces?.toolUseIndex !== undefined ?
          additionalIndeces.toolUseIndex :
          undefined,
    };
    if (part.inlineData) {
      const base64Data =
        this.formatBase64Data(part.inlineData.data, part.inlineData.mimeType);
      message.inlineData = {
        displayName: part.inlineData.displayName,
        data: base64Data,
        mimeType: part.inlineData.mimeType,
      };
      this.eventMessageIndexArray[index] = part.inlineData;
    } else if (part.text) {
      message.text = part.text;
      message.thought = part.thought ? true : false;
      if (e?.groundingMetadata && e.groundingMetadata.searchEntryPoint &&
        e.groundingMetadata.searchEntryPoint.renderedContent) {
        message.renderedContent =
          e.groundingMetadata.searchEntryPoint.renderedContent;
      }
      message.eventId = e?.id;
      this.eventMessageIndexArray[index] = part.text;
    } else if (part.functionCall) {
      message.functionCall = part.functionCall;
      message.eventId = e?.id;
      this.eventMessageIndexArray[index] = part.functionCall;
    } else if (part.functionResponse) {
      message.functionResponse = part.functionResponse;
      message.eventId = e?.id;
      this.eventMessageIndexArray[index] = part.functionResponse;
    } else if (part.executableCode) {
      message.executableCode = part.executableCode;
      this.eventMessageIndexArray[index] = part.executableCode;
    } else if (part.codeExecutionResult) {
      message.codeExecutionResult = part.codeExecutionResult;
      this.eventMessageIndexArray[index] = part.codeExecutionResult;
      if (e.actions && e.actions.artifact_delta) {
        for (const key in e.actions.artifact_delta) {
          if (e.actions.artifact_delta.hasOwnProperty(key)) {
            this.renderArtifact(key, e.actions.artifact_delta[key]);
          }
        }
      }
    }

    if (Object.keys(part).length > 0) {
      this.insertMessageBeforeLoadingMessage(message);
    }
  }

  private insertMessageBeforeLoadingMessage(message: any) {
    this.messages.update(messages => {
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

  private renderArtifact(artifactId: string, versionId: string) {
    // Add a placeholder message for the artifact
    // Feed the placeholder with the artifact data after it's fetched
    let message = {
      role: 'bot',
      inlineData: {
        data: '',
        mimeType: 'image/png',
      },
    };
    this.insertMessageBeforeLoadingMessage(message);

    const currentMessages = this.messages();
    const lastMessage = currentMessages[currentMessages.length - 1];
    const currentIndex = lastMessage?.isLoading ? currentMessages.length - 2 :
                                                  currentMessages.length - 1;

    this.artifactService
      .getArtifactVersion(
        this.userId,
        this.appName,
        this.sessionId,
        artifactId,
        versionId,
      )
      .subscribe((res) => {
        const mimeType = res.inlineData.mimeType;
        const base64Data =
          this.formatBase64Data(res.inlineData.data, mimeType);

        const mediaType = getMediaTypeFromMimetype(mimeType);

        let inlineData = {
          name: this.createDefaultArtifactName(mimeType),
          data: base64Data,
          mimeType: mimeType,
          mediaType,
        };

        this.messages.update(messages => {
          const newMessages = [...messages];
          newMessages[currentIndex] = {
            role: 'bot',
            inlineData,
          };
          return newMessages;
        });

        // To trigger ngOnChanges in the artifact tab component
        this.artifacts = [
          ...this.artifacts,
          {
            id: artifactId,
            data: base64Data,
            mimeType,
            versionId,
            mediaType: getMediaTypeFromMimetype(mimeType),
          },
        ];
      });
  }

  private storeEvents(part: any, e: any, index: number) {
    let title = '';
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
        'role': 'user',
        'parts': [],
      },
    };

    var authConfig = structuredClone(func.args.authConfig);
    authConfig.exchangedAuthCredential.oauth2.authResponseUri = authResponseUrl;
    authConfig.exchangedAuthCredential.oauth2.redirectUri = redirectUri;

    authResponse.functionCallEventId = this.functionCallEventId;
    authResponse.newMessage.parts.push({
      'function_response': {
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
    let index = this.eventMessageIndexArray.length - 1;
    for (const e of response) {
      if (e.content) {
        for (let part of e.content.parts) {
          index += 1;
          this.processPart(e, part, index);
        }
      }
    }
  }

  openDialog(): void {
    const dialogRef = this.dialog.open(PendingEventDialogComponent, {
      width: '600px',
      data: {
        event: this.longRunningEvents[0],
        appName: this.appName,
        userId: this.userId,
        sessionId: this.sessionId,
        functionCallEventId: this.functionCallEventId,
      },
    });

    dialogRef.afterClosed().subscribe((t) => {
      if (t) {
        this.removeFinishedLongRunningEvents(t.events);
        this.processRunSseResponse(t.response);
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
    const key = this.messages()[i].eventId;

    this.sideDrawer()?.open();
    this.showSidePanel = true;
    this.selectedEvent = this.eventData.get(key);
    this.selectedEventIndex = this.getIndexOfKeyInMap(key);

    this.eventService.getEventTrace(this.selectedEvent.id).subscribe((res) => {
      if (res[this.llmRequestKey]) {
        this.llmRequest = JSON.parse(res[this.llmRequestKey]);
      }
      if (res[this.llmResponseKey]) {
        this.llmResponse = JSON.parse(res[this.llmResponseKey]);
      }
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
        const graphSrc = res.dotSrc;
        const svg = await this.graphService.render(graphSrc);
        this.rawSvgString = svg;
        this.renderedEventGraph =
            this.safeValuesService.bypassSecurityTrustHtml(svg);
      });
  }

  ngOnDestroy(): void {
    this.webSocketService.closeConnection();
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
      this.openSnackBar(BIDI_STREAMING_RESTART_WARNING, 'OK')
      return;
    }

    this.isAudioRecording = true;
    const protocol = window.location.protocol === 'https:' ? 'wss' : 'ws';
    this.webSocketService.connect(
      `${protocol}://${URLUtil.getWSServerUrl()}/run_live?app_name=${this.appName}&user_id=${this.userId}&session_id=${this.sessionId}`,
    );
    this.audioService.startRecording();
    this.messages.update(
        messages =>
            [...messages,
             {role: 'user', text: 'Speaking...'},
             {role: 'bot', text: 'Speaking...'},
    ]);
    this.sessionHasUsedBidi.add(this.sessionId);
  }

  stopAudioRecording() {
    this.audioService.stopRecording();
    this.webSocketService.closeConnection();
    this.isAudioRecording = false;
  }

  toggleVideoRecording() {
    this.isVideoRecording ? this.stopVideoRecording() :
      this.startVideoRecording();
  }

  startVideoRecording() {
    if (this.sessionHasUsedBidi.has(this.sessionId)) {
      this.openSnackBar(BIDI_STREAMING_RESTART_WARNING, 'OK')
      return;
    }
    const videoContainer = this.chatPanel()?.videoContainer;
    if (!videoContainer) {
      return;
    }
    this.isVideoRecording = true;
    const protocol = window.location.protocol === 'https:' ? 'wss' : 'ws';
    this.webSocketService.connect(
      `${protocol}://${URLUtil.getWSServerUrl()}/run_live?app_name=${this.appName}&user_id=${this.userId}&session_id=${this.sessionId}`,
    );
    this.videoService.startRecording(videoContainer);
    this.audioService.startRecording();
    this.messages.update(
        messages => [...messages, {role: 'user', text: 'Speaking...'}]);
    this.sessionHasUsedBidi.add(this.sessionId);
  }

  stopVideoRecording() {
    const videoContainer = this.chatPanel()?.videoContainer;
    if (!videoContainer) {
      return;
    }
    this.audioService.stopRecording();
    this.videoService.stopRecording(videoContainer);
    this.webSocketService.closeConnection();
    this.isVideoRecording = false;
  }

  private getAsyncFunctionsFromParts(pendingIds: any[], parts: any[]) {
    for (const part of parts) {
      if (part.functionCall && pendingIds.includes(part.functionCall.id)) {
        this.longRunningEvents.push(part.functionCall);
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

  protected handleShouldShowEvalTab(shouldShow: boolean) {
    this.shouldShowEvalTab.set(shouldShow);
  }

  protected handleReturnToSession(event: boolean) {
    this.sessionTab()?.getSession(this.sessionId);
    this.evalTab()?.resetEvalCase();
    this.isChatMode.set(true);
  }

  protected handleEvalNotInstalled(errorMsg: string) {
    if (errorMsg) {
      this.openSnackBar(errorMsg, 'OK');
    }
  }

  private resetEventsAndMessages() {
    this.eventData.clear();
    this.eventMessageIndexArray = [];
    this.messages.set([]);
    this.artifacts = [];
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
    let index = 0;

    session.events.forEach((event: any) => {
      event.content?.parts?.forEach((part: any) => {
        this.storeMessage(
          part, event, index, event.author === 'user' ? 'user' : 'bot');
        index += 1;
        if (event.author && event.author !== 'user') {
          this.storeEvents(part, event, index);
        }
      });
    });

    this.eventService.getTrace(this.sessionId).subscribe(res => {
      this.traceData = res;
      this.traceService.setEventData(this.eventData);
      this.traceService.setMessages(this.messages());
    });

    this.bottomPanelVisible = false;
    this.changeDetectorRef.detectChanges();
  }

  protected updateWithSelectedEvalCase(evalCase: EvalCase) {
    this.evalCase = evalCase;
    this.isChatMode.set(false);

    this.resetEventsAndMessages();
    let index = 0;
    let invocationIndex = 0;

    for (const invocation of evalCase.conversation) {
      if (invocation.userContent?.parts) {
        for (const part of invocation.userContent.parts) {
          this.storeMessage(part, null, index, 'user');
          index++;
        }
      }

      if (invocation.intermediateData?.toolUses) {
        let toolUseIndex = 0;
        for (const toolUse of invocation.intermediateData.toolUses) {
          const functionCallPart = {
            functionCall: {name: toolUse.name, args: toolUse.args}
          };
          this.storeMessage(
              functionCallPart, null, index, 'bot', invocationIndex,
              {toolUseIndex});
          index++;
          toolUseIndex++;

          const functionResponsePart = { functionResponse: { name: toolUse.name } };
          this.storeMessage(functionResponsePart, null, index, 'bot');
          index++;
        }
      }

      if (invocation.finalResponse?.parts) {
        let finalResponsePartIndex = 0;
        for (const part of invocation.finalResponse.parts) {
          this.storeMessage(
              part, null, index, 'bot', invocationIndex,
              {finalResponsePartIndex});
          index++;
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
        jsonContent: message.functionCall.args
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
          this.resetEditEvalCaseVars()
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
    this.messages.update(messages => messages.filter((m, i) => i !== index));

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
        this.openSnackBar('Eval case deleted', 'OK')
      }
    });
  }

  protected updateSessionState(session: Session) {
    this.currentSessionState = session.state;
  }

  onNewSessionClick() {
    this.createSession();
    this.eventData.clear();
    this.eventMessageIndexArray = [];
    this.messages.set([]);
    this.artifacts = [];
    this.traceData = [];
    this.bottomPanelVisible = false;

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
    this.useSse = !this.useSse;
  }

  selectEvent(key: string) {
    this.selectedEvent = this.eventData.get(key);
    this.selectedEventIndex = this.getIndexOfKeyInMap(key);
    this.eventService.getEventTrace(this.selectedEvent.id).subscribe((res) => {
      if (res[this.llmRequestKey]) {
        this.llmRequest = JSON.parse(res[this.llmRequestKey]);
      }
      if (res[this.llmResponseKey]) {
        this.llmResponse = JSON.parse(res[this.llmResponseKey]);
      }
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
              const nextSession = this.sessionTab()?.refreshSession(session);
              if (nextSession) {
                this.sessionTab()?.getSession(nextSession.id);
              } else {
                window.location.reload();
              }
            });
      }
    });
  }

  private syncSelectedAppFromUrl() {
    combineLatest([
      this.router.events.pipe(
        filter((e) => e instanceof NavigationEnd),
        map(() => this.activatedRoute.snapshot.queryParams),
      ),
      this.apps$
    ]).subscribe(([params, apps]) => {
      if (apps && apps.length) {
        const app = params['app'];
        if (app && apps.includes(app)) {
          this.selectedAppControl.setValue(app);
        } else if (app) {
          this.openSnackBar(`Agent '${app}' not found`, 'OK');
        }
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
          queryParams: { 'app': app },
          queryParamsHandling: 'merge',
        });
      });
  }

  private updateSelectedSessionUrl() {
    const url = this.router
                    .createUrlTree([], {
                      queryParams: {'session': this.sessionId},
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
      }
    }
  }

  closeSelectedEvent() {
    this.selectedEvent = undefined;
    this.selectedEventIndex = undefined;
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

  openSnackBar(message: string, action: string) {
    this._snackBar.open(message, action);
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
      data:
          {dialogHeader: 'Update state', jsonContent: this.currentSessionState},
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
    this.traceService.setHoveredMessages(undefined, "")
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
            const sessionData = JSON.parse(e.target.result as string) as Session;
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
                  this.sessionTab()?.refreshSession();
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
