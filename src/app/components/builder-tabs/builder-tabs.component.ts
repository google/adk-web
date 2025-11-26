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

import { CommonModule } from '@angular/common';
import { ChangeDetectionStrategy, ChangeDetectorRef, Component, EventEmitter, inject, Input, Output, signal, ViewChild } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { MatButton, MatIconButton } from '@angular/material/button';
import { MatCheckbox } from '@angular/material/checkbox';
import { MatDialog } from '@angular/material/dialog';
import { MatFormField, MatLabel } from '@angular/material/form-field';
import { MatIcon } from '@angular/material/icon';
import { MatInput } from '@angular/material/input';
import { MatOption, MatSelect } from '@angular/material/select';
import { MatSnackBar } from '@angular/material/snack-bar';
import {MatExpansionModule} from '@angular/material/expansion';
import { MatTooltip } from '@angular/material/tooltip';
import { Router } from '@angular/router';
import { Observable } from 'rxjs';
import { YamlUtils } from '../../../utils/yaml-utils';
import { AgentNode, ToolNode, CallbackNode } from '../../core/models/AgentBuilder';
import { getToolIcon } from '../../core/constants/tool-icons';
import { AGENT_SERVICE } from '../../core/services/interfaces/agent';
import {AGENT_BUILDER_SERVICE} from '../../core/services/interfaces/agent-builder';
import { AddCallbackDialogComponent } from '../add-callback-dialog/add-callback-dialog.component';
import { AddToolDialogComponent } from '../add-tool-dialog/add-tool-dialog.component';
import { BuiltInToolDialogComponent } from '../built-in-tool-dialog/built-in-tool-dialog.component';
import { ConfirmationDialogComponent, ConfirmationDialogData } from '../confirmation-dialog/confirmation-dialog.component';
import { JsonEditorComponent } from '../json-editor/json-editor.component';
import {FEATURE_FLAG_SERVICE} from '../../core/services/interfaces/feature-flag';
import { MatMenu, MatMenuItem, MatMenuTrigger } from "@angular/material/menu";
import { MatChipsModule } from '@angular/material/chips';
import { MatDividerModule } from '@angular/material/divider';
import { TooltipUtil } from '../../../utils/tooltip-util';
import { ThemeToggle } from '../theme-toggle/theme-toggle';

@Component({
  selector: 'app-builder-tabs',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    MatButton,
    MatCheckbox,
    MatExpansionModule,
    MatFormField,
    MatIcon,
    MatInput,
    MatIconButton,
    MatLabel,
    MatOption,
    MatSelect,
    MatTooltip,
    MatMenu,
    MatMenuTrigger,
    MatMenuItem,
    MatChipsModule,
    MatDividerModule,
    ThemeToggle
  ],
  templateUrl: './builder-tabs.component.html',
  styleUrl: './builder-tabs.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class BuilderTabsComponent {
  // Tab indices
  private readonly CALLBACKS_TAB_INDEX = 3;
  @ViewChild(JsonEditorComponent) jsonEditorComponent!: JsonEditorComponent;
  @Input() appNameInput: string = '';
  @Output() exitBuilderMode = new EventEmitter<void>();
  @Output() readonly closePanel = new EventEmitter<void>();

  readonly featureFlagService = inject(FEATURE_FLAG_SERVICE);
  readonly isAlwaysOnSidePanelEnabledObs =
      this.featureFlagService.isAlwaysOnSidePanelEnabled();

  protected toolArgsString = signal('');
  editingToolArgs = signal(false);
  public editingTool: ToolNode | null = null;
  public selectedTabIndex = 0;

  // Agent configuration properties
  agentConfig: AgentNode | undefined = {
    isRoot: false,
    name: '',
    agent_class: '',
    model: '',
    instruction: '',
    sub_agents: [],
    tools: [],
    callbacks: []
  };

  // Breadcrumb tracking
  hierarchyPath: AgentNode[] = [];
  currentSelectedAgent: AgentNode | undefined = undefined;

  // Agent configuration options
  isRootAgentEditable: boolean = true;

  models = [
    "gemini-2.5-flash",
    "gemini-2.5-pro"
  ];

  agentTypes = [
    'LlmAgent',
    'LoopAgent',
    'ParallelAgent',
    'SequentialAgent'
  ];

  private agentBuilderService = inject(AGENT_BUILDER_SERVICE);
  private dialog = inject(MatDialog);
  private agentService = inject(AGENT_SERVICE);
  private snackBar = inject(MatSnackBar);
  private router = inject(Router);
  private cdr = inject(ChangeDetectorRef);

  protected selectedTool: ToolNode | undefined = undefined;
  protected toolAgentName: string = '';
  protected toolTypes = [
    'Custom tool',
    'Function tool',
    'Built-in tool',
    'Agent Tool'
  ];

  // Callback-related properties
  public editingCallback: CallbackNode | null = null;
  public selectedCallback: CallbackNode | undefined = undefined;
  public callbackTypes = [
    'before_agent',
    'before_model',
    'before_tool',
    'after_tool',
    'after_model',
    'after_agent',
  ];
  protected builtInTools = [
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
  protected builtInToolArgs = new Map<string, string[]>([
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
  protected header = 'Select an agent or tool to edit'
  public toolsMap$: Observable<Map<string, ToolNode[]>>;
  public callbacksMap$: Observable<Map<string, CallbackNode[]>>;

  private getJsonStringForEditor(args: any): string {
    if (!args) {
      return '{}';
    }
    const editorArgs = { ...args };
    delete editorArgs.skip_summarization;
    return JSON.stringify(editorArgs, null, 2);
  }

  constructor() {
    this.toolsMap$ = this.agentBuilderService.getAgentToolsMap();
    this.callbacksMap$ = this.agentBuilderService.getAgentCallbacksMap();
    this.agentBuilderService.getSelectedNode().subscribe(node => {
      this.agentConfig = node;
      this.currentSelectedAgent = node;
      if (node) {
        this.editingTool = null;
        this.editingCallback = null;
        this.header = 'Agent configuration';
        this.updateBreadcrumb(node);
      }
      this.cdr.markForCheck();
    });

    this.agentBuilderService.getSelectedTool().subscribe(tool => {
      this.selectedTool = tool;
      if (tool && tool.toolType === 'Agent Tool') {
        return;
      } else if (tool) {
        this.editingTool = tool;
        this.editingToolArgs.set(false);

        setTimeout(() => {
          const toolName = tool.toolType == "Function tool" ? 'Function tool' : tool.name
          if (tool.toolType == "Function tool" && !tool.name) {
            tool.name = 'Function tool';
          }

          // Initialize args for Custom tools
          if (tool.toolType === 'Custom tool') {
            if (!tool.args) {
              tool.args = {};
            }
            this.toolArgsString.set(this.getJsonStringForEditor(tool.args));
            this.editingToolArgs.set(true);
          } else {
            // Handle Built-in and Function tools
            const argNames = this.builtInToolArgs.get(toolName);
            if (argNames) {
              if (!tool.args) {
                tool.args = {};
              }
              for (const argName of argNames) {
                if(tool.args) tool.args[argName] = '';
              }
            }
            this.toolArgsString.set(this.getJsonStringForEditor(tool.args));
            if (tool.args && this.getObjectKeys(tool.args).length > 0) {
              this.editingToolArgs.set(true);
            }
          }
          this.cdr.markForCheck();
        });

        this.selectedTabIndex = 2;
      } else {
        this.editingTool = null;
      }
      this.cdr.markForCheck();
    });

    this.agentBuilderService.getSelectedCallback().subscribe(callback => {
      this.selectedCallback = callback;
      if (callback) {
        this.selectCallback(callback);
        this.selectedTabIndex = this.CALLBACKS_TAB_INDEX;
      } else {
        this.editingCallback = null;
      }
      this.cdr.markForCheck();
    });

    this.agentBuilderService.getAgentCallbacks().subscribe(update => {
      if (this.agentConfig && update && this.agentConfig.name === update.agentName) {
        // Create a new object reference to ensure change detection works with OnPush strategy
        this.agentConfig = {
          ...this.agentConfig,
          callbacks: update.callbacks
        };
        this.cdr.markForCheck();
      }
    });
    this.agentBuilderService.getSideTabChangeRequest().subscribe(tabName => {
      if (tabName === 'tools') {
        this.selectedTabIndex = 2;
      } else if (tabName === 'config') {
        this.selectedTabIndex = 0;
      }
    });
  }

  getObjectKeys(obj: any): string[] {
    if (!obj) {
      return [];
    }
    return Object.keys(obj).filter(key => key !== 'skip_summarization');
  }

  getCallbacksByType(): Map<string, CallbackNode[]> {
    const callbackGroups = new Map<string, CallbackNode[]>();

    // Initialize groups for all callback types with empty arrays
    this.callbackTypes.forEach(type => {
      callbackGroups.set(type, []);
    });

    // Group callbacks by type if they exist
    if (this.agentConfig?.callbacks) {
      this.agentConfig.callbacks.forEach(callback => {
        const group = callbackGroups.get(callback.type);
        if (group) {
          group.push(callback);
        }
      });
    }

    return callbackGroups;
  }

  private updateBreadcrumb(agent: AgentNode) {
    this.hierarchyPath = this.buildHierarchyPath(agent);
  }

  private buildHierarchyPath(targetAgent: AgentNode): AgentNode[] {
    const path: AgentNode[] = [];

    // Find the appropriate root agent for the current context
    const rootAgent = this.findContextualRoot(targetAgent);
    if (!rootAgent) {
      return [targetAgent];
    }

    if (targetAgent.name === rootAgent.name) {
      return [rootAgent];
    }

    const foundPath = this.findPathToAgent(rootAgent, targetAgent, [rootAgent]);
    return foundPath || [targetAgent];
  }

  protected isInAgentToolContext(): boolean {
    if (!this.hierarchyPath || this.hierarchyPath.length === 0) {
      return false;
    }

    const rootAgent = this.hierarchyPath[0];
    return rootAgent?.isAgentTool === true;
  }

  private findContextualRoot(targetAgent: AgentNode): AgentNode | undefined {
    if (targetAgent.isAgentTool) {
      return targetAgent;
    }

    // Check if any agent tool contains this target in its hierarchy
    const allNodes = this.agentBuilderService.getNodes();
    for (const node of allNodes) {
      if (node.isAgentTool && this.findPathToAgent(node, targetAgent, [node])) {
        return node;
      }
    }

    const mainRoot = this.agentBuilderService.getRootNode();
    if (mainRoot && this.findPathToAgent(mainRoot, targetAgent, [mainRoot])) {
      return mainRoot;
    }

    // If target itself is the main root
    if (targetAgent.isRoot) {
      return targetAgent;
    }

    // Check if any other root agent contains this target
    for (const node of allNodes) {
      if (node.isRoot && this.findPathToAgent(node, targetAgent, [node])) {
        return node;
      }
    }

    // If still not found, return the main root as fallback
    return mainRoot;
  }

  private findPathToAgent(current: AgentNode, target: AgentNode, currentPath: AgentNode[]): AgentNode[] | null {
    // If we found the target, return the current path
    if (current.name === target.name) {
      return currentPath;
    }

    // Search in sub-agents only
    for (const subAgent of current.sub_agents) {
      const newPath = [...currentPath, subAgent];
      const result = this.findPathToAgent(subAgent, target, newPath);
      if (result) {
        return result;
      }
    }

    return null;
  }

  selectAgentFromBreadcrumb(agent: AgentNode) {
    this.agentBuilderService.setSelectedNode(agent);
    this.selectedTabIndex = 0; // Switch to Config tab
  }

  selectAgent(agent: AgentNode) {
    this.agentBuilderService.setSelectedNode(agent);
    this.selectedTabIndex = 0; // Switch to Config tab
  }

  selectTool(tool: ToolNode) {
    if (tool.toolType === 'Agent Tool') {
      const agentToolName = tool.name;
      this.agentBuilderService.requestNewTab(agentToolName);
      return;
    }

    // Open edit dialog for Function tool and Built-in tool
    if (tool.toolType === 'Function tool' || tool.toolType === 'Built-in tool') {
      this.editTool(tool);
      return;
    }

    this.agentBuilderService.setSelectedTool(tool);
  }

  editTool(tool: ToolNode) {
    if (!this.agentConfig) return;

    let dialogRef;

    if (tool.toolType === 'Built-in tool') {
      dialogRef = this.dialog.open(BuiltInToolDialogComponent, {
        width: '700px',
        maxWidth: '90vw',
        data: {
          toolName: tool.name,
          isEditMode: true,
          toolArgs: tool.args
        }
      });
    } else {
      dialogRef = this.dialog.open(AddToolDialogComponent, {
        width: '500px',
        data: {
          toolType: tool.toolType,
          toolName: tool.name,
          isEditMode: true
        }
      });
    }

    dialogRef.afterClosed().subscribe(result => {
      if (result && result.isEditMode) {
        // Update the tool name and args
        const toolIndex = this.agentConfig!.tools?.findIndex(t => t.name === tool.name);
        if (toolIndex !== undefined && toolIndex !== -1 && this.agentConfig!.tools) {
          this.agentConfig!.tools[toolIndex].name = result.name;

          // Update args if provided
          if (result.args) {
            this.agentConfig!.tools[toolIndex].args = result.args;
          }

          // Trigger update in the service
          this.agentBuilderService.setAgentTools(this.agentConfig!.name, this.agentConfig!.tools);
        }
      }
    });
  }

  addTool(toolType: string) {
    if (this.agentConfig) {
      let dialogRef;

      if (toolType === 'Built-in tool') {
        dialogRef = this.dialog.open(BuiltInToolDialogComponent, {
          width: '700px',
          maxWidth: '90vw',
          data: {}
        });
      } else {
        dialogRef = this.dialog.open(AddToolDialogComponent, {
          width: '500px',
          data: {toolType: toolType}
        });
      }

        dialogRef.afterClosed().subscribe(result => {
          if (result) {
            const tool: any = {
              toolType: result.toolType,
              name: result.name
            };

            this.agentBuilderService.addTool(this.agentConfig!.name, tool);

            // Automatically select the newly created tool
            this.agentBuilderService.setSelectedTool(tool);
          }
        });
    }
  }

  addCallback(callbackType: string) {
    if (this.agentConfig) {
      const existingCallbackNames = this.agentConfig?.callbacks?.map(c => c.name) ?? [];
      const dialogRef = this.dialog.open(AddCallbackDialogComponent, {
        width: '500px',
        data: {
          callbackType: callbackType,
          existingCallbackNames: existingCallbackNames
        }
      });

      dialogRef.afterClosed().subscribe(result => {
        if (result) {
          const callback: CallbackNode = {
            name: result.name,
            type: result.type,
          };

          this.agentBuilderService.addCallback(this.agentConfig!.name, callback);
        }
      });
    }
  }

  editCallback(callback: CallbackNode) {
    if (!this.agentConfig) {
      return;
    }

    const existingCallbackNames = this.agentConfig.callbacks?.map(c => c.name) ?? [];
    const dialogRef = this.dialog.open(AddCallbackDialogComponent, {
      width: '500px',
      data: {
        callbackType: callback.type,
        existingCallbackNames,
        isEditMode: true,
        callback,
        availableCallbackTypes: this.callbackTypes,
      },
    });

    dialogRef.afterClosed().subscribe(result => {
      if (result && result.isEditMode) {
        const updateResult = this.agentBuilderService.updateCallback(
          this.agentConfig!.name,
          callback.name,
          {
            ...callback,
            name: result.name,
            type: result.type,
          },
        );

        if (!updateResult.success) {
          console.error('Failed to update callback:', updateResult.error);
        } else {
          this.cdr.markForCheck();
        }
      }
    });
  }

  deleteCallback(agentName: string, callback: any) {
    const dialogRef = this.dialog.open(ConfirmationDialogComponent, {
      data: {
        title: 'Delete Callback',
        message: `Are you sure you want to delete ${callback.name}?`,
        confirmButtonText: 'Delete'
      },
    });

    dialogRef.afterClosed().subscribe(result => {
      if (result === 'confirm') {
        const deleteResult = this.agentBuilderService.deleteCallback(agentName, callback);
        if (!deleteResult.success) {
          console.error('Failed to delete callback:', deleteResult.error);
        } else {
          // Force change detection to update the UI immediately
          this.cdr.markForCheck();
        }
      }
    });
  }

  addSubAgent(parentAgentName: string|undefined) {
    if (!parentAgentName) {
      return ;
    }

    this.agentBuilderService.setAddSubAgentSubject(parentAgentName);
  }

  deleteSubAgent(agentName: string) {
    this.agentBuilderService.setDeleteSubAgentSubject(agentName);
  }

  deleteTool(agentName: string, tool: any) {
    const isAgentTool = tool.toolType === 'Agent Tool';
    const toolDisplayName = isAgentTool ? (tool.toolAgentName || tool.name) : tool.name;

    const dialogRef = this.dialog.open(ConfirmationDialogComponent, {
      data: {
        title: isAgentTool ? 'Delete Agent Tool' : 'Delete Tool',
        message: isAgentTool
          ? `Are you sure you want to delete the agent tool "${toolDisplayName}"? This will also delete the corresponding board.`
          : `Are you sure you want to delete ${toolDisplayName}?`,
        confirmButtonText: 'Delete'
      },
    });

    dialogRef.afterClosed().subscribe(result => {
      if (result === 'confirm') {
        if (tool.toolType === 'Agent Tool') {
          const agentToolName = tool.toolAgentName || tool.name;
          this.deleteAgentToolAndBoard(agentName, tool, agentToolName);
        } else {
          this.agentBuilderService.deleteTool(agentName, tool);
        }
      }
    });
  }

  deleteAgentToolAndBoard(agentName: string, tool: any, agentToolName: string) {
    this.agentBuilderService.deleteTool(agentName, tool);

    this.agentBuilderService.requestTabDeletion(agentToolName);
  }


  backToToolList() {
    this.editingTool = null;
    this.agentBuilderService.setSelectedTool(undefined);
  }

  editToolArgs() {
    this.editingToolArgs.set(true);
  }

  cancelEditToolArgs(tool: ToolNode | undefined | null) {
    this.editingToolArgs.set(false);
    this.toolArgsString.set(this.getJsonStringForEditor(tool?.args));
  }

  saveToolArgs(tool: ToolNode | undefined | null) {
    if (this.jsonEditorComponent && tool) {
      try {
        const updatedArgs = JSON.parse(this.jsonEditorComponent.getJsonString()) as { [key: string]: any; } | undefined;
        const skipSummarization = tool.args ? tool.args['skip_summarization'] : false;
        tool.args = updatedArgs;
        tool.args!['skip_summarization'] = skipSummarization;
        this.toolArgsString.set(JSON.stringify(tool.args, null, 2));
        this.editingToolArgs.set(false);
      } catch (e) {
        console.error('Error parsing tool arguments JSON', e);
      }
    }
  }

  onToolTypeSelectionChange(tool: ToolNode | undefined | null) {
    if (tool?.toolType === 'Built-in tool') {
      tool.name = 'google_search';
      this.onBuiltInToolSelectionChange(tool);
    } else if (tool?.toolType === 'Custom tool') {
      tool.args = {};
      this.toolArgsString.set(this.getJsonStringForEditor(tool.args));
      this.editingToolArgs.set(true);
    } else if (tool) {
      tool.name = '';
      tool.args = {skip_summarization: false};
      this.toolArgsString.set('{}');
      this.editingToolArgs.set(false);
    }
  }

  onBuiltInToolSelectionChange(tool: ToolNode | undefined | null) {
    if (tool) {
      // Force re-initialization of the JSON editor by toggling the signal
      this.editingToolArgs.set(false);

      setTimeout(() => {
        tool.args = {skip_summarization: false};
        const argNames = this.builtInToolArgs.get(tool.name);
        if (argNames) {
          for (const argName of argNames) {
            if(tool.args) tool.args[argName] = '';
          }
        }
        this.toolArgsString.set(this.getJsonStringForEditor(tool.args));
        if (tool.args && this.getObjectKeys(tool.args).length > 0) {
          this.editingToolArgs.set(true);
        }
        this.cdr.markForCheck();
      });
    }
  }

  selectCallback(callback: CallbackNode) {
    this.editingCallback = callback;
  }

  backToCallbackList() {
    this.editingCallback = null;
  }

  onCallbackTypeChange(callback: CallbackNode | undefined | null) {
    if (callback) {
      // Type is already set by the select binding
      // Additional logic can be added here if needed
    }
  }

  createAgentTool() {
    const dialogRef = this.dialog.open(ConfirmationDialogComponent, {
      width: '750px',
      height: '450px',
      data: {
        title: 'Create Agent Tool',
        message: 'Please enter a name for the agent tool:',
        confirmButtonText: 'Create',
        showInput: true,
        inputLabel: 'Agent Tool Name',
        inputPlaceholder: 'Enter agent tool name',
        showToolInfo: true,
        toolType: 'Agent tool'
      } as ConfirmationDialogData
    });

    dialogRef.afterClosed().subscribe(result => {
      if (result && typeof result === 'string') {
        let currentAgentName = this.agentConfig?.name || 'root_agent';

        this.agentBuilderService.requestNewTab(result, currentAgentName);
      }
    });
  }

  saveChanges() {
    const rootAgent = this.agentBuilderService.getRootNode();

    if (!rootAgent) {
      this.snackBar.open("Please create an agent first.", "OK");
      return;
    }

    // Use input parameter if available, otherwise get from agent service
    if (this.appNameInput) {
      this.saveAgent(this.appNameInput);
    } else {
      this.agentService.getApp().subscribe(appName => {
        if (appName) {
          this.saveAgent(appName);
        } else {
          this.snackBar.open("No agent selected. Please select an agent first.", "OK");
        }
      });
    }
  }

  cancelChanges() {
    this.agentService.agentChangeCancel(this.appNameInput).subscribe((s: any) => {})
    this.exitBuilderMode.emit();
  }

  private saveAgent(appName: string) {
    const rootAgent = this.agentBuilderService.getRootNode();

    if (!rootAgent) {
      this.snackBar.open("Please create an agent first.", "OK");
      return;
    }

    const formData = new FormData();

    const tabAgents = this.agentBuilderService.getCurrentAgentToolBoards();

    YamlUtils.generateYamlFile(rootAgent, formData, appName, tabAgents);

    this.agentService.agentBuildTmp(formData).subscribe((success) => {
      if (success) {
        this.agentService.agentBuild(formData).subscribe((success) => {
          if (success) {
            this.router.navigate(['/'], {
              queryParams: { app: appName }
            }).then(() => {
              window.location.reload();
            });
          } else {
            this.snackBar.open("Something went wrong, please try again", "OK");
          }
        });
      }
    })


  }

  getToolIcon(tool: ToolNode): string {
    return getToolIcon(tool.name, tool.toolType);
  }

  getAgentIcon(agentClass: string | undefined): string {
    switch (agentClass) {
      case 'SequentialAgent':
        return 'more_horiz';
      case 'LoopAgent':
        return 'sync';
      case 'ParallelAgent':
        return 'density_medium';
      case 'LlmAgent':
      default:
        return 'psychology';
    }
  }

  addSubAgentWithType(agentClass: string) {
    if (!this.agentConfig?.name) {
      return;
    }

    // For workflow agents (non-LlmAgent), set isFromEmptyGroup to true so the sub-agent is added inside the group
    const isWorkflowAgent = this.agentConfig.agent_class !== 'LlmAgent';

    this.agentBuilderService.setAddSubAgentSubject(this.agentConfig.name, agentClass, isWorkflowAgent);
  }

  callbackMenuTooltips(callbackName: string) {
    return TooltipUtil.getCallbackMenuTooltips(callbackName);
  }

  toolMenuTooltips(toolType: string) {
    return TooltipUtil.getToolMenuTooltips(toolType);
  }
}
