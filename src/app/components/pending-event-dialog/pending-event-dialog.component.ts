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

import {Component, Inject} from '@angular/core';
import { MAT_DIALOG_DATA, MatDialogRef, MatDialogTitle, MatDialogContent, MatDialogActions, MatDialogClose } from '@angular/material/dialog';
import {AgentRunRequest} from '../../core/models/AgentRunRequest';
import {AgentService, AGENT_SERVICE} from '../../core/services/agent.service';
import { NgIf } from '@angular/common';
import { CdkScrollable } from '@angular/cdk/scrolling';
import { MatFormField, MatLabel } from '@angular/material/form-field';
import { MatInput } from '@angular/material/input';
import { FormsModule } from '@angular/forms';
import { MatButton } from '@angular/material/button';

@Component({
    selector: 'app-pending-event-dialog',
    templateUrl: './pending-event-dialog.component.html',
    styleUrl: './pending-event-dialog.component.scss',
    imports: [
        MatDialogTitle,
        NgIf,
        CdkScrollable,
        MatDialogContent,
        MatFormField,
        MatLabel,
        MatInput,
        FormsModule,
        MatDialogActions,
        MatButton,
        MatDialogClose,
    ],
})
export class PendingEventDialogComponent {
  selectedEvent: any = null;
  appName: string;
  userId: string;
  sessionId: string;
  functionCallEventId: string;
  sending: boolean = false;
  response: any[] = [];

  constructor(
    public dialogRef: MatDialogRef<PendingEventDialogComponent>,
    @Inject(MAT_DIALOG_DATA) public data: any,
    @Inject(AGENT_SERVICE) private agentService: AgentService,
  ) {
    this.selectedEvent = data.event;
    this.appName = data.appName;
    this.userId = data.userId;
    this.sessionId = data.sessionId;
    this.functionCallEventId = data.functionCallEventId;
  }

  argsToJson(args: any) {
    return JSON.stringify(args);
  }

  sendResponse() {
    this.sending = true;
    const req: AgentRunRequest = {
      appName: this.appName,
      userId: this.userId,
      sessionId: this.sessionId,
      newMessage: {
        'role': 'user',
        'parts': [],
      },
    };
    if (this.selectedEvent.response) {
      req.functionCallEventId = this.functionCallEventId;
      req.newMessage.parts.push({
        'function_response': {
          id: this.selectedEvent.id,
          name: this.selectedEvent.name,
          response: {'response': this.selectedEvent.response},
        },
      });
    }

    this.agentService.runSse(req).subscribe({
      next: async (chunk) => {
        const chunkJson = JSON.parse(chunk);
        this.response.push(chunkJson);
      },
      error: (err) => console.error('SSE error:', err),
      complete: () => {
        this.sending = false;
        this.dialogRef.close({
          response: this.response,
          events: [this.selectedEvent],
        });
      },
    });
  }
}
