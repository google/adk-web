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

import {Component, inject} from '@angular/core';
import { MAT_DIALOG_DATA, MatDialogRef, MatDialogTitle, MatDialogContent, MatDialogActions, MatDialogClose } from '@angular/material/dialog';
import {AgentRunRequest} from '../../core/models/AgentRunRequest';
import {AGENT_SERVICE} from '../../core/services/interfaces/agent';
import {PENDING_EVENT_SERVICE, PendingEventService} from '../../core/services/interfaces/pendingevent';
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
  readonly dialogRef = inject(MatDialogRef<PendingEventDialogComponent>);
  readonly data: any = inject(MAT_DIALOG_DATA);
  private readonly agentService = inject(AGENT_SERVICE);
  private readonly pendingEventService = inject(PENDING_EVENT_SERVICE);

  selectedEvent: any = this.data.event;
  appName: string = this.data.appName;
  userId: string = this.data.userId;
  sessionId: string = this.data.sessionId;
  functionCallEventId: string = this.data.functionCallEventId;
  sending: boolean = false;
  response: any[] = [];

  constructor() {}

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
      invocationId: this.data.invocationId
    };
    if (this.selectedEvent.response) {
      req.functionCallEventId = this.functionCallEventId;
      req.newMessage.parts.push(this.pendingEventService.createFunctionResponse(
          this.selectedEvent.id,
          this.selectedEvent.name,
          {'response': this.selectedEvent.response},
          ));
    }

    this.agentService.runSse(req).subscribe({
      next: async (chunkJson) => {
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
