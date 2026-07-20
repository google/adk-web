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

import {ChangeDetectionStrategy, Component, inject} from '@angular/core';
import { MAT_DIALOG_DATA, MatDialogRef, MatDialogTitle, MatDialogContent, MatDialogActions, MatDialogClose } from '@angular/material/dialog';
import {uuidv4} from 'uuidv7';
import {EVAL_SERVICE} from '../../../../core/services/interfaces/eval';
import {AnalyticsService} from '../../../../core/services/analytics.service';
import { CdkScrollable } from '@angular/cdk/scrolling';
import { MatFormField } from '@angular/material/form-field';
import { MatInput } from '@angular/material/input';
import { FormsModule } from '@angular/forms';
import { MatButton } from '@angular/material/button';
import { MatProgressSpinner } from '@angular/material/progress-spinner';

@Component({
    changeDetection: ChangeDetectionStrategy.Default,
    selector: 'app-add-eval-session-dialog',
    templateUrl: './add-eval-session-dialog.component.html',
    styleUrl: './add-eval-session-dialog.component.scss',
    imports: [
        MatDialogTitle,
        CdkScrollable,
        MatDialogContent,
        MatFormField,
        MatInput,
        FormsModule,
        MatDialogActions,
        MatButton,
        MatDialogClose,
        MatProgressSpinner,
    ],
})
export class AddEvalSessionDialogComponent {
  private readonly evalService = inject(EVAL_SERVICE);
  readonly data: {
    appName: string;
    userId: string;
    sessionId: string;
    evalSetId: string;
    defaultName?: string;
    existingCases?: string[];
  } = inject(MAT_DIALOG_DATA);
  readonly dialogRef = inject(MatDialogRef<AddEvalSessionDialogComponent>);
  private readonly analyticsService = inject(AnalyticsService);

  newCaseId: string = this.data.defaultName || ('case_' + uuidv4().slice(0, 6));
  loading = false;

  constructor() {}

  createNewEvalCase() {
    if (!this.newCaseId || this.newCaseId == '') {
      alert('Cannot create eval set with empty id!');
    } else {
      if (this.data.existingCases?.includes(this.newCaseId)) {
        if (!confirm(`Eval case "${this.newCaseId}" already exists. Do you want to overwrite it?`)) {
          return;
        }
      }
      this.loading = true;
      this.evalService
          .addCurrentSession(
              this.data.appName,
              this.data.evalSetId,
              this.newCaseId,
              this.data.sessionId,
              this.data.userId,
              )
          .subscribe({
            next: (res) => {
              this.analyticsService.sendEvent('eval_create_click');
              this.dialogRef.close(true);
            },
            error: (err) => {
              this.loading = false;
              alert('Failed to add session to eval set!');
            }
          });
    }
  }
}
