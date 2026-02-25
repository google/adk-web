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

import {ChangeDetectorRef, Component, EventEmitter, inject, Input, Output} from '@angular/core';
import {FormsModule} from '@angular/forms';
import {MatIconButton} from '@angular/material/button';
import {MatIcon} from '@angular/material/icon';
import {AgentRunRequest} from '../../core/models/AgentRunRequest';
import {AGENT_SERVICE} from '../../core/services/interfaces/agent';

@Component({
  selector: 'app-long-running-response',
  templateUrl: './long-running-response.html',
  styleUrl: './long-running-response.scss',
  imports: [
    FormsModule,
    MatIconButton,
    MatIcon,
  ],
})
export class LongRunningResponseComponent {
  @Input() functionCall: any;
  @Input() appName!: string;
  @Input() userId!: string;
  @Input() sessionId!: string;

  @Output() responseComplete = new EventEmitter<any[]>();

  private readonly agentService = inject(AGENT_SERVICE);
  private readonly cdr = inject(ChangeDetectorRef);
  private responseChunks: any[] = [];

  onSend() {
    if (!this.functionCall.userResponse || !this.functionCall.userResponse.trim()) {
      return;
    }

    // Update status to sending
    this.functionCall.responseStatus = 'sending';
    this.cdr.detectChanges();

    const req: AgentRunRequest = {
      appName: this.appName,
      userId: this.userId,
      sessionId: this.sessionId,
      newMessage: {
        role: 'user',
        parts: [{
          function_response: {
            id: this.functionCall.id,
            name: this.functionCall.name,
            response: {'response': this.functionCall.userResponse},
          },
        }],
      },
      functionCallEventId: this.functionCall.functionCallEventId,
    };

    this.responseChunks = []; // Reset chunks array
    this.agentService.runSse(req).subscribe({
      next: async (chunkJson) => {
        this.responseChunks.push(chunkJson);
      },
      error: (err) => {
        console.error('SSE error:', err);
        this.functionCall.responseStatus = 'pending'; // Reset on error
        this.responseChunks = [];
        this.cdr.detectChanges();
      },
      complete: () => {
        console.log('Long-running response complete for:', this.functionCall.name);
        this.functionCall.responseStatus = 'sent';
        this.responseComplete.emit(this.responseChunks); // Emit chunks for processing
        this.cdr.detectChanges();
      },
    });
  }
}
