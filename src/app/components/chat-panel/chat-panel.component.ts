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

import {TextFieldModule} from '@angular/cdk/text-field';
import {CommonModule, NgClass} from '@angular/common';
import {AfterViewInit, Component, DestroyRef, effect, ElementRef, EventEmitter, HostListener, inject, input, Input, OnChanges, Output, signal, SimpleChanges, Type, ViewChild} from '@angular/core';
import {takeUntilDestroyed, toSignal} from '@angular/core/rxjs-interop';
import {FormsModule} from '@angular/forms';
import {MatButtonModule} from '@angular/material/button';
import {MatCardModule} from '@angular/material/card';
import {MatFormFieldModule} from '@angular/material/form-field';
import {MatIconModule} from '@angular/material/icon';
import {MatInputModule} from '@angular/material/input';
import {MatMenuModule} from '@angular/material/menu';
import {MatProgressBarModule} from '@angular/material/progress-bar';
import {MatProgressSpinnerModule} from '@angular/material/progress-spinner';
import {MatTooltipModule} from '@angular/material/tooltip';
import {DomSanitizer, SafeHtml} from '@angular/platform-browser';
import {NgxJsonViewerModule} from 'ngx-json-viewer';
import {EMPTY, merge, NEVER, of, Subject} from 'rxjs';
import {catchError, filter, first, switchMap, tap} from 'rxjs/operators';

import {JsonTooltipDirective} from '../../directives/html-tooltip.directive';

import type {EvalCase} from '../../core/models/Eval';
import {FunctionCall, FunctionResponse} from '../../core/models/types';
import {AGENT_SERVICE} from '../../core/services/interfaces/agent';
import {FEATURE_FLAG_SERVICE} from '../../core/services/interfaces/feature-flag';
import {SESSION_SERVICE} from '../../core/services/interfaces/session';
import {STRING_TO_COLOR_SERVICE} from '../../core/services/interfaces/string-to-color';
import {ListResponse} from '../../core/services/interfaces/types';
import {UI_STATE_SERVICE} from '../../core/services/interfaces/ui-state';
import {MediaType,} from '../artifact-tab/artifact-tab.component';
import {A2uiCanvasComponent} from '../a2ui-canvas/a2ui-canvas.component';
import {AudioPlayerComponent} from '../audio-player/audio-player.component';
import {MARKDOWN_COMPONENT, MarkdownComponentInterface} from '../markdown/markdown.component.interface';
import {MessageFeedbackComponent} from '../message-feedback/message-feedback.component';
import {ComputerActionComponent} from '../computer-action/computer-action.component';
import {ChatPanelMessagesInjectionToken} from './chat-panel.component.i18n';
import {isComputerUseResponse, isVisibleComputerUseClick} from '../../core/models/ComputerUse';

const ROOT_AGENT = 'root_agent';

@Component({
  selector: 'app-chat-panel',
  templateUrl: './chat-panel.component.html',
  styleUrl: './chat-panel.component.scss',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    MatIconModule,
    MatCardModule,
    MatProgressBarModule,
    MatButtonModule,
    MatInputModule,
    TextFieldModule,
    MatFormFieldModule,
    MatMenuModule,
    MatProgressSpinnerModule,
    NgxJsonViewerModule,
    A2uiCanvasComponent,
    AudioPlayerComponent,
    MessageFeedbackComponent,
    MatTooltipModule,
    NgClass,
    JsonTooltipDirective,
    ComputerActionComponent,
  ],
})
export class ChatPanelComponent implements OnChanges, AfterViewInit {
  @Input() appName: string = '';
  sessionName = input<string>('');
  @Input() messages: any[] = [];
  @Input() isChatMode: boolean = true;
  @Input() evalCase: EvalCase|null = null;
  @Input() isEvalEditMode: boolean = false;
  @Input() isEvalCaseEditing: boolean = false;
  @Input() isEditFunctionArgsEnabled: boolean = false;
  @Input() userInput: string = '';
  @Input() userEditEvalCaseMessage: string = '';
  @Input() selectedFiles: {file: File; url: string}[] = [];
  @Input() updatedSessionState: any|null = null;
  @Input() eventData = new Map<string, any>();
  @Input() selectedEvent: any = undefined;
  @Input() isAudioRecording: boolean = false;
  @Input() isVideoRecording: boolean = false;
  @Input() hoveredEventMessageIndices: number[] = [];

  @Output() readonly userInputChange = new EventEmitter<string>();
  @Output() readonly userEditEvalCaseMessageChange = new EventEmitter<string>();
  @Output() readonly clickEvent = new EventEmitter<number>();
  @Output()
  readonly handleKeydown =
      new EventEmitter<{event: KeyboardEvent, message: any}>();
  @Output() readonly cancelEditMessage = new EventEmitter<any>();
  @Output() readonly saveEditMessage = new EventEmitter<any>();
  @Output() readonly openViewImageDialog = new EventEmitter<string>();
  @Output()
  readonly openBase64InNewTab =
      new EventEmitter<{data: string, mimeType: string}>();
  @Output() readonly editEvalCaseMessage = new EventEmitter<any>();
  @Output()
  readonly deleteEvalCaseMessage =
      new EventEmitter<{message: any, index: number}>();
  @Output() readonly editFunctionArgs = new EventEmitter<any>();
  @Output() readonly fileSelect = new EventEmitter<Event>();
  @Output() readonly removeFile = new EventEmitter<number>();
  @Output() readonly removeStateUpdate = new EventEmitter<void>();
  @Output() readonly sendMessage = new EventEmitter<Event>();
  @Output() readonly updateState = new EventEmitter<void>();
  @Output() readonly toggleAudioRecording = new EventEmitter<void>();
  @Output() readonly toggleVideoRecording = new EventEmitter<void>();

  @ViewChild('videoContainer', {read: ElementRef}) videoContainer!: ElementRef;
  @ViewChild('autoScroll') scrollContainer!: ElementRef;
  @ViewChild('messageTextarea') public textarea: ElementRef|undefined;
  scrollInterrupted = false;
  private scrollHeight = 0;
  private lastMessageRef: any = null;
  private nextPageToken = '';
  protected readonly i18n = inject(ChatPanelMessagesInjectionToken);
  protected readonly uiStateService = inject(UI_STATE_SERVICE);
  private readonly stringToColorService = inject(STRING_TO_COLOR_SERVICE);
  readonly markdownComponent: Type<MarkdownComponentInterface> = inject(
      MARKDOWN_COMPONENT,
  );
  protected readonly featureFlagService = inject(FEATURE_FLAG_SERVICE);
  private readonly agentService = inject(AGENT_SERVICE);
  private readonly sessionService = inject(SESSION_SERVICE);
  private readonly destroyRef = inject(DestroyRef);
  readonly MediaType = MediaType;
  readonly JSON = JSON;

  readonly isMessageFileUploadEnabledObs =
      this.featureFlagService.isMessageFileUploadEnabled();
  readonly isManualStateUpdateEnabledObs =
      this.featureFlagService.isManualStateUpdateEnabled();
  readonly isBidiStreamingEnabledObs =
      this.featureFlagService.isBidiStreamingEnabled();
  readonly canEditSession = signal(true);
  readonly isUserFeedbackEnabled =
      toSignal(this.featureFlagService.isFeedbackServiceEnabled());
  readonly isLoadingAgentResponse =
      toSignal(this.agentService.getLoadingState());

  protected readonly onScroll = new Subject<Event>();

  constructor(private sanitizer: DomSanitizer) {
    effect(() => {
      const sessionName = this.sessionName();
      if (sessionName) {
        this.nextPageToken = '';
        this.uiStateService
            .lazyLoadMessages(sessionName, {
              pageSize: 100,
              pageToken: this.nextPageToken,
            })
            .pipe(first())
            .subscribe();
      }
    });
  }

  ngOnInit() {
    this.featureFlagService.isInfinityMessageScrollingEnabled()
        .pipe(
            first(),
            filter((enabled) => enabled),
            switchMap(
                () => merge(
                    this.uiStateService.onNewMessagesLoaded().pipe(
                        tap((response: ListResponse<any>&
                             {isBackground?: boolean}) => {
                          this.nextPageToken = response.nextPageToken ?? '';
                          if (!response.isBackground) {
                            this.restoreScrollPosition();
                          }
                        })),
                    this.onScroll.pipe(switchMap((event: Event) => {
                      const element = event.target as HTMLElement;
                      if (element.scrollTop !== 0) {
                        return EMPTY;
                      }

                      if (!this.nextPageToken) {
                        return EMPTY;
                      }

                      this.scrollHeight = element.scrollHeight;
                      return this.uiStateService
                          .lazyLoadMessages(this.sessionName(), {
                            pageSize: 100,
                            pageToken: this.nextPageToken,
                          })
                          .pipe(first(), catchError(() => NEVER));
                    })))),
            takeUntilDestroyed(this.destroyRef),
            )
        .subscribe();
  }

  ngAfterViewInit() {
    if (this.scrollContainer?.nativeElement) {
      this.scrollContainer.nativeElement.addEventListener('wheel', () => {
        this.scrollInterrupted = true;
      });
      this.scrollContainer.nativeElement.addEventListener('touchmove', () => {
        this.scrollInterrupted = true;
      });
    }
  }

  ngOnChanges(changes: SimpleChanges) {
    if (changes['messages']) {
      const currentLastMessage = this.messages[this.messages.length - 1];
      const isNewMessageAppended = currentLastMessage !== this.lastMessageRef;

      if (isNewMessageAppended) {
        if (currentLastMessage?.role === 'user' ||
            currentLastMessage?.isLoading === true) {
          this.scrollInterrupted = false;
        }
        this.scrollToBottom();
      }
      this.lastMessageRef = currentLastMessage;
    }
  }

  scrollToBottom() {
    if (!this.scrollInterrupted) {
      setTimeout(() => {
        this.scrollContainer?.nativeElement.scrollTo({
          top: this.scrollContainer.nativeElement.scrollHeight,
          behavior: 'auto',
        });
      }, 50);
    }
  }

  getAgentNameFromEvent(i: number) {
    const key = this.messages[i].eventId;
    const selectedEvent = this.eventData.get(key);

    return selectedEvent?.author ?? ROOT_AGENT;
  }

  customIconColorClass(i: number) {
    const agentName = this.getAgentNameFromEvent(i);
    return agentName !== ROOT_AGENT ?
        `custom-icon-color-${
            this.stringToColorService.stc(agentName).replace('#', '')}` :
        '';
  }

  shouldMessageHighlighted(index: number) {
    return this.hoveredEventMessageIndices.includes(index);
  }

  isMessageEventSelected(index: number): boolean {
    const message = this.messages[index];
    return message.eventId &&
           this.selectedEvent &&
           message.eventId === this.selectedEvent.id;
  }

  shouldShowMessageCard(message: any): boolean {
    return !!(
        message.text || message.attachments || message.inlineData ||
        message.executableCode || message.codeExecutionResult ||
        message.a2uiData || message.renderedContent || message.isLoading ||
        (message.failedMetric && message.evalStatus === 2));
  }

  getBotEventNumber(messageIndex: number): number {
    const message = this.messages[messageIndex];

    if (message.role !== 'bot' || !message.eventId) {
      return -1;
    }

    const uniqueBotEventIds: string[] = [];
    for (let i = 0; i <= messageIndex; i++) {
      const msg = this.messages[i];
      if (msg.role === 'bot' && msg.eventId && !uniqueBotEventIds.includes(msg.eventId)) {
        uniqueBotEventIds.push(msg.eventId);
      }
    }

    return uniqueBotEventIds.indexOf(message.eventId) + 1;
  }


  getOverallEventNumber(messageIndex: number): number {
    let eventCount = 0;
    let lastSeenGroupType: 'user' | 'bot' | null = null;
    let lastBotEventId: string | null = null;

    for (let i = 0; i <= messageIndex; i++) {
      const msg = this.messages[i];

      if (msg.role === 'user') {
        // User messages increment when they start a new group
        if (lastSeenGroupType !== 'user') {
          eventCount++;
          lastSeenGroupType = 'user';
        }

        if (i === messageIndex) {
          return eventCount;
        }
      } else if (msg.role === 'bot' && msg.eventId) {
        // Bot events increment when they're a new event
        if (msg.eventId !== lastBotEventId) {
          eventCount++;
          lastBotEventId = msg.eventId;
          lastSeenGroupType = 'bot';
        }

        if (i === messageIndex) {
          return eventCount;
        }
      }
    }

    return -1;
  }

  isFirstUserMessageInGroup(messageIndex: number): boolean {
    const message = this.messages[messageIndex];

    if (message.role !== 'user') {
      return false;
    }

    if (messageIndex === 0) {
      return true;
    }

    const prevMessage = this.messages[messageIndex - 1];
    return prevMessage.role !== 'user';
  }

  isFirstMessageInEventGroup(messageIndex: number): boolean {
    const message = this.messages[messageIndex];

    if (message.role !== 'bot' || !message.eventId) {
      return false;
    }

    if (messageIndex === 0) {
      return true; // First message overall
    }

    const prevMessage = this.messages[messageIndex - 1];
    return prevMessage.eventId !== message.eventId;
  }


  hasStateDelta(messageIndex: number): boolean {
    const message = this.messages[messageIndex];
    if (!message.eventId) return false;

    const event = this.eventData.get(message.eventId);
    const stateDelta = event?.actions?.stateDelta;
    return stateDelta && Object.keys(stateDelta).length > 0;
  }


  hasArtifactDelta(messageIndex: number): boolean {
    const message = this.messages[messageIndex];
    if (!message.eventId) return false;

    const event = this.eventData.get(message.eventId);
    const artifactDelta = event?.actions?.artifactDelta;
    return artifactDelta && Object.keys(artifactDelta).length > 0;
  }

  renderGooglerSearch(content: string) {
    return this.sanitizer.bypassSecurityTrustHtml(content);
  }

  private restoreScrollPosition() {
    if (!this.scrollHeight) {
      this.scrollInterrupted = false;
      this.scrollToBottom();
      return;
    }
    const scrollContainer = this.scrollContainer?.nativeElement;
    if (scrollContainer) {
      scrollContainer.scrollTop =
          scrollContainer.scrollHeight - this.scrollHeight;
      this.scrollHeight = 0;
    }
  }

  isComputerUseClick(input: any): boolean {
    return isVisibleComputerUseClick(input);
  }

  isComputerUseResponse(input: any): boolean {
    return isComputerUseResponse(input);
  }

  getFunctionCallArgsTooltip(message: any): string {
    if (!message.functionCall || !message.functionCall.args) {
      return '';
    }
    try {
      return JSON.stringify(message.functionCall.args);
    } catch (e) {
      return String(message.functionCall.args);
    }
  }


  getFunctionResponseTooltip(message: any): string {
    if (!message.functionResponse || !message.functionResponse.response) {
      return '';
    }
    try {
      return JSON.stringify(message.functionResponse.response);
    } catch (e) {
      return String(message.functionResponse.response);
    }
  }


  getStateDeltaTooltip(messageIndex: number): string {
    const message = this.messages[messageIndex];
    if (!message.eventId) return '';

    const event = this.eventData.get(message.eventId);
    const stateDelta = event?.actions?.stateDelta;
    if (!stateDelta) return '';

    try {
      return JSON.stringify(stateDelta);
    } catch (e) {
      return String(stateDelta);
    }
  }


  getArtifactDeltaTooltip(messageIndex: number): string {
    const message = this.messages[messageIndex];
    if (!message.eventId) return '';

    const event = this.eventData.get(message.eventId);
    const artifactDelta = event?.actions?.artifactDelta;
    if (!artifactDelta) return '';

    try {
      return JSON.stringify(artifactDelta);
    } catch (e) {
      return String(artifactDelta);
    }
  }

  /**
   * Handle row click, but ignore if user is selecting text
   */
  handleRowClick(event: MouseEvent, message: any, index: number) {
    // Check if user is selecting text
    const selection = window.getSelection();
    if (selection && selection.toString().length > 0) {
      // User is selecting text, don't trigger row selection
      return;
    }

    // Select row for both bot and user messages
    this.clickEvent.emit(index);
  }

  @HostListener('window:keydown', ['$event'])
  handleKeyboardNavigation(event: KeyboardEvent) {
    if (!this.selectedEvent) return;

    // Only handle arrow keys
    if (event.key !== 'ArrowUp' && event.key !== 'ArrowDown') return;

    event.preventDefault();

    // Find unique eventIds and their first occurrence index
    const uniqueEventMap = new Map<string, number>();
    for (let i = 0; i < this.messages.length; i++) {
      const msg = this.messages[i];
      if (msg.eventId && !uniqueEventMap.has(msg.eventId)) {
        uniqueEventMap.set(msg.eventId, i);
      }
    }

    const eventIndices = Array.from(uniqueEventMap.values());

    if (eventIndices.length === 0) return;

    // Find current selected event index
    const currentIndex = eventIndices.findIndex(
      (idx) => this.messages[idx].eventId === this.selectedEvent.id
    );

    if (currentIndex === -1) return;

    // Navigate to next or previous
    let newIndex: number;
    if (event.key === 'ArrowDown') {
      newIndex = currentIndex + 1 >= eventIndices.length ? 0 : currentIndex + 1;
    } else {
      newIndex = currentIndex - 1 < 0 ? eventIndices.length - 1 : currentIndex - 1;
    }

    // Emit click event for the new index
    this.clickEvent.emit(eventIndices[newIndex]);

    // Scroll the selected message into view
    setTimeout(() => {
      if (!this.scrollContainer?.nativeElement) return;

      const messageElements = this.scrollContainer.nativeElement.querySelectorAll('.message-column-container');
      if (messageElements && messageElements[eventIndices[newIndex]]) {
        messageElements[eventIndices[newIndex]].scrollIntoView({
          behavior: 'smooth',
          block: 'nearest',
          inline: 'nearest'
        });
      }
    }, 0);
  }
}
