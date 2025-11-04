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
import {CommonModule} from '@angular/common';
import {
  MAT_DIALOG_DATA,
  MatDialogRef,
  MatDialogTitle,
  MatDialogContent,
  MatDialogActions,
} from '@angular/material/dialog';
import {MatButtonModule, MatIconButton} from '@angular/material/button';
import {MatFormFieldModule} from '@angular/material/form-field';
import {MatInputModule} from '@angular/material/input';
import {MatIcon} from '@angular/material/icon';
import {FormsModule} from '@angular/forms';
import {TooltipUtil} from '../../../utils/tooltip-util';

export interface ConfirmationDialogData {
  title: string;
  message: string;
  confirmButtonText?: string;
  showInput?: boolean;
  inputLabel?: string;
  inputPlaceholder?: string;
  inputValue?: string;
  showToolInfo?: boolean;
  toolType?: string;
}

@Component({
  selector: 'app-confirmation-dialog',
  templateUrl: './confirmation-dialog.component.html',
  styleUrls: ['./confirmation-dialog.component.scss'],
  standalone: true,
  imports: [
    CommonModule,
    MatButtonModule,
    MatIconButton,
    MatIcon,
    MatDialogTitle,
    MatDialogContent,
    MatDialogActions,
    MatFormFieldModule,
    MatInputModule,
    FormsModule,
  ],
})
export class ConfirmationDialogComponent {
  inputValue = '';
  isToolInfoExpanded = false;

  constructor(
    public dialogRef: MatDialogRef<ConfirmationDialogComponent>,
    @Inject(MAT_DIALOG_DATA) public data: ConfirmationDialogData,
  ) {
    this.inputValue = data.inputValue || '';
  }

  isInputValid(): boolean {
    const trimmedValue = this.inputValue.trim();
    
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

  onCancel(): void {
    this.dialogRef.close();
  }

  onConfirm(): void {
    if (this.data.showInput) {
      const trimmedValue = this.inputValue.trim();
      
      if (!this.isInputValid()) {
        return;
      }
      
      this.dialogRef.close(trimmedValue);
    } else {
      this.dialogRef.close('confirm');
    }
  }

  onKeyDown(event: KeyboardEvent): void {
    if (event.key === 'Enter' && this.data.showInput) {
      this.onConfirm();
    }
  }

  getToolInfo() {
    if (this.data.toolType) {
      return TooltipUtil.getToolDetailedInfo(this.data.toolType);
    }
    return undefined;
  }

  toggleToolInfo() {
    this.isToolInfoExpanded = !this.isToolInfoExpanded;
  }
}
