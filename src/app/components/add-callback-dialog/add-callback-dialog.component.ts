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

import { Component, Inject, ViewChild } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule, NgModel } from '@angular/forms';
import {
  MAT_DIALOG_DATA,
  MatDialogActions,
  MatDialogContent,
  MatDialogRef,
  MatDialogTitle,
  MatDialogModule,
} from '@angular/material/dialog';
import { MatButton, MatButtonModule } from '@angular/material/button';
import { MatError, MatFormField, MatFormFieldModule, MatLabel } from '@angular/material/form-field';
import { MatInput, MatInputModule } from '@angular/material/input';
import { ErrorStateMatcher } from '@angular/material/core';
import { FormControl } from '@angular/forms';
import { MatSelectModule } from '@angular/material/select';
import { CallbackNode } from '../../core/models/AgentBuilder';
import { TooltipUtil, CallbackInfo } from '../../../utils/tooltip-util';
import { MatIconModule } from '@angular/material/icon';

/** Error when invalid control is dirty, touched, or submitted. */
export class ImmediateErrorStateMatcher implements ErrorStateMatcher {
  isErrorState(control: FormControl | null): boolean {
    return !!(control && control.invalid);
  }
}

@Component({
  selector: 'app-add-callback-dialog',
  templateUrl: './add-callback-dialog.component.html',
  styleUrl: './add-callback-dialog.component.scss',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    MatDialogModule,
    MatButtonModule,
    MatFormFieldModule,
    MatInputModule,
    MatError,
    MatSelectModule,
    MatIconModule
  ],
})
export class AddCallbackDialogComponent {
  @ViewChild('callbackNameInput') callbackNameInput!: NgModel;
  callbackName = '';
  callbackType: string = '';
  existingCallbackNames: string[] = [];
  matcher = new ImmediateErrorStateMatcher();
  isEditMode = false;
  availableCallbackTypes: string[] = [];
  private originalCallbackName = '';
  isCallbackInfoExpanded = false;

  constructor(
    public dialogRef: MatDialogRef<AddCallbackDialogComponent>,
    @Inject(MAT_DIALOG_DATA)
    public data?: {
      callbackType: string;
      existingCallbackNames?: string[];
      isEditMode?: boolean;
      callback?: CallbackNode;
      availableCallbackTypes?: string[];
    },
  ) {
    this.callbackType = data?.callbackType ?? '';
    this.existingCallbackNames = data?.existingCallbackNames ?? [];
    this.isEditMode = !!data?.isEditMode;
    this.availableCallbackTypes = data?.availableCallbackTypes ?? [];

    if (this.isEditMode && data?.callback) {
      this.callbackName = data.callback.name;
      this.callbackType = data.callback.type;
      this.originalCallbackName = data.callback.name;
      this.existingCallbackNames = this.existingCallbackNames.filter(
        name => name !== this.originalCallbackName,
      );
    }
  }

  addCallback() {
    if (!this.callbackName.trim() || this.hasSpaces() || this.isDuplicateName()) {
      return;
    }

    const result = {
      name: this.callbackName.trim(),
      type: this.callbackType,
      isEditMode: this.isEditMode,
      originalName: this.originalCallbackName || this.callbackName.trim(),
    };

    this.dialogRef.close(result);
  }

  cancel() {
    this.dialogRef.close();
  }

  isDuplicateName(): boolean {
    if (!Array.isArray(this.existingCallbackNames)) {
      return false;
    }
    const trimmedCallbackName = (this.callbackName || '').trim();
    return this.existingCallbackNames.includes(trimmedCallbackName);
  }

  hasSpaces(): boolean {
    const regex = /\s/;
    return regex.test(this.callbackName || '');
  }

  createDisabled() {
    return !this.callbackName.trim() || this.isDuplicateName() || this.hasSpaces();
  }

  validate() {
    if (this.hasSpaces()) {
      this.callbackNameInput.control.setErrors({ hasSpaces: true });
    } else if (this.isDuplicateName()) {
      this.callbackNameInput.control.setErrors({ duplicateName: true });
    } else {
      this.callbackNameInput.control.setErrors(null);
    }
  }

  getCallbackInfo(): CallbackInfo | undefined {
    return TooltipUtil.getCallbackDetailedInfo(this.callbackType);
  }

  toggleCallbackInfo() {
    this.isCallbackInfoExpanded = !this.isCallbackInfoExpanded;
  }
}
