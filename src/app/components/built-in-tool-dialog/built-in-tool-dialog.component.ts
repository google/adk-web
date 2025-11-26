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

import { Component, Inject, OnInit, ViewChild } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { MAT_DIALOG_DATA, MatDialogActions, MatDialogClose, MatDialogContent, MatDialogRef, MatDialogTitle } from '@angular/material/dialog';
import { MatButton } from '@angular/material/button';
import { MatIcon } from '@angular/material/icon';
import { getToolIcon } from '../../core/constants/tool-icons';
import { JsonEditorComponent } from '../json-editor/json-editor.component';

interface ToolCategory {
  name: string;
  tools: string[];
}

@Component({
  selector: 'app-built-in-tool-dialog',
  templateUrl: './built-in-tool-dialog.component.html',
  styleUrl: './built-in-tool-dialog.component.scss',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    MatDialogTitle,
    MatDialogContent,
    MatIcon,
    MatDialogActions,
    MatButton,
    JsonEditorComponent,
  ],
})
export class BuiltInToolDialogComponent implements OnInit {
  @ViewChild(JsonEditorComponent) jsonEditorComponent!: JsonEditorComponent;
  selectedBuiltInTool = 'google_search';

  toolCategories: ToolCategory[] = [
    {
      name: 'Search Tools',
      tools: ['google_search', 'EnterpriseWebSearchTool', 'VertexAiSearchTool']
    },
    {
      name: 'Context Tools',
      tools: ['FilesRetrieval', 'load_memory', 'preload_memory', 'url_context', 'VertexAiRagRetrieval']
    },
    {
      name: 'Agent Function Tools',
      tools: ['exit_loop', 'get_user_choice', 'load_artifacts', 'LongRunningFunctionTool']
    }
  ];

  builtInToolArgs = new Map<string, string[]>([
    ['EnterpriseWebSearchTool', []],
    ['exit_loop', []],
    ['FilesRetrieval', ['name', 'description', 'input_dir']],
    ['get_user_choice', []],
    ['google_search', []],
    ['load_artifacts', []],
    ['load_memory', []],
    ['LongRunningFunctionTool', ['func']],
    ['preload_memory', []],
    ['url_context', []],
    ['VertexAiRagRetrieval', ['name', 'description', 'rag_corpora', 'rag_resources', 'similarity_top_k', 'vector_distance_threshold']],
    ['VertexAiSearchTool', ['data_store_id', 'data_store_specs', 'search_engine_id', 'filter', 'max_results']],
  ]);

  isEditMode = false;
  showArgsEditor = false;
  toolArgs: any = {};
  toolArgsString = '';

  constructor(
    @Inject(MAT_DIALOG_DATA)
    public data: { toolName?: string, isEditMode?: boolean, toolArgs?: any },
    public dialogRef: MatDialogRef<BuiltInToolDialogComponent>,
  ) {}

  ngOnInit() {
    this.isEditMode = this.data.isEditMode || false;

    if (this.isEditMode && this.data.toolName) {
      this.selectedBuiltInTool = this.data.toolName;

      // If editing and tool has args, show args editor directly
      const argNames = this.builtInToolArgs.get(this.data.toolName);
      if (argNames && argNames.length > 0) {
        // Initialize with existing args or empty values
        if (this.data.toolArgs) {
          this.toolArgs = { ...this.data.toolArgs };
          // Remove skip_summarization from display
          delete this.toolArgs.skip_summarization;
        } else {
          this.toolArgs = {};
          for (const argName of argNames) {
            this.toolArgs[argName] = '';
          }
        }
        this.toolArgsString = JSON.stringify(this.toolArgs, null, 2);
        this.showArgsEditor = true;
      }
    }
  }

  onToolSelected(toolName: string) {
    this.selectedBuiltInTool = toolName;

    // Check if this tool has arguments
    const argNames = this.builtInToolArgs.get(toolName);
    if (argNames && argNames.length > 0) {
      // Show the args editor view
      this.initializeToolArgs(toolName, argNames);
      this.showArgsEditor = true;
    }
  }

  initializeToolArgs(toolName: string, argNames: string[]) {
    this.toolArgs = {};
    for (const argName of argNames) {
      this.toolArgs[argName] = '';
    }
    this.toolArgsString = JSON.stringify(this.toolArgs, null, 2);
  }

  backToToolSelection() {
    this.showArgsEditor = false;
    this.toolArgs = {};
    this.toolArgsString = '';
  }

  saveArgs() {
    if (this.jsonEditorComponent) {
      try {
        this.toolArgsString = this.jsonEditorComponent.getJsonString();
        this.toolArgs = JSON.parse(this.toolArgsString);
      } catch (e) {
        alert('Invalid JSON: ' + e);
        return;
      }
    }
    this.addTool();
  }

  addTool() {
    const result: any = {
      toolType: 'Built-in tool',
      name: this.selectedBuiltInTool,
      isEditMode: this.isEditMode
    };

    // Include args if they were edited
    if (Object.keys(this.toolArgs).length > 0) {
      result.args = this.toolArgs;
    }

    this.dialogRef.close(result);
  }

  cancel() {
    this.dialogRef.close();
  }

  getToolIcon(toolName: string): string {
    return getToolIcon(toolName, 'Built-in tool');
  }
}
