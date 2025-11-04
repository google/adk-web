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

import {Component, inject, Inject} from '@angular/core';
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
import { MatSnackBar } from '@angular/material/snack-bar';
import { MatFormField, MatHint } from '@angular/material/form-field';
import { MatInput } from '@angular/material/input';
import { FormsModule } from '@angular/forms';
import { MatButton } from '@angular/material/button';

@Component({
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
  private _snackBar = inject(MatSnackBar);
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

  createNewApp() {
    const trimmedName = this.newAppName.trim();

    // Check validation first
    if (!this.isNameValid()) {
      this._snackBar.open(
        'App name must start with a letter or underscore and can only contain letters, digits, and underscores.',
        'OK',
      );
      return;
    }

    if (this.data.existingAppNames.includes(trimmedName)) {
      this._snackBar.open(
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

    this.agentService.agentBuildTmp(formData).subscribe((success) => {
      if (success) {
        this.router.navigate(['/'], {
            queryParams: { app: trimmedName, mode: 'builder' }
          }).then(() => {
            window.location.reload();
          });
        this.dialogRef.close(true);
      } else {
        this._snackBar.open('Something went wrong, please try again', 'OK');
      }
    });
  }
}
