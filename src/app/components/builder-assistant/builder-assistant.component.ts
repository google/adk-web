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

import { Component, Input, Output, EventEmitter, OnInit, Inject, ViewChild, ElementRef, AfterViewChecked, inject, Type} from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { MatIcon } from '@angular/material/icon';
import { MatIconButton } from '@angular/material/button';
import { MatTooltip } from '@angular/material/tooltip';
import { MatCard } from '@angular/material/card';
import { TextFieldModule } from '@angular/cdk/text-field';
import { SESSION_SERVICE, SessionService } from '../../core/services/interfaces/session';
import { AGENT_SERVICE, AgentService } from '../../core/services/interfaces/agent';
import {AGENT_BUILDER_SERVICE} from '../../core/services/interfaces/agent-builder';
import { AgentRunRequest } from '../../core/models/AgentRunRequest';
import { AgentBuilderService } from '../../core/services/agent-builder.service';
import { YamlUtils } from '../../../utils/yaml-utils';
import {MARKDOWN_COMPONENT, MarkdownComponentInterface} from '../markdown/markdown.component.interface';

@Component({
  selector: 'app-builder-assistant',
  templateUrl: './builder-assistant.component.html',
  styleUrl: './builder-assistant.component.scss',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    MatIcon,
    MatIconButton,
    MatTooltip,
    MatCard,
    TextFieldModule,
  ],
})
export class BuilderAssistantComponent implements OnInit, AfterViewChecked {
  @Input() isVisible: boolean = true;
  @Input() appName = "";
  @Output() closePanel = new EventEmitter<void>();
  @Output() reloadCanvas = new EventEmitter<void>();

  assistantAppName = "__adk_agent_builder_assistant";
  userId = "user";
  currentSession: string | undefined = "";

  userMessage: string = '';
  messages: any[] = [];
  private shouldAutoScroll = false;
  isGenerating: boolean = false;

  @ViewChild('chatMessages') private chatMessages!: ElementRef;
  readonly markdownComponent: Type<MarkdownComponentInterface> = inject(
      MARKDOWN_COMPONENT,
  );

  private agentService = inject(AGENT_SERVICE);
  private sessionService = inject(SESSION_SERVICE);
  private agentBuilderService = inject(AGENT_BUILDER_SERVICE);

  constructor(){
  }

  ngOnInit() {
    this.sessionService.createSession(this.userId, this.assistantAppName).subscribe(session => {
      this.currentSession = session.id;
      const req: AgentRunRequest = {
        appName: this.assistantAppName,
        userId: this.userId,
        sessionId: session.id,
        newMessage: {
          'role': 'user',
          'parts': [{'text': 'hello'}],
        },
        streaming: false,
        stateDelta: {
          "root_directory" : `${this.appName}/tmp/${this.appName}`
        }
      };

      // Add loading message for bot response
      this.messages.push({ role: 'bot', text: '', isLoading: true });
      this.shouldAutoScroll = true;
      this.isGenerating = true;

      this.agentService.runSse(req).subscribe({
        next: async (chunk) => {
          if (chunk.content) {
            let botText = '';
            for (let part of chunk.content.parts) {
              if (part.text) {
                botText += part.text;
              }
            }
            if (botText) {
              // Update the last message (remove loading, add text)
              const lastMessage = this.messages[this.messages.length - 1];
              if (lastMessage.role === 'bot' && lastMessage.isLoading) {
                lastMessage.text = botText;
                lastMessage.isLoading = false;
                this.shouldAutoScroll = true;
              }
            }
          }
        },
        error: (err) => {
          console.error('SSE error:', err);
          // Update loading message with error
          const lastMessage = this.messages[this.messages.length - 1];
          if (lastMessage.role === 'bot' && lastMessage.isLoading) {
            lastMessage.text = 'Sorry, I encountered an error. Please try again.';
            lastMessage.isLoading = false;
            this.shouldAutoScroll = true;
          }
          this.isGenerating = false;
        },
        complete: () => {
          this.isGenerating = false;
        },
      })
    })
  }

  onClosePanel() {
    this.closePanel.emit();
  }

  sendMessage(msg: string) {
    if (msg.trim()) {
      // save to tmp
      this.saveAgent(this.appName);

      // Add user message, hide try again message for now
      if (msg != "____Something went wrong, please try again") {
        this.messages.push({ role: 'user', text: msg });
      }

      const userText = msg;
      this.userMessage = '';

      // Add loading message for bot response
      this.messages.push({ role: 'bot', text: '', isLoading: true });
      this.shouldAutoScroll = true;
      this.isGenerating = true;

      const req: AgentRunRequest = {
        appName: this.assistantAppName,
        userId: this.userId,
        sessionId: this.currentSession,
        newMessage: {
          'role': 'user',
          'parts': [{'text': userText}],
        },
        streaming: false
      };

      this.agentService.runSse(req).subscribe({
        next: async (chunk) => {
          if (chunk.errorCode && (chunk.errorCode == "MALFORMED_FUNCTION_CALL" || chunk.errorCode == "STOP")) {
            this.sendMessage("____Something went wrong, please try again");
            return;
          }
          if (chunk.content) {
            let botText = '';
            for (let part of chunk.content.parts) {
              if (part.text) {
                botText += part.text;
              }
            }
            if (botText) {
              // Update the last message (remove loading, add text)
              const lastMessage = this.messages[this.messages.length - 1];
              if (lastMessage.role === 'bot' && lastMessage.isLoading) {
                lastMessage.text = botText;
                lastMessage.isLoading = false;
                this.shouldAutoScroll = true;
                this.reloadCanvas.emit();
              }
            }
          }
        },
        error: (err) => {
          console.error('SSE error:', err);
          // Update loading message with error
          const lastMessage = this.messages[this.messages.length - 1];
          if (lastMessage.role === 'bot' && lastMessage.isLoading) {
            lastMessage.text = 'Sorry, I encountered an error. Please try again.';
            lastMessage.isLoading = false;
            this.shouldAutoScroll = true;
          }
          this.isGenerating = false;
        },
        complete: () => {
          this.isGenerating = false;
        },
      });
    }
  }

  ngAfterViewChecked() {
    if (this.shouldAutoScroll) {
      this.scrollToBottom();
      this.shouldAutoScroll = false;
    }
  }

  private scrollToBottom(): void {
    try {
      if (this.chatMessages) {
        // Use setTimeout to ensure content is fully rendered (especially markdown)
        setTimeout(() => {
          this.chatMessages.nativeElement.scrollTop = this.chatMessages.nativeElement.scrollHeight;
        }, 50);
      }
    } catch (err) {
      console.error('Error scrolling to bottom:', err);
    }
  }

  onKeyDown(event: KeyboardEvent) {
    if (event.key === 'Enter') {
      if (event.shiftKey) {
        // Shift+Enter: Allow new line (default behavior)
        return;
      } else {
        // Enter only: Send message
        if (this.userMessage?.trim() && this.currentSession) {
          event.preventDefault();
          this.sendMessage(this.userMessage);
        }
      }
    }
  }


  private saveAgent(appName: string) {
    const rootAgent = this.agentBuilderService.getRootNode();

    if (!rootAgent) {
      return;
    }

    const formData = new FormData();

    const tabAgents = this.agentBuilderService.getCurrentAgentToolBoards();

    YamlUtils.generateYamlFile(rootAgent, formData, appName, tabAgents);

    this.agentService.agentBuildTmp(formData).subscribe((success) => {
      if (success) {
        console.log("save to tmp")
      } else {
        console.log("something went wrong");
      }
    });
  }
}
