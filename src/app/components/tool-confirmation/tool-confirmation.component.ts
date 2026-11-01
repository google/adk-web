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

import {ChangeDetectionStrategy, Component, computed, input, output, signal} from '@angular/core';
import {MatButtonModule} from '@angular/material/button';
import {MatIconModule} from '@angular/material/icon';

import {isFileEditCall} from '../../core/models/FileEdit';
import {isShellCommandCall} from '../../core/models/ShellCommand';
import {ConfirmationStatus, getConfirmationRequest, getConfirmationStatus} from '../../core/models/ToolConfirmation';
import type {FunctionCall, FunctionResponse} from '../../core/models/types';
import {CustomJsonViewerComponent} from '../custom-json-viewer/custom-json-viewer.component';
import {FileEditComponent} from '../file-edit/file-edit.component';
import {ShellCommandComponent} from '../shell-command/shell-command.component';

/**
 * A call the chat waits on a response for. The chat marks whether the response
 * was sent and which event the call came from.
 */
export interface PendingFunctionCall extends FunctionCall {
  responseStatus?: string;
  functionCallEventId?: string;
}

/** Label and icon for each approval status. */
const STATUS_LABELS: Record<ConfirmationStatus, {label: string, icon: string}> = {
  'requested': {label: 'Approval requested', icon: 'pending'},
  'approved': {label: 'Approved', icon: 'check_circle'},
  'rejected': {label: 'Rejected', icon: 'block'},
};

/**
 * Renders tool confirmation. For an `adk_request_confirmation` call, a card
 * with the call to approve, shown the way that tool's calls are shown, and
 * Approve and Reject buttons. For a response, the approval status: the user's
 * answer, or a tool's placeholder while it waited for approval.
 */
@Component({
  changeDetection: ChangeDetectionStrategy.OnPush,
  selector: 'app-tool-confirmation',
  templateUrl: './tool-confirmation.component.html',
  styleUrl: './tool-confirmation.component.scss',
  standalone: true,
  imports: [
    CustomJsonViewerComponent,
    FileEditComponent,
    MatButtonModule,
    MatIconModule,
    ShellCommandComponent,
  ],
})
export class ToolConfirmationComponent {
  /**
   * The `adk_request_confirmation` call. Its `responseStatus` is set once the
   * user answers, as the other long-running response forms do.
   */
  readonly functionCall = input<PendingFunctionCall>();
  readonly functionResponse = input<FunctionResponse>();

  /** The user's answer, as the content to send back to the agent. */
  readonly responseComplete = output<unknown>();

  protected readonly request =
      computed(() => getConfirmationRequest(this.functionCall()));
  protected readonly isShellCommand =
      computed(() => isShellCommandCall(this.request()?.call));
  protected readonly isFileEdit =
      computed(() => isFileEditCall(this.request()?.call));
  protected readonly hasPayload =
      computed(() => this.request()?.payload !== undefined);
  /** Set once the user answers, which hides the buttons. */
  protected readonly answered = signal(false);

  protected readonly status = computed(() => {
    const status = getConfirmationStatus(this.functionResponse());
    return status ? {status, ...STATUS_LABELS[status]} : null;
  });

  protected respond(confirmed: boolean) {
    const functionCall = this.functionCall();
    const request = this.request();
    if (!functionCall || !request) return;
    this.answered.set(true);
    functionCall.responseStatus = 'sent';
    this.responseComplete.emit({
      role: 'user',
      parts: [{
        functionResponse: {
          id: functionCall.id,
          name: functionCall.name,
          response: {
            confirmed,
            // The tool reads the payload it asked about, or the call's args
            // when it sent none.
            payload: request.payload ?? request.call.args,
          },
        },
      }],
      functionCallEventId: functionCall.functionCallEventId,
    });
  }
}
