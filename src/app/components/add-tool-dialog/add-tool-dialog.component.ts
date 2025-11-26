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

import { Component, Inject, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { MAT_DIALOG_DATA, MatDialogActions, MatDialogContent, MatDialogRef, MatDialogTitle } from '@angular/material/dialog';
import { MatButton, MatIconButton } from '@angular/material/button';
import { MatFormField } from '@angular/material/form-field';
import { MatInput } from '@angular/material/input';
import { MatOption, MatSelect } from '@angular/material/select';
import { MatIcon } from '@angular/material/icon';
import { TooltipUtil } from '../../../utils/tooltip-util';

@Component({
  selector: 'app-add-tool-dialog',
  templateUrl: './add-tool-dialog.component.html',
  styleUrl: './add-tool-dialog.component.scss',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    MatDialogTitle,
    MatDialogContent,
    MatFormField,
    MatInput,
    MatSelect,
    MatOption,
    MatDialogActions,
    MatButton,
    MatIconButton,
    MatIcon,
  ],
})
export class AddToolDialogComponent implements OnInit{
  toolName = '';
  toolType = 'Function tool';
  selectedBuiltInTool = 'google_search';

  builtInTools = [
    'EnterpriseWebSearchTool',
    'exit_loop',
    'FilesRetrieval',
    'get_user_choice',
    'google_search',
    'load_artifacts',
    'load_memory',
    'LongRunningFunctionTool',
    'preload_memory',
    'url_context',
    'VertexAiRagRetrieval',
    'VertexAiSearchTool',
  ];

  isEditMode = false;
  isToolInfoExpanded = false;

  constructor(
    @Inject(MAT_DIALOG_DATA)
    public data: {toolType: string, toolName?: string, isEditMode?: boolean},
    public dialogRef: MatDialogRef<AddToolDialogComponent>,
  ) {}


  ngOnInit() {
    this.toolType = this.data.toolType;
    this.isEditMode = this.data.isEditMode || false;

    if (this.isEditMode && this.data.toolName) {
      if (this.toolType === 'Function tool') {
        this.toolName = this.data.toolName;
      } else if (this.toolType === 'Built-in tool') {
        this.selectedBuiltInTool = this.data.toolName;
      }
    }
  }

  addTool() {
    if (this.toolType === 'Function tool' && !this.toolName.trim()) {
      return;
    }

    const result: any = {
      toolType: this.toolType,
      isEditMode: this.isEditMode
    };

    if (this.toolType === 'Function tool') {
      result.name = this.toolName.trim();
    } else if (this.toolType === 'Built-in tool') {
      result.name = this.selectedBuiltInTool;
    }

    this.dialogRef.close(result);
  }

  cancel() {
    this.dialogRef.close();
  }

  createDisabled() {
    return this.toolType === 'Function tool' && !this.toolName.trim();
  }

  getToolInfo() {
    return TooltipUtil.getToolDetailedInfo(this.toolType);
  }

  toggleToolInfo() {
    this.isToolInfoExpanded = !this.isToolInfoExpanded;
  }
}
