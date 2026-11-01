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

import {ChangeDetectionStrategy, Component, inject, Inject} from '@angular/core';
import {
  MAT_DIALOG_DATA,
  MatDialogActions,
  MatDialogClose,
  MatDialogRef,
  MatDialogTitle
} from '@angular/material/dialog';
import { Router } from '@angular/router';
import { AgentNode } from '../../core/models/AgentBuilder';
import { YamlUtils } from '../../../utils/yaml-utils';
import { AGENT_SERVICE } from '../../core/services/interfaces/agent';
import { SnackbarService } from '../../core/services/snackbar.service';
import { MatFormField, MatHint } from '@angular/material/form-field';
import { MatInput } from '@angular/material/input';
import { FormsModule } from '@angular/forms';
import { MatButton } from '@angular/material/button';
import {isImeComposing} from '../../utils/keyboard-event.utils';

@Component({
  changeDetection: ChangeDetectionStrategy.Default,
  selector: 'app-add-item-dialog',
  templateUrl: './add-item-dialog.component.html',
  styleUrl: './add-item-dialog.component.scss',
  standalone: true,
  imports: [
    MatDialogTitle,
    MatFormField,
    MatInput,
    FormsModule,
    MatDialogActions,
    MatButton,
    MatDialogClose,
    MatHint,
  ],
})
export class AddItemDialogComponent {
  // TODO: Replace the eval dialogs to use this common dialog component
  protected newAppName = '';
  private agentService = inject(AGENT_SERVICE);
  private _snackbarService = inject(SnackbarService);
  private router = inject(Router);

  isNameValid(): boolean {
    const trimmedValue = this.newAppName.trim();

    // If empty after trimming, it's not valid
    if (!trimmedValue) {
      return false;
    }

    // Check if starts with letter or underscore
    if (!/^[a-zA-Z_]/.test(trimmedValue)) {
      return false;
    }

    // Check if contains only letters, digits, and underscores
    if (!/^[a-zA-Z_][a-zA-Z0-9_]*$/.test(trimmedValue)) {
      return false;
    }

    return true;
  }

  constructor(
    @Inject(MAT_DIALOG_DATA)
    public data: {existingAppNames: string[]},
    public dialogRef: MatDialogRef<AddItemDialogComponent>,
  ) {}

  createNewApp(event?: Event) {
    if (isImeComposing(event)) {
      return;
    }

    const trimmedName = this.newAppName.trim();

    // Check validation first
    if (!this.isNameValid()) {
      this._snackbarService.open(
        'App name must start with a letter or underscore and can only contain letters, digits, and underscores.',
        'OK',
      );
      return;
    }

    if (this.data.existingAppNames.includes(trimmedName)) {
      this._snackbarService.open(
        'App name already exists. Please choose a different name.',
        'OK',
      );
      return;
    }
    const rootAgent: AgentNode = {
      agent_class: 'LlmAgent',
      instruction: 'You are the root agent that coordinates other agents.',
      isRoot: true,
      model: 'gemini-2.5-flash',
      name: trimmedName,
      sub_agents: [],
      tools: [],
    };

    const formData = new FormData();

    const allTabAgents = new Map<string, AgentNode>();
    YamlUtils.generateYamlFile(rootAgent, formData, trimmedName, allTabAgents);

    this.agentService.agentBuildTmp(trimmedName, formData).subscribe((success) => {
      if (success) {
        this.router.navigate(['/'], {
            queryParams: { app: trimmedName, mode: 'builder' }
          }).then(() => {
            window.location.reload();
          });
        this.dialogRef.close(true);
      } else {
        this._snackbarService.open('Something went wrong, please try again', 'OK');
      }
    });
  }
}
