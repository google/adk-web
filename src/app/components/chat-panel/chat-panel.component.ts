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
import {AfterViewInit, Component, DestroyRef, effect, ElementRef, EventEmitter, inject, input, Input, OnChanges, Output, signal, SimpleChanges, Type, ViewChild} from '@angular/core';
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
import {DomSanitizer, SecurityContext, SafeHtml} from '@angular/platform-browser';
import {NgxJsonViewerModule} from 'ngx-json-viewer';
import {EMPTY, merge, NEVER, of, Subject} from 'rxjs';
import {catchError, filter, first, switchMap, tap} from 'rxjs/operators';

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

  renderGooglerSearch(content: string) {
    return this.sanitizer.sanitize(SecurityContext.HTML, content);
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

  isComputerUseClick(message: {functionCall?: FunctionCall}): boolean {
    return isVisibleComputerUseClick(message);
  }

  isComputerUseResponse(message: {functionResponse?: FunctionResponse}): boolean {
    return isComputerUseResponse(message);
  }
}
