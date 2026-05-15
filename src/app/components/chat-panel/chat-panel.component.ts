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

import { TextFieldModule } from '@angular/cdk/text-field';
import { CommonModule } from '@angular/common';
import { AfterViewInit, ChangeDetectionStrategy, Component, DestroyRef, effect, ElementRef, EventEmitter, HostListener, inject, InjectionToken, input, Input, OnChanges, Output, signal, SimpleChanges, Type, ViewChild } from '@angular/core';
import { takeUntilDestroyed, toSignal } from '@angular/core/rxjs-interop';
import { FormsModule } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MatCardModule } from '@angular/material/card';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatIconModule } from '@angular/material/icon';
import { MatInputModule } from '@angular/material/input';
import { MatMenuModule, MatMenuTrigger } from '@angular/material/menu';
import { MatProgressBarModule } from '@angular/material/progress-bar';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatSlideToggleModule } from '@angular/material/slide-toggle';
import { MatTooltipModule } from '@angular/material/tooltip';
import { MatButtonToggleModule } from '@angular/material/button-toggle';
import { MatTabsModule } from '@angular/material/tabs';
import { MatSelectModule } from '@angular/material/select';
import { NgxJsonViewerModule } from 'ngx-json-viewer';
import { EMPTY, merge, NEVER, of, Subject } from 'rxjs';
import { catchError, filter, first, switchMap, tap } from 'rxjs/operators';

import { AgentRunRequest } from '../../core/models/AgentRunRequest';
import { isComputerUseResponse, isVisibleComputerUseClick } from '../../core/models/ComputerUse';
import type { EvalCase } from '../../core/models/Eval';
import { FunctionCall, FunctionResponse } from '../../core/models/types';
import { UiEvent } from '../../core/models/UiEvent';
import { AGENT_SERVICE } from '../../core/services/interfaces/agent';
import { FEATURE_FLAG_SERVICE } from '../../core/services/interfaces/feature-flag';
import { SAFE_VALUES_SERVICE } from '../../core/services/interfaces/safevalues';
import { SESSION_SERVICE } from '../../core/services/interfaces/session';
import { STRING_TO_COLOR_SERVICE } from '../../core/services/interfaces/string-to-color';
import { ListResponse } from '../../core/services/interfaces/types';
import { UI_STATE_SERVICE } from '../../core/services/interfaces/ui-state';
import { THEME_SERVICE } from '../../core/services/interfaces/theme';
import { JsonTooltipDirective } from '../../directives/html-tooltip.directive';
import { WorkflowGraphTooltipDirective } from '../../directives/workflow-graph-tooltip.directive';
import { LiveFlags } from '../../core/services/interfaces/stream-chat';
import { A2uiCanvasComponent } from '../a2ui-canvas/a2ui-canvas.component';
import { MediaType, } from '../artifact-tab/artifact-tab.component';
import { AudioPlayerComponent } from '../audio-player/audio-player.component';
import { ComputerActionComponent } from '../computer-action/computer-action.component';
import { LongRunningResponseComponent } from '../long-running-response/long-running-response';
import { MARKDOWN_COMPONENT, MarkdownComponentInterface } from '../markdown/markdown.component.interface';
import { MessageFeedbackComponent } from '../message-feedback/message-feedback.component';

import { ChatPanelMessagesInjectionToken } from './chat-panel.component.i18n';

import { HoverInfoButtonComponent } from '../hover-info-button/hover-info-button.component';
import { ChatAvatarComponent } from '../chat-avatar/chat-avatar.component';
import { EventRowComponent } from '../event-row/event-row.component';
import { CallControlsComponent } from '../call-controls/call-controls.component';
import { TraceTreeComponent } from '../trace-tab/trace-tree/trace-tree.component';

export interface BranchEvent {
  event: UiEvent;
  globalIndex: number;
}

export interface BranchGroup {
  branchId: string;
  events: BranchEvent[];
}

export interface GroupedBranches {
  type: 'branches';
  branches: BranchGroup[];
  startIndex: number;
}

export type DisplayItem = {
  type: 'event';
  event: UiEvent;
  index: number;
} | GroupedBranches;

@Component({
  changeDetection: ChangeDetectionStrategy.Default,
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
    MatSlideToggleModule,
    NgxJsonViewerModule,
    MatTooltipModule,
    MatButtonToggleModule,
    MatTabsModule,
    MatSelectModule,
    EventRowComponent,
    CallControlsComponent,
    TraceTreeComponent,
  ],
})
export class ChatPanelComponent implements OnChanges, AfterViewInit {
  @Input() appName: string = '';
  @Input() agentReadme: string = '';
  sessionName = input<string>('');
  @Input() uiEvents: UiEvent[] = [];
  @Input() showBranches: boolean = false;
  @Input() traceData: any[] = [];
  @Input() isChatMode: boolean = true;
  @Input() evalCase: EvalCase | null = null;
  @Input() isEvalEditMode: boolean = false;
  @Input() isEvalCaseEditing: boolean = false;
  @Input() agentGraphData: any = null;
  @Input() isEditFunctionArgsEnabled: boolean = false;
  @Input() isTokenStreamingEnabled: boolean = false;
  @Input() useSse: boolean = false;
  @Input() useLive: boolean = false;
  @Input() userInput: string = '';
  @Input() userEditEvalCaseMessage: string = '';
  @Input() selectedFiles: { file: File; url: string }[] = [];
  @Input() updatedSessionState: any | null = null;
  @Input() selectedMessageIndex: number | undefined = undefined;
  @Input() isAudioRecording: boolean = false;
  @Input() micVolume: number = 0;
  @Input() isVideoRecording: boolean = false;
  @Input() userId: string = '';
  @Input() sessionId: string = '';
  @Input() viewMode: 'events' | 'traces' = 'events';
  @Input() shouldShowEvent?: (uiEvent: UiEvent) => boolean;
  spansByInvocationId = new Map<string, any[]>();
  displayItems: DisplayItem[] = [];
  eventsScrollTop = -1;
  tracesScrollTop = -1;

  @Output() readonly userInputChange = new EventEmitter<string>();
  @Output() readonly userEditEvalCaseMessageChange = new EventEmitter<string>();
  @Output() readonly clickEvent = new EventEmitter<number>();
  @Output()
  readonly handleKeydown =
    new EventEmitter<{ event: KeyboardEvent, message: any }>();
  @Output() readonly cancelEditMessage = new EventEmitter<any>();
  @Output() readonly saveEditMessage = new EventEmitter<any>();
  @Output() readonly openViewImageDialog = new EventEmitter<{images: string[], currentIndex: number}>();
  @Output()
  readonly openBase64InNewTab =
    new EventEmitter<{ data: string, mimeType: string }>();
  @Output() readonly editEvalCaseMessage = new EventEmitter<any>();
  @Output()
  readonly deleteEvalCaseMessage =
    new EventEmitter<{ message: any, index: number }>();
  @Output() readonly editFunctionArgs = new EventEmitter<any>();
  @Output() readonly fileSelect = new EventEmitter<Event>();
  @Output() readonly removeFile = new EventEmitter<number>();
  @Output() readonly removeStateUpdate = new EventEmitter<void>();
  @Output() readonly sendMessage = new EventEmitter<Event>();
  @Output() readonly updateState = new EventEmitter<void>();
  @Output() readonly toggleAudioRecording = new EventEmitter<LiveFlags>();
  @Output() readonly toggleVideoRecording = new EventEmitter<void>();
  @Output() readonly longRunningResponseComplete = new EventEmitter<AgentRunRequest>();
  @Output() readonly toggleHideIntermediateEvents = new EventEmitter<void>();
  @Output() readonly toggleSse = new EventEmitter<void>();

  @ViewChild('videoContainer', { read: ElementRef }) videoContainer!: ElementRef;
  @ViewChild('autoScroll') scrollContainer!: ElementRef;
  @ViewChild('messageTextarea') public textarea: ElementRef | undefined;
  scrollInterrupted = false;
  private scrollHeight = 0;
  private lastMessageRef: any = null;
  private nextPageToken = '';
  private scrollTimeout: any = null;
  private mutationObserver: MutationObserver | null = null;
  protected readonly i18n = inject(ChatPanelMessagesInjectionToken);
  protected readonly uiStateService = inject(UI_STATE_SERVICE);
  protected readonly themeService = inject(THEME_SERVICE);
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
  readonly Object = Object;
  readonly String = String;

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
  readonly hideMoreOptionsButton =
    toSignal(this.featureFlagService.isMoreOptionsButtonHidden());

  protected readonly onScroll = new Subject<Event>();
  protected readonly sanitizer = inject(SAFE_VALUES_SERVICE);

  hideIntermediateEvents = input<boolean>(false);
  invocationDisplayMap = input<Map<string, string>>(new Map());
  evalCaseResult = input<any | null>(null);
  showEvalSummary = input<boolean>(false);


  



  

  constructor() {
    effect(() => {
      const sessionName = this.sessionName();
      if (sessionName) {
        this.nextPageToken = '';
        this.featureFlagService.isInfinityMessageScrollingEnabled()
          .pipe(first(), filter((enabled) => enabled))
          .subscribe(() => {
            this.uiStateService
              .lazyLoadMessages(sessionName, {
                pageSize: 100,
                pageToken: this.nextPageToken,
              })
              .pipe(first())
              .subscribe();
          });
      }
    });
  }

  ngOnInit() {
    this.uiStateService.isSessionLoading()
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe((isLoading) => {
        if (!isLoading) {
          this.focusInput();
        }
      });



    this.featureFlagService.isInfinityMessageScrollingEnabled()
      .pipe(
        first(),
        filter((enabled) => enabled),
        switchMap(
          () => merge(
            this.uiStateService.onNewMessagesLoaded().pipe(
              tap((response: ListResponse<any> &
              { isBackground?: boolean }) => {
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
      const el = this.scrollContainer.nativeElement;

      el.addEventListener('scroll', () => {
        const isAtBottom = Math.abs(el.scrollHeight - el.scrollTop - el.clientHeight) < 50;
        this.scrollInterrupted = !isAtBottom;
      });

      this.mutationObserver = new MutationObserver(() => {
        if (!this.scrollInterrupted) {
          this.scrollToBottom();
        }
      });
      this.mutationObserver.observe(el, {
        childList: true,
        subtree: true,
        characterData: true
      });

      this.destroyRef.onDestroy(() => {
        this.mutationObserver?.disconnect();
      });
    }
  }

  ngOnChanges(changes: SimpleChanges) {
    if (changes['viewMode']) {
      const prevMode = changes['viewMode'].previousValue;
      const currentMode = changes['viewMode'].currentValue;
      
      if (this.scrollContainer?.nativeElement) {
        if (prevMode === 'events') {
          this.eventsScrollTop = this.scrollContainer.nativeElement.scrollTop;
        } else if (prevMode === 'traces') {
          this.tracesScrollTop = this.scrollContainer.nativeElement.scrollTop;
        }
      }
      
      setTimeout(() => {
        if (this.scrollContainer?.nativeElement) {
          if (currentMode === 'events' && this.eventsScrollTop !== -1) {
            this.scrollContainer.nativeElement.scrollTop = this.eventsScrollTop;
          } else if (currentMode === 'traces' && this.tracesScrollTop !== -1) {
            this.scrollContainer.nativeElement.scrollTop = this.tracesScrollTop;
          } else {
            this.scrollToBottom();
          }
        }
      });
    }

    if (changes['appName']) {
      this.focusInput();
    }

    // Scroll to top when switching apps or when messages become empty (new session with README)
    if ((changes['appName'] || changes['uiEvents']) && this.uiEvents.length === 0 && this.agentReadme) {
      setTimeout(() => this.scrollToTop(), 0);
    }

    if (changes['uiEvents']) {


      const currentLastMessage = this.uiEvents[this.uiEvents.length - 1];
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

    if (changes['traceData'] && this.traceData) {
      this.rebuildTrace();
    }

    if (changes['uiEvents'] || changes['showBranches'] || changes['viewMode']) {
      this.computeDisplayItems();
    }
  }

  computeDisplayItems() {
    if (!this.showBranches || this.viewMode === 'traces') {
      this.displayItems = this.uiEvents.map((event, index) => ({
        type: 'event' as const,
        event,
        index
      }));
      return;
    }

    const items: DisplayItem[] = [];
    let currentGroup: {
      type: 'branches';
      branchesMap: Map<string, BranchEvent[]>;
      startIndex: number;
    } | null = null;

    this.uiEvents.forEach((event, index) => {
      const branchId = event.event?.branch;
      if (branchId) {
        if (!currentGroup) {
          currentGroup = {
            type: 'branches',
            branchesMap: new Map<string, BranchEvent[]>(),
            startIndex: index
          };
        }
        const branchEvents = currentGroup.branchesMap.get(branchId) || [];
        branchEvents.push({ event, globalIndex: index });
        currentGroup.branchesMap.set(branchId, branchEvents);
      } else {
        if (currentGroup) {
          items.push(this.finalizeGroup(currentGroup));
          currentGroup = null;
        }
        items.push({
          type: 'event' as const,
          event,
          index
        });
      }
    });

    if (currentGroup) {
      items.push(this.finalizeGroup(currentGroup));
    }

    this.displayItems = items;
  }

  finalizeGroup(group: { type: 'branches'; branchesMap: Map<string, BranchEvent[]>; startIndex: number; }): DisplayItem {
    const branches: BranchGroup[] = [];
    group.branchesMap.forEach((events, branchId) => {
      branches.push({ branchId, events });
    });
    return {
      type: 'branches',
      branches,
      startIndex: group.startIndex
    };
  }

  rebuildTrace() {
    const invocTraces = this.traceData.reduce((map: any, item: any) => {
      const key = item.trace_id;
      const group = map.get(key);
      if (group) {
        group.push(item);
        group.sort((a: any, b: any) => a.start_time - b.start_time);
      } else {
        map.set(key, [item]);
      }
      return map;
    }, new Map<string, any[]>());

    this.spansByInvocationId = new Map<string, any[]>();
    for (const [key, group] of invocTraces) {
      let invocId = group.find(
        (item: any) => item.attributes !== undefined && 'gcp.vertex.agent.invocation_id' in item.attributes
      )?.attributes['gcp.vertex.agent.invocation_id'];

      // Fallback 1: Use associated_event_ids
      if (!invocId) {
        const associatedEventIds = group.find(
          (item: any) => item.attributes !== undefined && 'gcp.vertex.agent.associated_event_ids' in item.attributes
        )?.attributes['gcp.vertex.agent.associated_event_ids'];
        if (associatedEventIds && associatedEventIds.length > 0) {
          invocId = associatedEventIds[0];
        }
      }

      // Fallback 2: Use trace_id
      if (!invocId) {
        invocId = key;
      }

      if (invocId) {
        this.spansByInvocationId.set(invocId, group);
      }
    }
  }

  isFirstEventForInvocation(uiEvent: UiEvent, index: number): boolean {
    const id = uiEvent.event?.invocationId || uiEvent.event?.id;
    if (!id) return false;

    // Check if any previous bot event in uiEvents has the same invocationId or event ID
    for (let i = index - 1; i >= 0; i--) {
      const prevEvent = this.uiEvents[i];
      const prevId = prevEvent.event?.invocationId || prevEvent.event?.id;
      if (prevEvent.role === 'bot' && prevId === id) {
        return false;
      }
    }
    return true;
  }

  scrollToBottom() {
    if (!this.sessionId) return;
    if (!this.scrollInterrupted) {
      if (this.scrollTimeout) {
        clearTimeout(this.scrollTimeout);
      }
      this.scrollTimeout = setTimeout(() => {
        this.scrollContainer?.nativeElement.scrollTo({
          top: this.scrollContainer.nativeElement.scrollHeight,
          behavior: 'auto',
        });
        this.scrollTimeout = null;
      }, 50);
    }
  }

  scrollToTop() {
    setTimeout(() => {
      this.scrollContainer?.nativeElement.scrollTo({
        top: 0,
        behavior: 'smooth',
      });
    }, 50);
  }

  focusInput() {
    setTimeout(() => {
      this.textarea?.nativeElement?.focus();
    }, 50);
  }

  isMessageEventSelected(index: number): boolean {
    return index === this.selectedMessageIndex;
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



  getAllWorkflowNodes(messageIndex: number): any {
    // Collect node states from all events, organized by nodePath
    // Structure: { "order_processing_pipeline": { "__START__": {...}, "validation_stage": {...} }, ... }
    const nodesByPath: any = {};

    for (let i = 0; i <= messageIndex; i++) {
      const msg = this.uiEvents[i];
      const event = msg.event;
      const nodes = event?.actions?.agentState?.nodes;
      const nodePath = event?.nodeInfo?.path;

      if (nodes && nodePath) {
        // Initialize path if not exists
        if (!nodesByPath[nodePath]) {
          nodesByPath[nodePath] = {};
        }

        // Merge nodes for this path, later states override earlier ones
        Object.assign(nodesByPath[nodePath], nodes);
      }
    }

    return Object.keys(nodesByPath).length > 0 ? nodesByPath : null;
  }




  handleAgentStateClick(event: Event, messageIndex: number) {
    event.stopPropagation();

    const isAlreadySelected = messageIndex === this.selectedMessageIndex;

    if (!isAlreadySelected) {
      this.clickEvent.emit(messageIndex);
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
    if (this.selectedMessageIndex === undefined) return;

    const activeElement = document.activeElement as HTMLElement | null;
    if (activeElement && (activeElement.tagName === 'INPUT' || activeElement.tagName === 'TEXTAREA' || activeElement.isContentEditable)) {
      return;
    }

    // Only handle arrow keys
    if (event.key !== 'ArrowUp' && event.key !== 'ArrowDown') return;

    event.preventDefault();

    // Navigate to next or previous
    let newIndex: number;
    if (event.key === 'ArrowDown') {
      newIndex = this.selectedMessageIndex + 1 >= this.uiEvents.length ? 0 : this.selectedMessageIndex + 1;
    } else {
      newIndex =
        this.selectedMessageIndex - 1 < 0 ? this.uiEvents.length - 1 : this.selectedMessageIndex - 1;
    }

    // Emit click event for the new index
    this.clickEvent.emit(newIndex);
    this.scrollToSelectedMessage(newIndex);
  }

  scrollToSelectedMessage(index?: number) {
    const targetIndex = index !== undefined ? index : this.selectedMessageIndex;
    if (targetIndex === undefined) return;

    // Scroll the selected message into view after a short delay to allow DOM updates
    setTimeout(() => {
      if (!this.scrollContainer?.nativeElement) return;

      const messageElements =
        this.scrollContainer.nativeElement.querySelectorAll(
          '.message-row-container');
      if (messageElements && messageElements[targetIndex]) {
        messageElements[targetIndex].scrollIntoView(
          { behavior: 'smooth', block: 'nearest', inline: 'nearest' });
      }
    }, 50);
  }
}
