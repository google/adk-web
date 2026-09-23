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

import { CommonModule, NgClass } from '@angular/common';
import { Component, EventEmitter, Input, Output, inject } from '@angular/core';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatTooltipModule } from '@angular/material/tooltip';
import { MatDialog } from '@angular/material/dialog';
import { MatMenuModule } from '@angular/material/menu';
import { FunctionCall, FunctionResponse } from '../../core/models/types';
import { EditJsonDialogComponent } from '../edit-json-dialog/edit-json-dialog.component';

import { AgentRunRequest } from '../../core/models/AgentRunRequest';
import { isComputerUseResponse, isVisibleComputerUseClick } from '../../core/models/ComputerUse';
import type { EvalCase } from '../../core/models/Eval';
import { isShellCommandCall, isShellCommandResponse } from '../../core/models/ShellCommand';
import { UiEvent } from '../../core/models/UiEvent';
import { WorkflowGraphTooltipDirective } from '../../directives/workflow-graph-tooltip.directive';
import { JsonTooltipDirective } from '../../directives/html-tooltip.directive';
import { ComputerActionComponent } from '../computer-action/computer-action.component';
import { HoverInfoButtonComponent } from '../hover-info-button/hover-info-button.component';
import { LongRunningResponseComponent } from '../long-running-response/long-running-response';
import { ChatPanelMessagesInjectionToken } from '../chat-panel/chat-panel.component.i18n';
import { ContentBubbleComponent } from '../content-bubble/content-bubble.component';
import { ShellCommandComponent } from '../shell-command/shell-command.component';
import { SystemInstructionDiffDialogComponent } from '../system-instruction-diff-dialog/system-instruction-diff-dialog.component';

@Component({
  selector: 'app-event-content',
  templateUrl: './event-content.component.html',
  styleUrl: './event-content.component.scss',
  standalone: true,
  imports: [
    CommonModule,
    MatIconModule,
    MatButtonModule,
    MatTooltipModule,
    NgClass,
    WorkflowGraphTooltipDirective,
    ComputerActionComponent,
    LongRunningResponseComponent,
    HoverInfoButtonComponent,
    ContentBubbleComponent,
    MatMenuModule,
    JsonTooltipDirective,
    ShellCommandComponent,
  ],
})
export class EventContentComponent {
  @Input({ required: true }) uiEvent!: UiEvent;
  @Input({ required: true }) index!: number;
  @Input() uiEvents: UiEvent[] = [];

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

  @Output() readonly handleKeydown = new EventEmitter<{ event: KeyboardEvent, message: any }>();
  @Output() readonly cancelEditMessage = new EventEmitter<any>();
  @Output() readonly saveEditMessage = new EventEmitter<any>();
  @Output() readonly userEditEvalCaseMessageChange = new EventEmitter<string>();

  @Output() readonly openViewImageDialog = new EventEmitter<{ images: string[], currentIndex: number, urls?: string[], coordinates?: ({ x: number, y: number } | null)[] }>();
  @Output() readonly openBase64InNewTab = new EventEmitter<{ data: string, mimeType: string }>();

  @Output() readonly editEvalCaseMessage = new EventEmitter<any>();
  @Output() readonly deleteEvalCaseMessage = new EventEmitter<{ message: any, index: number }>();
  @Output() readonly editFunctionArgs = new EventEmitter<any>();

  @Output() readonly clickEvent = new EventEmitter<number>();
  @Output() readonly longRunningResponseComplete = new EventEmitter<any>();
  @Output() readonly agentStateClick = new EventEmitter<{ event: Event, index: number }>();

  protected readonly i18n = inject(ChatPanelMessagesInjectionToken);
  private readonly dialog = inject(MatDialog);

  readonly Object = Object;
  readonly String = String;

  getFunctionCallButtonText(functionCall: FunctionCall): string {
    let args: any = functionCall.args;
    if (args && typeof args === 'string') {
      try {
        args = JSON.parse(args);
      } catch {
        // ignore parsing error, treat as raw string
      }
    }
    if (args && typeof args === 'object') {
      const specialFuncArgMap: Record<string, string> = {
        'EditFile': 'path',
        'WriteFile': 'path',
      };
      if (functionCall.name in specialFuncArgMap) {
        const argKey = specialFuncArgMap[functionCall.name];
        if (argKey in args) {
          const valueStr = this.formatPythonValue(args[argKey]);
          const hasMore = Object.keys(args).length > 1;
          return `${functionCall.name}(${valueStr}${hasMore ? ', …' : ''})`;
        }
      }

      const keys = Object.keys(args);
      if (keys.length === 1) {
        const value = args[keys[0]];
        const valueStr = this.formatPythonValue(value);
        return `${functionCall.name}(${valueStr})`;
      } else if (keys.length === 0) {
        return `${functionCall.name}()`;
      }
    } else if (!args) {
      return `${functionCall.name}()`;
    }
    return functionCall.name;
  }

  private formatPythonValue(value: any): string {
    if (value === null || value === undefined) {
      return 'None';
    }
    if (typeof value === 'boolean') {
      return value ? 'True' : 'False';
    }
    if (typeof value === 'string') {
      return `"${value}"`;
    }
    if (typeof value === 'object') {
      return JSON.stringify(value)
        .replace(/\btrue\b/g, 'True')
        .replace(/\bfalse\b/g, 'False')
        .replace(/\bnull\b/g, 'None');
    }
    return String(value);
  }

  shouldShowMessageCard(message: any): boolean {
    return !!(
      message.text || message.attachments || message.inlineData ||
      message.executableCode || message.codeExecutionResult ||
      message.a2uiData || message.renderedContent || message.isLoading ||
      (message.failedMetric && message.evalStatus === 2) ||
      message.event?.content?.parts?.some((part: any) => part.fileData));
  }

  isComputerUseClick(input: any): boolean {
    return isVisibleComputerUseClick(input);
  }

  isComputerUseResponse(input: any): boolean {
    return isComputerUseResponse(input);
  }

  isShellCommandCall(functionCall: FunctionCall): boolean {
    return isShellCommandCall(functionCall);
  }

  isShellCommandResponse(functionResponse: FunctionResponse): boolean {
    return isShellCommandResponse(functionResponse);
  }

  getFilteredStateKeys(stateDelta: any): string[] {
    if (!stateDelta) return [];
    return Object.keys(stateDelta).filter(key => key !== '__llm_request_key__');
  }

  getFilteredStateDelta(stateDelta: any): any {
    if (!stateDelta) return null;
    const filtered = { ...stateDelta };
    delete filtered['__llm_request_key__'];
    return filtered;
  }

  hasWorkflowNodes(): boolean {
    const nodes = this.uiEvent.event?.actions?.agentState?.nodes;
    return !!nodes && Object.keys(nodes).length > 0;
  }

  getWorkflowNodes(): any {
    return this.uiEvent.event?.actions?.agentState?.nodes || null;
  }

  hasEndOfAgent(): boolean {
    return this.uiEvent.event?.actions?.endOfAgent === true;
  }

  getEndOfAgentAuthor(): string {
    return this.uiEvent.event?.author || 'Agent';
  }

  getTransferTargetName(): string {
    const transfer = this.uiEvent.transferToAgent;
    if (!transfer) return '';
    if (typeof transfer === 'string') return transfer;
    return transfer.agentName || transfer.name || transfer.targetAgent || JSON.stringify(transfer);
  }

  hasFunctionResponse(callId: string | undefined): boolean {
    if (!callId) {
      return false;
    }
    return this.uiEvents.some(event =>
      event.functionResponses?.some(response => response.id === callId && (response.response as any)?.status !== 'pending')
    );
  }

  openSendAnotherResponseDialog(functionResponse: FunctionResponse) {
    let functionCallEventId = '';
    const callId = functionResponse.id;

    if (callId) {
      for (const event of this.uiEvents) {
        if (event.functionCalls) {
          const fc = event.functionCalls.find(c => c.id === callId);
          if (fc) {
            functionCallEventId = (fc as any).functionCallEventId || event.event?.id || '';
            break;
          }
        }
      }
    }

    const dialogRef = this.dialog.open(EditJsonDialogComponent, {
      data: {
        dialogHeader: 'Send Another Response',
        functionName: functionResponse.name,
        jsonContent: functionResponse.response
      },
      width: '600px'
    });

    dialogRef.afterClosed().subscribe(result => {
      if (result) {
        const content = {
          role: 'user',
          parts: [{
            functionResponse: {
              id: callId,
              name: functionResponse.name,
              response: result,
            },
          }],
          functionCallEventId: functionCallEventId
        };
        this.longRunningResponseComplete.emit(content);
      }
    });
  }

  getAllImages(): string[] {
    const images: string[] = [];
    const seen = new Set<string>();

    const addImage = (img: string) => {
      if (!seen.has(img)) {
        seen.add(img);
        images.push(img);
      }
    };

    for (const event of this.uiEvents) {
      if (event.attachments) {
        for (const file of event.attachments) {
          if (file.file.type.startsWith('image/') && file.url) {
            addImage(file.url);
          }
        }
      }
      if (event.inlineData?.mimeType?.startsWith('image/') && event.inlineData.data) {
        addImage(event.inlineData.data);
      }
      const parts = event.event?.content?.parts;
      if (Array.isArray(parts)) {
        for (const p of parts) {
          if (p.inlineData?.mimeType?.startsWith('image/') && p.inlineData.data) {
            const mimeType = p.inlineData.mimeType;
            const data = p.inlineData.data.replace(/-/g, '+').replace(/_/g, '/');
            addImage(`data:${mimeType};base64,${data}`);
          }
        }
      }
      if (event.functionResponses) {
        for (const resp of event.functionResponses) {
          if (this.isComputerUseResponse(resp)) {
            const payload = resp.response as any;
            const imageInfo = payload?.image;
            if (imageInfo?.data) {
              const screenshot = imageInfo.data;
              const mimeType = imageInfo.mimetype || 'image/png';
              const imgStr = screenshot.startsWith('data:') ? screenshot : `data:${mimeType};base64,${screenshot}`;
              addImage(imgStr);
            }
          }
        }
      }
    }
    return images;
  }

  onImageClick(clickedImage: string) {
    const images = this.getAllImages();
    const currentIndex = images.indexOf(clickedImage);
    this.openViewImageDialog.emit({ images, currentIndex });
  }

  openSystemInstructionDiffDialog(event: MouseEvent) {
    event.stopPropagation();
    const preceding = this.uiEvent.event.precedingSystemInstruction || '';
    const current = this.uiEvent.event.currentSystemInstruction || '';
    
    this.dialog.open(SystemInstructionDiffDialogComponent, {
      data: {
        precedingInstruction: preceding,
        currentInstruction: current
      },
      maxWidth: '95vw',
      maxHeight: '95vh',
      width: '85vw',
      height: '90vh',
      panelClass: 'system-instruction-diff-dialog-panel'
    });
  }
}
