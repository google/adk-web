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

import {HttpErrorResponse} from '@angular/common/http';
import {AfterViewChecked, AfterViewInit, Component, ElementRef, inject, OnDestroy, OnInit, signal, ViewChild, WritableSignal,} from '@angular/core';
import {FormControl} from '@angular/forms';
import {MatDialog, MatDialogModule} from '@angular/material/dialog';
import {MatPaginatorIntl} from '@angular/material/paginator';
import {MatSidenav} from '@angular/material/sidenav';
import {MatSnackBar} from '@angular/material/snack-bar';
import {DomSanitizer, SafeHtml} from '@angular/platform-browser';
import {ActivatedRoute, NavigationEnd, Router} from '@angular/router';
import {instance} from '@viz-js/viz';
import {catchError, distinctUntilChanged, filter, forkJoin, map, Observable, of, shareReplay, switchMap, take, tap,} from 'rxjs';

import {URLUtil} from '../../../utils/url-util';
import {AgentRunRequest} from '../../core/models/AgentRunRequest';
import {Session} from '../../core/models/Session';
import {AgentService} from '../../core/services/agent.service';
import {ArtifactService} from '../../core/services/artifact.service';
import {AudioService} from '../../core/services/audio.service';
import {EventService} from '../../core/services/event.service';
import {FileStorageService} from '../../core/services/file-storage.service';
import {SessionService} from '../../core/services/session.service';
import {VideoService} from '../../core/services/video.service';
import {WebSocketService} from '../../core/services/websocket.service';
import {EvalTabComponent} from '../eval-tab/eval-tab.component';
import {EventTabComponent} from '../event-tab/event-tab.component';
import {PendingEventDialogComponent} from '../pending-event-dialog/pending-event-dialog.component';
import {DeleteSessionDialogComponent, DeleteSessionDialogData,} from '../session-tab/delete-session-dialog/delete-session-dialog.component';
import {SessionTabComponent} from '../session-tab/session-tab.component';
import {ViewImageDialogComponent} from '../view-image-dialog/view-image-dialog.component';

function fixBase64String(base64: string): string {
  // Replace URL-safe characters if they exist
  base64 = base64.replace(/-/g, '+').replace(/_/g, '/');

  // Fix base64 padding
  while (base64.length % 4 !== 0) {
    base64 += '=';
  }

  return base64;
}

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

@Component({
  selector: 'app-chat',
  templateUrl: './chat.component.html',
  styleUrl: './chat.component.scss',
  standalone: false,
  providers: [{provide: MatPaginatorIntl, useClass: CustomPaginatorIntl}],
})
export class ChatComponent implements OnInit, AfterViewInit, OnDestroy,
                                      AfterViewChecked {
  @ViewChild('videoContainer', {read: ElementRef}) videoContainer!: ElementRef;
  @ViewChild('sidenav') sidenav!: MatSidenav;
  @ViewChild(EventTabComponent) eventTabComponent!: EventTabComponent;
  @ViewChild(SessionTabComponent) sessionTab!: SessionTabComponent;
  @ViewChild(EvalTabComponent) evalTab!: EvalTabComponent;
  @ViewChild('autoScroll') private scrollContainer!: ElementRef;
  private _snackBar = inject(MatSnackBar);
  shouldShowEvalTab = signal(true);
  enableSseIndicator = signal(false);
  videoElement!: HTMLVideoElement;
  currentMessage = '';
  messages: any[] = [];
  lastTextChunk: string = '';
  streamingTextMessage: any|null = null;
  artifacts: any[] = [];
  userInput: string = '';
  userId = 'user';
  appName = '';
  sessionId = ``;
  isAudioRecording = false;
  isVideoRecording = false;
  longRunningEvents: any[] = [];
  functionCallEventId = '';
  redirectUri = URLUtil.getBaseUrlWithoutPath();
  showSidePanel = true;
  useSse = false;
  currentSessionState = {};

  eventData = new Map<string, any>();
  traceData: any[] = [];
  eventMessageIndexArray: any[] = [];
  renderedEventGraph: SafeHtml|undefined;
  rawSvgString: string|null = null;

  selectedEvent: any = undefined;
  selectedEventIndex: any = undefined;
  llmRequest: any = undefined;
  llmResponse: any = undefined;
  llmRequestKey = 'gcp.vertex.agent.llm_request';
  llmResponseKey = 'gcp.vertex.agent.llm_response';

  selectedFiles: {file: File; url: string; fileId?: string}[] = [];
  private previousMessageCount = 0;

  // Sync query params with value from agent picker.
  private readonly router = inject(Router);
  private readonly activatedRoute = inject(ActivatedRoute);
  protected readonly selectedAppControl = new FormControl<string>('', {
    nonNullable: true,
  });

  // Load apps
  private readonly agentService = inject(AgentService);
  protected isLoadingApps: WritableSignal<boolean> = signal(false);
  protected loadingError: WritableSignal<string> = signal('');
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
            relativeTo: this.route,
            queryParams: {app: app[0]},
          });
        }
      }),
      shareReplay(),
  );

  constructor(
      private sanitizer: DomSanitizer,
      private sesisonService: SessionService,
      private artifactService: ArtifactService,
      private audioService: AudioService,
      private webSocketService: WebSocketService,
      private videoService: VideoService,
      private dialog: MatDialog,
      private eventService: EventService,
      private sessionService: SessionService,
      private route: ActivatedRoute,
      private fileStorageService: FileStorageService,
  ) {}

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
      window.opener?.postMessage({authResponseUrl}, window.origin);
      // Close the popup
      window.close();
    }

    this.agentService.getApp().subscribe((app) => {
      this.appName = app;
    });
  }

  ngAfterViewInit() {
    this.showSidePanel = true;
    this.sidenav.open();
  }

  ngAfterViewChecked() {
    if (this.messages.length !== this.previousMessageCount) {
      this.scrollContainer.nativeElement.scrollTop =
          this.scrollContainer.nativeElement.scrollHeight;
      this.previousMessageCount = this.messages.length;
    }
  }

  selectApp(appName: string) {
    if (appName != this.appName) {
      this.agentService.setApp(appName);
      this.createSession();
      this.eventData = new Map<string, any>();
      this.eventMessageIndexArray = [];
      this.messages = [];
      this.artifacts = [];
      this.userInput = '';
      this.longRunningEvents = [];
    }
  }

  createSession() {
    this.sesisonService.createSession(this.userId, this.appName)
        .subscribe((res) => {
          this.currentSessionState = res.state;
          this.sessionId = res.id;
          this.sessionTab.refreshSession();
        });
  }

  async sendMessage(event: Event) {
    event.preventDefault();
    if (!this.userInput.trim() && this.selectedFiles.length === 0) return;

    // Add user message
    if (this.selectedFiles.length > 0) {
      const messageIndex = this.messages.length;
      
      const storeFileObservables = this.selectedFiles.map(fileObj => {
        return this.fileStorageService.storeFile(fileObj.file, this.sessionId, messageIndex).pipe(
          map(fileId => {
            return {
              fileId: fileId,
              file: fileObj.file,
              url: fileObj.url
            };
          })
        );
      });

      forkJoin(storeFileObservables).subscribe(storedFiles => {
        const messageAttachments = storedFiles.map(storedFile => {
          const attachment = {
            fileId: storedFile.fileId,
            file: storedFile.file,
            url: storedFile.url,
            name: storedFile.file.name,
            type: storedFile.file.type,
            size: storedFile.file.size,
            messageIndex: messageIndex
          };
          return attachment;
        });

        this.messages.push({
          role: 'user',
          text: this.userInput.trim() || '',
          attachments: messageAttachments,
          messageIndex: messageIndex
        });
        
        this.sendMessageToAgent();
      });
    } else {
      this.messages.push({role: 'user', text: this.userInput});
      this.sendMessageToAgent();
    }
  }

  private async sendMessageToAgent() {
    const req: AgentRunRequest = {
      appName: this.appName,
      userId: this.userId,
      sessionId: this.sessionId,
      newMessage: {
        'role': 'user',
        'parts': await this.getUserMessageParts(),
      },
      streaming: this.useSse,
    };
    this.selectedFiles = [];
    let index = this.eventMessageIndexArray.length - 1;
    this.streamingTextMessage = null;
    this.agentService.runSse(req).subscribe({
      next: async (chunk) => {
        if (chunk.startsWith('{"error"')) {
          this.openSnackBar(chunk, 'OK');
          return;
        }
        const chunkJson = JSON.parse(chunk);
        if (chunkJson.error) {
          this.openSnackBar(chunkJson.error, 'OK');
          return;
        }
        if (chunkJson.content) {
          for (let part of chunkJson.content.parts) {
            index += 1;
            this.processPart(chunkJson, part, index);
          }
        }
      },
      error: (err) => console.error('SSE error:', err),
      complete: () => {
        this.streamingTextMessage = null;
        this.sessionTab.reloadSession(this.sessionId);
        this.eventService.getTrace(this.sessionId)
            .pipe(catchError((error) => {
              if (error.status === 404) {
                return of(null);
              }
              return of([]);
            }))
            .subscribe(res => {this.traceData = res})
      },
    });
    // Clear input
    this.userInput = '';
  }

  private processPart(chunkJson: any, part: any, index: number) {
    if (part.text) {
      const newChunk = part.text;
      if (!this.streamingTextMessage) {
        this.streamingTextMessage = {
          role: 'bot',
          text: this.processThoughtText(newChunk),
          thought: part.thought ? true : false,
        };

        if (chunkJson.groundingMetadata &&
            chunkJson.groundingMetadata.searchEntryPoint &&
            chunkJson.groundingMetadata.searchEntryPoint.renderedContent) {
          this.streamingTextMessage.renderedContent =
              chunkJson.groundingMetadata.searchEntryPoint.renderedContent;
        }

        this.messages.push(this.streamingTextMessage);
        if (!this.useSse) {
          this.storeEvents(part, chunkJson, index);
          this.eventMessageIndexArray[index] = newChunk;
          this.streamingTextMessage = null;
          return;
        }
      } else {
        if (newChunk == this.streamingTextMessage.text) {
          this.storeEvents(part, chunkJson, index);
          this.eventMessageIndexArray[index] = newChunk;
          this.streamingTextMessage = null;
          return;
        }
        this.streamingTextMessage.text += newChunk;
      }
    } else {
      this.storeEvents(part, chunkJson, index);
      this.storeMessage(part, chunkJson, index);
    }
  }

  async getUserMessageParts() {
    let parts: any = [{'text': `${this.userInput}`}];
    if (this.selectedFiles.length > 0) {
      for (const file of this.selectedFiles) {
        parts.push({
          inlineData: {
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

  private storeMessage(part: any, e: any, index: number) {
    if (e.longRunningToolIds && e.longRunningToolIds.length > 0) {
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
    if (e.actions && e.actions.artifactDelta) {
      for (const key in e.actions.artifactDelta) {
        if (e.actions.artifactDelta.hasOwnProperty(key)) {
          this.renderArtifact(key, e.actions.artifactDelta[key]);
        }
      }
    }
    if (part.text) {
      let message: any = {
        role: e.author === 'user' ? 'user' : 'bot',
        text: part.text,
        evalStatus: e.evalStatus,
        actualInvocationToolUses: e.actualInvocationToolUses,
        expectedInvocationToolUses: e.expectedInvocationToolUses,
      };
      if (e.groundingMetadata && e.groundingMetadata.searchEntryPoint &&
          e.groundingMetadata.searchEntryPoint.renderedContent) {
        message.renderedContent =
            e.groundingMetadata.searchEntryPoint.renderedContent;
      }
      this.messages.push(message);
      this.eventMessageIndexArray[index] = part.text;
    } else if (part.functionCall) {
      this.messages.push({
        role: e.author === 'user' ? 'user' : 'bot',
        functionCall: part.functionCall,
        eventId: e.id,
        evalStatus: e.evalStatus,
        actualInvocationToolUses: e.actualInvocationToolUses,
        expectedInvocationToolUses: e.expectedInvocationToolUses,
      });
      this.eventMessageIndexArray[index] = part.functionCall;
    } else if (part.functionResponse) {
      this.messages.push({
        role: e.author === 'user' ? 'user' : 'bot',
        functionResponse: part.functionResponse,
        eventId: e.id,
        evalStatus: e.evalStatus,
        actualInvocationToolUses: e.actualInvocationToolUses,
        expectedInvocationToolUses: e.expectedInvocationToolUses,
      });

      this.eventMessageIndexArray[index] = part.functionResponse;
    } else if (part.executableCode) {
      this.messages.push({
        role: e.author === 'user' ? 'user' : 'bot',
        executableCode: part.executableCode,
        evalStatus: e.evalStatus,
        actualInvocationToolUses: e.actualInvocationToolUses,
        expectedInvocationToolUses: e.expectedInvocationToolUses,
      });
      this.eventMessageIndexArray[index] = part.executableCode;
    } else if (part.codeExecutionResult) {
      this.messages.push({
        role: e.author === 'user' ? 'user' : 'bot',
        codeExecutionResult: part.codeExecutionResult,
        evalStatus: e.evalStatus,
        actualInvocationToolUses: e.actualInvocationToolUses,
        expectedInvocationToolUses: e.expectedInvocationToolUses,
      });
      this.eventMessageIndexArray[index] = part.codeExecutionResult;
      if (e.actions && e.actions.artifact_delta) {
        for (const key in e.actions.artifact_delta) {
          if (e.actions.artifact_delta.hasOwnProperty(key)) {
            this.renderArtifact(key, e.actions.artifact_delta[key]);
          }
        }
      }
    }
  }

  private renderArtifact(artifactId: string, versionId: string) {
    // Add a placeholder message for the artifact
    // Feed the placeholder with the artifact data after it's fetched
    this.messages.push({
      role: 'bot',
      inlineData: {
        data: '',
        mimeType: 'image/png',
      },
    });

    const currentIndex = this.messages.length - 1;

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

          const fixedBase64Data = fixBase64String(res.inlineData.data);

          const base64Data = `data:${mimeType};base64,${fixedBase64Data}`;

          this.messages[currentIndex] = {
            role: 'bot',
            inlineData: {
              data: base64Data,
              mimeType: mimeType,
            },
          };

          // To trigger ngOnChanges in the artifact tab component
          this.artifacts = [
            ...this.artifacts,
            {
              id: artifactId,
              data: base64Data,
              mimeType,
              versionId,
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
    this.agentService.run(authResponse).subscribe((res) => {
      let index = this.eventMessageIndexArray.length - 1;
      for (const e of res) {
        if (e.content) {
          for (let part of e.content.parts) {
            index += 1;
            this.processPart(e, part, index);
          }
        }
      }
    });
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
        this.messages.push({
          role: 'bot',
          text: t.text,
        });
      }
    });
  }

  removeFinishedLongRunningEvents(finishedEvents: any[]) {
    const idsToExclude = new Set(finishedEvents.map((obj: any) => obj.id));
    this.longRunningEvents =
        this.longRunningEvents.filter(obj => !idsToExclude.has(obj.id));
  }

  clickEvent(i: number) {
    const key = this.messages[i].eventId;


    this.sidenav.open();
    this.showSidePanel = true;
    this.selectedEvent = this.eventData.get(key);
    this.selectedEventIndex = this.getIndexOfKeyInMap(key);

    this.eventService.getEventTrace(this.selectedEvent.id).subscribe((res) => {
      this.llmRequest = JSON.parse(res[this.llmRequestKey]);
      this.llmResponse = JSON.parse(res[this.llmResponseKey]);
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
          const viz = await instance();
          const svg = viz.renderString(graphSrc, {
            format: 'svg',
            engine: 'dot',
          });
          this.rawSvgString = svg;
          this.renderedEventGraph = this.sanitizer.bypassSecurityTrustHtml(svg);
        });
  }

  userMessagesLength(i: number) {
    return this.messages.slice(0, i).filter((m) => m.role == 'user').length;
  }

  ngOnDestroy(): void {
    this.webSocketService.closeConnection();
  }

  toggleAudioRecording() {
    this.isAudioRecording ? this.stopAudioRecording() :
                            this.startAudioRecording();
    this.isAudioRecording = !this.isAudioRecording;
  }

  startAudioRecording() {
    const protocol = window.location.protocol === 'https:' ? 'wss' : 'ws';
    this.webSocketService.connect(
        `${protocol}://${URLUtil.getWSServerUrl()}/run_live?app_name=${
            this.appName}&user_id=${this.userId}&session_id=${this.sessionId}`,
    );
    this.audioService.startRecording();
    this.messages.push({role: 'user', text: 'Speaking...'});
    this.messages.push({role: 'bot', text: 'Speaking...'});
  }

  stopAudioRecording() {
    this.audioService.stopRecording();
    this.webSocketService.closeConnection();
  }

  toggleVideoRecording() {
    this.isVideoRecording ? this.stopVideoRecording() :
                            this.startVideoRecording();
    this.isVideoRecording = !this.isVideoRecording;
  }

  startVideoRecording() {
    const protocol = window.location.protocol === 'https:' ? 'wss' : 'ws';
    this.webSocketService.connect(
        `${protocol}://${URLUtil.getWSServerUrl()}/run_live?app_name=${
            this.appName}&user_id=${this.userId}&session_id=${this.sessionId}`,
    );
    this.videoService.startRecording(this.videoContainer);
    this.audioService.startRecording();
    this.messages.push({role: 'user', text: 'Speaking...'});
  }

  stopVideoRecording() {
    this.audioService.stopRecording();
    this.videoService.stopRecording(this.videoContainer);
    this.webSocketService.closeConnection();
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
      const popup = window.open(url, 'oauthPopup', 'width=600,height=700');

      if (!popup) {
        reject('Popup blocked!');
        return;
      }

      // Listen for messages from the popup
      window.addEventListener(
          'message',
          (event) => {
            if (event.origin !== window.location.origin) {
              return;  // Ignore messages from unknown sources
            }
            const {authResponseUrl} = event.data;
            if (authResponseUrl) {
              resolve(authResponseUrl);
            } else {
              reject('OAuth failed');
            }
          },
          {once: true},
      );
    });
  }

  toggleSidePanel() {
    this.showSidePanel = !this.showSidePanel;
  }

  protected handleShouldShowEvalTab(shouldShow: boolean) {
    this.shouldShowEvalTab.set(shouldShow);
  }

  protected updateWithSelectedSession(session: Session) {
    if (!session || !session.id || !session.events || !session.state) {
      return;
    }

    this.sessionId = session.id;
    this.currentSessionState = session.state;

    // reset event and message data
    this.eventData.clear();
    this.eventMessageIndexArray = [];
    this.messages = [];
    this.artifacts = [];
    
    let index = 0;

    session.events.forEach((event: any) => {
      event.content.parts.forEach((part: any) => {
        const currentIndex = this.messages.length;
        this.storeMessage(part, event, index);
        
        if (this.messages.length > currentIndex) {
          this.messages[this.messages.length - 1].messageIndex = currentIndex;
        }
        
        index += 1;
        if (event.author && event.author !== 'user') {
          this.storeEvents(part, event, index);
        }
      });
    });
    
    this.loadSessionFiles(session.id);
    this.eventService.getTrace(this.sessionId).subscribe(res => {
      this.traceData = res;
    });
  }

  protected updateSessionState(session: Session) {
    this.currentSessionState = session.state;
  }

  onNewSessionClick() {
    this.createSession();
    this.eventData.clear();
    this.eventMessageIndexArray = [];
    this.messages = [];
    this.artifacts = [];
    this.selectedFiles = [];

    // Close eval history if opened
    if (!!this.evalTab.showEvalHistory) {
      this.evalTab.toggleEvalHistoryButton();
    }
  }

  onFileSelect(event: Event) {
    const input = event.target as HTMLInputElement;
    if (input.files) {
      for (let i = 0; i < input.files.length; i++) {
        const file = input.files[i];
        const url = URL.createObjectURL(file);
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

  selectEvent(key: string) {
    this.selectedEvent = this.eventData.get(key);
    this.selectedEventIndex = this.getIndexOfKeyInMap(key);
    this.eventService.getEventTrace(this.selectedEvent.id).subscribe((res) => {
      this.llmRequest = JSON.parse(res[this.llmRequestKey]);
      this.llmResponse = JSON.parse(res[this.llmResponseKey]);
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
          const viz = await instance();
          const svg = viz.renderString(graphSrc, {
            format: 'svg',
            engine: 'dot',
          });
          this.rawSvgString = svg;
          this.renderedEventGraph = this.sanitizer.bypassSecurityTrustHtml(svg);
        });
  }

  protected deleteSession(session: string) {
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

    dialogRef.afterClosed().subscribe((result) => {
      if (result) {
        this.fileStorageService.deleteSessionFiles(session).subscribe(
          () => {
            this.sessionService.deleteSession(this.userId, this.appName, session)
                .subscribe(() => {
                  const nextSession = this.sessionTab.refreshSession(session);
                  if (nextSession) {
                    this.sessionTab.getSession(nextSession.id);
                  } else {
                    window.location.reload();
                  }
                });
          },
          error => {
            console.error('Error deleting files, proceeding with session deletion anyway:', error);
            this.sessionService.deleteSession(this.userId, this.appName, session)
                .subscribe((res) => {
                  const nextSession = this.sessionTab.refreshSession(session);
                  if (nextSession) {
                    this.sessionTab.getSession(nextSession.id);
                  } else {
                    window.location.reload();
                  }
                });
          }
        );
      }
    });
  }

  private syncSelectedAppFromUrl() {
    this.router.events
        .pipe(
            filter((e) => e instanceof NavigationEnd),
            map(() => this.activatedRoute.snapshot.queryParams),
            )
        .subscribe((params) => {
          const app = params['app'];
          if (app) {
            this.selectedAppControl.setValue(app);
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
            queryParams: {'app': app},
            queryParamsHandling: 'merge',
          });
        });
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
    window.open(url, '_blank');
  }

  renderGooglerSearch(content: string) {
    return this.sanitizer.bypassSecurityTrustHtml(content);
  }

  openViewImageDialog() {
    const dialogRef = this.dialog.open(ViewImageDialogComponent, {
      width: '1280px',
      data: {
        imageData: this.rawSvgString,
      },
    });
  }

  /**
   * Creates a File object from a data URL and metadata stored in IndexedDB
   * This handles large files more efficiently by chunking the data
   */
  private createFileFromDataURL(dataURL: string, fileName: string, fileType: string, 
                               fileSize?: number, lastModified?: number): File {
    try {
      const base64String = dataURL.split(',')[1];
      const byteCharacters = atob(base64String);
      const byteArrays = [];
      
      const chunkSize = 1024 * 1024; // 1MB chunks for better memory handling
      
      for (let offset = 0; offset < byteCharacters.length; offset += chunkSize) {
        const slice = byteCharacters.slice(offset, Math.min(offset + chunkSize, byteCharacters.length));
        const byteNumbers = new Array(slice.length);
        for (let i = 0; i < slice.length; i++) {
          byteNumbers[i] = slice.charCodeAt(i);
        }
        const byteArray = new Uint8Array(byteNumbers);
        byteArrays.push(byteArray);
      }
      
      const blob = new Blob(byteArrays, { type: fileType });
      
      return new File([blob], fileName, { 
        type: fileType,
        lastModified: lastModified || Date.now()
      });
    } catch (error) {
      console.error('Error creating File from data URL:', error);
      return new File([], fileName, { type: fileType });
    }
  }

  private loadSessionFiles(sessionId: string) {
    this.fileStorageService.getSessionFiles(sessionId).subscribe(files => {
      if (files.length === 0) {
        return; // No files to process
      }
      
      // Wait a bit for messages to be populated from the server response
      setTimeout(() => {
        const filesByMessageIndex = new Map<number, any[]>();
        files.forEach(file => {
          if (file.messageIndex !== undefined) {
            if (!filesByMessageIndex.has(file.messageIndex)) {
              filesByMessageIndex.set(file.messageIndex, []);
            }
            filesByMessageIndex.get(file.messageIndex)?.push(file);
          } else {
            console.warn(`File ${file.id} has no messageIndex`);
          }
        });
        
        for (const [msgIndex, filesForIndex] of filesByMessageIndex.entries()) {
          let messageExists = false;
          for (let i = 0; i < this.messages.length; i++) {
            if (this.messages[i].messageIndex === msgIndex) {
              messageExists = true;
              break;
            }
          }
          
          if (!messageExists && filesForIndex.length > 0) {
            // Create a new user message with these attachments
            const newMessage = {
              role: 'user',
              text: '',
              messageIndex: msgIndex,
              attachments: []
            };
            
            // Insert the message at the correct position
            let insertPosition = 0;
            for (let i = 0; i < this.messages.length; i++) {
              if (this.messages[i].messageIndex !== undefined && 
                  this.messages[i].messageIndex < msgIndex) {
                insertPosition = i + 1;
              }
            }
            
            this.messages.splice(insertPosition, 0, newMessage);
          }
        }
        
        for (let i = 0; i < this.messages.length; i++) {
          const message = this.messages[i];
          const msgIndex = message.messageIndex !== undefined ? message.messageIndex : i;
          
          // Skip bot messages - attachments should only be associated with user messages
          if (message.role === 'bot') {
            continue;
          }
          
          const filesForThisMessage = filesByMessageIndex.get(msgIndex) || [];
          
          if (filesForThisMessage.length > 0) {
            if (!message.attachments) {
              message.attachments = [];
            }
            
            for (const file of filesForThisMessage) {
              const existingAttachment = message.attachments.find((att: any) => att.fileId === file.id);
              if (!existingAttachment) {
                try {
                  const reconstructedFile = this.createFileFromDataURL(
                    file.data, 
                    file.name, 
                    file.type,
                    file.size,
                    file.lastModified
                  );
                  
                  message.attachments.push({
                    fileId: file.id,
                    url: file.data,
                    type: file.type,
                    name: file.name,
                    size: file.size,
                    lastModified: file.lastModified,
                    file: reconstructedFile,
                    messageIndex: msgIndex
                  });
                } catch (error) {
                  console.error('Error reconstructing file:', error);
                }
              }
            }
          }
        }
      }, 500); // Wait for messages to be populated from server data
    });
  }
}