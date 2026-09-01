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

import {CommonModule} from '@angular/common';
import {Component, EventEmitter, Input, Output, inject} from '@angular/core';

import {AgentRunRequest} from '../../core/models/AgentRunRequest';
import type {EvalCase} from '../../core/models/Eval';
import {UiEvent} from '../../core/models/UiEvent';
import {ChatAvatarComponent} from '../chat-avatar/chat-avatar.component';
import {MessageFeedbackComponent} from '../message-feedback/message-feedback.component';
import {EventContentComponent} from '../event-content/event-content.component';
import {MESSAGE_FEEDBACK_COMPONENT} from '../message-feedback/message-feedback.component.interface';

@Component({
  selector: 'app-event-row',
  templateUrl: './event-row.component.html',
  styleUrl: './event-row.component.scss',
  standalone: true,
  host: {
    'class': 'message-row-container',
    '[class.selected]': 'isSelected',
    '[class.user]': 'uiEvent.role === "user"',
    '[class.bot]': 'uiEvent.role === "bot"',
    '[class.selectable]': 'isSelectable',
    '(click)': 'onRowClick($event)'
  },
  imports: [
    CommonModule,
    MessageFeedbackComponent,
    ChatAvatarComponent,
    EventContentComponent,
  ],
})
export class EventRowComponent {
  protected readonly messageFeedbackComponent =
      inject(MESSAGE_FEEDBACK_COMPONENT, {optional: true});

  @Input({required: true}) uiEvent!: UiEvent;
  @Input({required: true}) index!: number;
  @Input() uiEvents: UiEvent[] = [];
  @Input() isSelected: boolean = false;
  @Input() isSelectable: boolean = true;
  
  @Input() appName: string = '';
  @Input() userId: string = '';
  @Input() sessionId: string = '';
  @Input() sessionName: string = '';
  
  @Input() evalCase: EvalCase | null = null;
  @Input() isEvalEditMode: boolean = false;
  @Input() isEvalCaseEditing: boolean = false;
  @Input() isEditFunctionArgsEnabled: boolean = false;
  @Input() userEditEvalCaseMessage: string = '';
  
  @Input() agentGraphData: any = null;
  @Input() allWorkflowNodes: any = null;
  
  @Input() isUserFeedbackEnabled: boolean = false;
  @Input() isLoadingAgentResponse: boolean = false;

  @Output() readonly rowClick = new EventEmitter<{event: MouseEvent, uiEvent: UiEvent, index: number}>();
  @Output() readonly handleKeydown = new EventEmitter<{event: KeyboardEvent, message: any}>();
  @Output() readonly cancelEditMessage = new EventEmitter<any>();
  @Output() readonly saveEditMessage = new EventEmitter<any>();
  @Output() readonly userEditEvalCaseMessageChange = new EventEmitter<string>();
  
  @Output() readonly openViewImageDialog = new EventEmitter<{images: string[], currentIndex: number, urls?: string[], coordinates?: ({x: number, y: number} | null)[]}>();
  @Output() readonly openBase64InNewTab = new EventEmitter<{data: string, mimeType: string}>();
  
  @Output() readonly editEvalCaseMessage = new EventEmitter<any>();
  @Output() readonly deleteEvalCaseMessage = new EventEmitter<{message: any, index: number}>();
  @Output() readonly editFunctionArgs = new EventEmitter<any>();
  
  @Output() readonly clickEvent = new EventEmitter<number>();
  @Output() readonly longRunningResponseComplete = new EventEmitter<AgentRunRequest>();
  @Output() readonly agentStateClick = new EventEmitter<{event: Event, index: number}>();

  onRowClick(event: MouseEvent) {
    if (!this.isSelectable) return;
    this.rowClick.emit({event, uiEvent: this.uiEvent, index: this.index});
  }

  get indentationDepth(): number {
    if (!this.uiEvent.nodePath) return 0;
    const segments = this.uiEvent.nodePath.split('/').filter(Boolean);
    const count = segments.length;
    return count > 2 ? count - 2 : 0;
  }

  get indentationArray(): number[] {
    const depth = this.indentationDepth;
    return depth > 0 ? Array.from({ length: depth }, (_, i) => i) : [];
  }
}
