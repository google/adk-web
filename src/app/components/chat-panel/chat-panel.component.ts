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
import {CommonModule, DOCUMENT, NgClass, NgStyle} from '@angular/common';
import {AfterViewInit, ChangeDetectionStrategy, Component, ElementRef, EventEmitter, inject, Inject, Input, OnChanges, Output, Renderer2, signal, SimpleChanges, Type, ViewChild} from '@angular/core';
import {FormsModule} from '@angular/forms';
import {MatButtonModule} from '@angular/material/button';
import {MatCardModule} from '@angular/material/card';
import {MatFormFieldModule} from '@angular/material/form-field';
import {MatIconModule} from '@angular/material/icon';
import {MatInputModule} from '@angular/material/input';
import {MatMenuModule} from '@angular/material/menu';
import {MatProgressBarModule} from '@angular/material/progress-bar';
import {MatTooltipModule} from '@angular/material/tooltip';
import {DomSanitizer, SafeHtml} from '@angular/platform-browser';
import {NgxJsonViewerModule} from 'ngx-json-viewer';

import type {EvalCase} from '../../core/models/Eval';
import {FEATURE_FLAG_SERVICE} from '../../core/services/interfaces/feature-flag';
import {STRING_TO_COLOR_SERVICE} from '../../core/services/interfaces/string-to-color';
import {MediaType,} from '../artifact-tab/artifact-tab.component';
import {AudioPlayerComponent} from '../audio-player/audio-player.component';
import {MARKDOWN_COMPONENT, MarkdownComponentInterface} from '../markdown/markdown.component.interface';

import {ChatPanelMessagesInjectionToken} from './chat-panel.component.i18n';

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
    NgxJsonViewerModule,
    AudioPlayerComponent,
    MatTooltipModule,
    NgClass,
    NgStyle,
  ],
})
export class ChatPanelComponent implements OnChanges, AfterViewInit {
  @Input() appName: string = '';
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
  private previousMessageCount = 0;
  protected readonly i18n = inject(ChatPanelMessagesInjectionToken);
  private readonly stringToColorService = inject(STRING_TO_COLOR_SERVICE);
  readonly markdownComponent: Type<MarkdownComponentInterface> = inject(
      MARKDOWN_COMPONENT,
  );
  private readonly featureFlagService = inject(FEATURE_FLAG_SERVICE);
  readonly MediaType = MediaType;

  readonly isMessageFileUploadEnabledObs =
      this.featureFlagService.isMessageFileUploadEnabled();
  readonly isManualStateUpdateEnabledObs =
      this.featureFlagService.isManualStateUpdateEnabled();
  readonly isBidiStreamingEnabledObs =
      this.featureFlagService.isBidiStreamingEnabled();

  constructor(private sanitizer: DomSanitizer) {}

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
      if (this.messages.length > this.previousMessageCount) {
        const newMessages = this.messages.slice(this.previousMessageCount);
        if (newMessages.some(m => m.role === 'user')) {
          this.scrollInterrupted = false;
        }
        this.scrollToBottom();
      }
      this.previousMessageCount = this.messages.length;
    }
  }

  scrollToBottom() {
    if (!this.scrollInterrupted && this.scrollContainer?.nativeElement) {
      setTimeout(() => {
        this.scrollContainer.nativeElement.scrollTo({
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
    return this.sanitizer.bypassSecurityTrustHtml(content);
  }
}
