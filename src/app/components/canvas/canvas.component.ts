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

import {Component, ElementRef, ViewChild, AfterViewInit, OnInit, OnChanges, SimpleChanges, inject, signal, Input, Output, EventEmitter, ChangeDetectorRef, computed} from '@angular/core';
import { DiagramConnection, AgentNode, ToolNode, CallbackNode, YamlConfig } from '../../core/models/AgentBuilder';
import { MatDialog } from '@angular/material/dialog';
import { AgentService } from '../../core/services/agent.service';
import {AGENT_BUILDER_SERVICE} from '../../core/services/interfaces/agent-builder';
import { MatSnackBar } from '@angular/material/snack-bar';
import { Router } from '@angular/router';
import { Vflow, HtmlTemplateDynamicNode, Edge, TemplateDynamicGroupNode } from 'ngx-vflow';
import { MatIcon } from '@angular/material/icon';
import { MatTooltip } from '@angular/material/tooltip';
import { MatMenu, MatMenuItem, MatMenuTrigger } from "@angular/material/menu";
import * as YAML from 'yaml';
import { firstValueFrom, Observable } from "rxjs";
import { take, filter } from "rxjs/operators";
import { YamlUtils } from "../../../utils/yaml-utils";
import { ConfirmationDialogComponent } from "../confirmation-dialog/confirmation-dialog.component";
import { AddToolDialogComponent } from "../add-tool-dialog/add-tool-dialog.component";
import { BuiltInToolDialogComponent } from "../built-in-tool-dialog/built-in-tool-dialog.component";
import { getToolIcon } from "../../core/constants/tool-icons";
import { AsyncPipe } from "@angular/common";
import { BuilderAssistantComponent } from "../builder-assistant/builder-assistant.component";

@Component({
  selector: "app-canvas",
  templateUrl: "./canvas.component.html",
  styleUrl: "./canvas.component.scss",
  standalone: true,
  imports: [
    Vflow,
    MatIcon,
    MatTooltip,
    MatMenu,
    MatMenuItem,
    MatMenuTrigger,
    AsyncPipe,
    BuilderAssistantComponent,
  ],
})
export class CanvasComponent implements AfterViewInit, OnInit, OnChanges {
  private _snackBar = inject(MatSnackBar);
  @ViewChild("canvas", { static: false })
  canvasRef!: ElementRef<HTMLCanvasElement>;
  @ViewChild("svgCanvas", { static: false })
  svgCanvasRef!: ElementRef<SVGElement>;
  private agentBuilderService = inject(AGENT_BUILDER_SERVICE);
  private cdr = inject(ChangeDetectorRef);

  @Input() showSidePanel: boolean = true;
  @Input() showBuilderAssistant: boolean = false;
  @Input() appNameInput: string = "";
  @Output() toggleSidePanelRequest = new EventEmitter<void>();
  @Output() builderAssistantCloseRequest = new EventEmitter<void>();

  private ctx!: CanvasRenderingContext2D;
  //public nodes = signal<DiagramNode[]>([]);
  public connections = signal<DiagramConnection[]>([]);

  nodeId = 1;
  edgeId = 1;
  callbackId = 1;
  toolId = 1;

  public appName = "";

  public nodes = signal<HtmlTemplateDynamicNode[]>([]);

  public edges = signal<Edge[]>([]);

  private readonly workflowShellWidth = 340;
  private readonly workflowGroupWidth = 420;
  private readonly workflowGroupHeight = 220;
  private readonly workflowGroupYOffset = 180;
  private readonly workflowGroupXOffset = -40;
  private readonly workflowInnerNodePoint = { x: 40, y: 80 };

  private groupNodes = signal<TemplateDynamicGroupNode<any>[]>([]);
  public vflowNodes = computed(() => [
    ...this.groupNodes(),
    ...this.nodes(),
  ]);

  public selectedAgents: HtmlTemplateDynamicNode[] = [];

  public selectedTool: any;
  public selectedCallback: any;

  public currentAgentTool = signal<string | null>(null);
  public agentToolBoards = signal<Map<string, AgentNode>>(new Map());
  private isAgentToolMode = false;
  private navigationStack: string[] = [];

  existingAgent: string | undefined = undefined;
  public toolsMap$: Observable<Map<string, ToolNode[]>>;

  private nodePositions = new Map<string, { x: number; y: number }>();

  constructor(
    private dialog: MatDialog,
    private agentService: AgentService,
    private router: Router
  ) {
    this.toolsMap$ = this.agentBuilderService.getAgentToolsMap();
    this.agentBuilderService.getSelectedTool().subscribe((tool) => {
      this.selectedTool = tool;
    });
  }

  ngOnInit() {
    this.agentService.getApp().subscribe((app) => {
      if (app) {
        this.appName = app;
      }
    });

    // Use input parameter if provided
    if (this.appNameInput) {
      this.appName = this.appNameInput;
    }
    this.agentBuilderService.getNewTabRequest().subscribe((request) => {
      if (request) {
        const { tabName, currentAgentName } = request;
        this.switchToAgentToolBoard(tabName, currentAgentName);
      }
    });

    this.agentBuilderService
      .getTabDeletionRequest()
      .subscribe((agentToolName) => {
        if (agentToolName) {
          this.deleteAgentToolBoard(agentToolName);
        }
      });

    this.agentBuilderService.getSelectedCallback().subscribe((callback) => {
      this.selectedCallback = callback;
    });
    this.agentBuilderService.getAgentCallbacks().subscribe((update) => {
      if (update) {
        const node = this.nodes().find((node) =>
          node.data ? node.data().name === update.agentName : undefined
        );
        if (node && node.data) {
          const data = node.data();
          data.callbacks = update.callbacks;
          node.data.set(data);
        }
      }
    });

    this.agentBuilderService
      .getDeleteSubAgentSubject()
      .subscribe((agentName) => {
        if (!agentName) {
          return;
        }

        this.openDeleteSubAgentDialog(agentName);
      });

    this.agentBuilderService
      .getAddSubAgentSubject()
      .subscribe((request) => {
        if (request.parentAgentName) {
          this.addSubAgent(request.parentAgentName, request.agentClass, request.isFromEmptyGroup);
        }
      });

    this.agentBuilderService
      .getSelectedNode()
      .subscribe((selectedAgentNode) => {
        this.selectedAgents = this.nodes().filter(
          (node) => node.data && node.data().name === selectedAgentNode?.name
        );
      });

    // Listen for tool changes and update group dimensions
    this.toolsMap$.subscribe((toolsMap) => {
      const hasNodesInGroups = this.nodes().some(node =>
        node.parentId && node.parentId()
      );

      if (hasNodesInGroups && this.groupNodes().length > 0) {
        this.updateGroupDimensions();
      }
    });
  }

  ngOnChanges(changes: SimpleChanges) {
    if (changes["appNameInput"] && changes["appNameInput"].currentValue) {
      this.appName = changes["appNameInput"].currentValue;
    }
  }

  ngAfterViewInit() {}

  onCustomTemplateNodeClick(
    clickedVflowNode: HtmlTemplateDynamicNode,
    event: MouseEvent
  ) {
    if (this.shouldIgnoreNodeInteraction(event.target as HTMLElement | null)) {
      return;
    }

    this.selectAgentNode(clickedVflowNode, { openConfig: true });
  }

  onNodePointerDown(node: HtmlTemplateDynamicNode, event: PointerEvent) {
    if (this.shouldIgnoreNodeInteraction(event.target as HTMLElement | null)) {
      return;
    }

    this.selectAgentNode(node, { openConfig: false });
  }

  onGroupClick(groupNode: TemplateDynamicGroupNode<any>, event: MouseEvent) {
    event.stopPropagation();

    if (!groupNode?.data) {
      return;
    }

    // Find the corresponding shell node for this group
    const groupAgentName = groupNode.data().name;
    const shellNode = this.nodes().find(n =>
      n.data && n.data().name === groupAgentName
    );

    if (shellNode) {
      this.selectAgentNode(shellNode, { openConfig: true });
    }
  }

  onGroupPointerDown(groupNode: TemplateDynamicGroupNode<any>, event: PointerEvent) {
    event.stopPropagation();

    if (!groupNode?.data) {
      return;
    }

    // Find the corresponding shell node for this group
    const groupAgentName = groupNode.data().name;
    const shellNode = this.nodes().find(n =>
      n.data && n.data().name === groupAgentName
    );

    if (shellNode) {
      this.selectAgentNode(shellNode, { openConfig: false });
    }
  }

  onCanvasClick(event: MouseEvent) {
    const target = event.target as HTMLElement | null;
    if (!target) {
      return;
    }

    const interactiveSelectors = [
      ".custom-node",
      ".action-button-bar",
      ".add-subagent-btn",
      ".open-panel-btn",
      ".agent-tool-banner",
      ".mat-mdc-menu-panel",
    ];

    if (target.closest(interactiveSelectors.join(","))) {
      return;
    }

    this.clearCanvasSelection();
  }

  private shouldIgnoreNodeInteraction(target: HTMLElement | null): boolean {
    if (!target) {
      return false;
    }

    return !!target.closest("mat-chip, .add-subagent-btn, .mat-mdc-menu-panel");
  }

  private selectAgentNode(
    node: HtmlTemplateDynamicNode,
    options: { openConfig?: boolean } = {}
  ) {
    if (!node?.data) {
      return;
    }

    const agentNodeData = this.agentBuilderService.getNode(node.data().name);
    if (!agentNodeData) {
      return;
    }

    this.agentBuilderService.setSelectedTool(undefined);
    this.agentBuilderService.setSelectedNode(agentNodeData);
    this.nodePositions.set(agentNodeData.name, { ...node.point() });

    if (options.openConfig) {
      this.agentBuilderService.requestSideTabChange("config");
    }
  }

  handleAgentTypeSelection(
    agentClass: string,
    parentAgentName: string | undefined,
    trigger: MatMenuTrigger,
    event: MouseEvent,
    isFromEmptyGroup: boolean = false
  ) {
    event.stopPropagation();
    trigger?.closeMenu();
    this.onAgentTypeSelected(agentClass, parentAgentName, isFromEmptyGroup);
  }

  private clearCanvasSelection() {
    if (
      !this.selectedAgents.length &&
      !this.selectedTool &&
      !this.selectedCallback
    ) {
      return;
    }

    this.selectedAgents = [];
    this.selectedTool = undefined;
    this.selectedCallback = undefined;
    this.agentBuilderService.setSelectedNode(undefined);
    this.agentBuilderService.setSelectedTool(undefined);
    this.agentBuilderService.setSelectedCallback(undefined);
    this.cdr.markForCheck();
  }

  onAddResource(nodeId: string) {
    // This method can be used for general resource addition logic
  }

  onAgentTypeSelected(agentClass: string, parentAgentName: string | undefined, isFromEmptyGroup: boolean = false) {
    if (!parentAgentName) {
      return;
    }

    this.addSubAgent(parentAgentName, agentClass, isFromEmptyGroup);
  }

  private generateNodeId(): string {
    this.nodeId += 1;
    return this.nodeId.toString();
  }

  private generateEdgeId(): string {
    this.edgeId += 1;
    return this.edgeId.toString();
  }

  private createNode(
    agentData: AgentNode,
    shellPoint: { x: number; y: number },
    parentGroupId?: string
  ): HtmlTemplateDynamicNode {
    const dataSignal = signal(agentData);
    const shellId = this.generateNodeId();
    const shellNode: HtmlTemplateDynamicNode = {
      id: shellId,
      point: signal({ ...shellPoint }),
      type: "html-template",
      data: dataSignal,
    };

    if (parentGroupId) {
      shellNode.parentId = signal(parentGroupId);
    }

    this.nodePositions.set(agentData.name, { ...shellNode.point() });

    return shellNode;
  }

  private createWorkflowGroup(
    agentData: AgentNode,
    shellNode: HtmlTemplateDynamicNode,
    shellPoint: { x: number; y: number },
    parentGroupId?: string,
    groupNodesArray?: TemplateDynamicGroupNode<any>[],
    shellNodesArray?: HtmlTemplateDynamicNode[]
  ): { groupNode: TemplateDynamicGroupNode<any>; edge: Edge | null } {
    let groupPoint: { x: number; y: number };
    let actualParentGroupId: string | null = null;

    // Check if this workflow is nested inside another group
    if (parentGroupId) {
      // Use provided array or fallback to component signal
      const groupsToSearch = groupNodesArray || this.groupNodes();
      const parentGroup = groupsToSearch.find(g => g.id === parentGroupId);

      if (parentGroup) {
        const parentGroupPoint = parentGroup.point();
        // Calculate actual height based on the parent group's content
        let actualParentGroupHeight = parentGroup.height ? parentGroup.height() : this.workflowGroupHeight;

        // If we have shell nodes array, calculate the actual height based on parent group's children
        if (shellNodesArray && groupNodesArray) {
          // Find all shell nodes that are children of the parent group
          const parentChildren = shellNodesArray.filter(n =>
            n.parentId && n.parentId() === parentGroup.id
          );

          if (parentChildren.length > 0) {
            // Calculate the actual height needed for parent group content
            const NODE_WIDTH = 340;
            const BASE_NODE_HEIGHT = 120;
            const TOOL_ITEM_HEIGHT = 36;
            const TOOLS_CONTAINER_PADDING = 20;
            const ADD_BUTTON_WIDTH = 68;
            const PADDING = 40;
            const FIXED_NODE_Y = 80;

            let maxHeight = 0;
            for (const child of parentChildren) {
              const childData = child.data ? child.data() : undefined;
              let nodeHeight = BASE_NODE_HEIGHT;
              if (childData && childData.tools && childData.tools.length > 0) {
                nodeHeight += TOOLS_CONTAINER_PADDING + (childData.tools.length * TOOL_ITEM_HEIGHT);
              }
              maxHeight = Math.max(maxHeight, nodeHeight);
            }

            // Calculate total height with padding
            actualParentGroupHeight = Math.max(220, FIXED_NODE_Y + maxHeight + PADDING);
          }
        }

        groupPoint = {
          x: parentGroupPoint.x,
          y: parentGroupPoint.y + actualParentGroupHeight + 60,
        };
        actualParentGroupId = null;
      } else {
        groupPoint = {
          x: shellPoint.x + this.workflowGroupXOffset,
          y: shellPoint.y + this.workflowGroupYOffset,
        };
      }
    } else {
      groupPoint = {
        x: shellPoint.x + this.workflowGroupXOffset,
        y: shellPoint.y + this.workflowGroupYOffset,
      };
    }

    const newGroupId = this.generateNodeId();
    const groupNode: TemplateDynamicGroupNode<any> = {
      id: newGroupId,
      point: signal(groupPoint),
      type: "template-group",
      data: signal(agentData),
      parentId: signal(actualParentGroupId),
      width: signal(this.workflowGroupWidth),
      height: signal(this.workflowGroupHeight),
    };

    // Only create edge for Sequential workflows, not for Loop or Parallel
    const edge = agentData.agent_class === "SequentialAgent"
      ? {
          id: this.generateEdgeId(),
          source: shellNode.id,
          sourceHandle: 'source-bottom',
          target: newGroupId,
          targetHandle: 'target-top',
        }
      : null;

    return { groupNode, edge };
  }

  private calculateWorkflowChildPosition(
    subAgentIndex: number,
    groupHeight: number
  ): { x: number; y: number } {
    const NODE_WIDTH = 340;
    const ADD_BUTTON_WIDTH = 68;
    const SPACING = 20;
    const nodeHeight = 20;
    const verticalCenter = (groupHeight - nodeHeight) / 2;

    return {
      x: 45 + subAgentIndex * (NODE_WIDTH + ADD_BUTTON_WIDTH + SPACING),
      y: verticalCenter,
    };
  }

  private createAgentNodeWithGroup(
    agentData: AgentNode,
    shellPoint: { x: number; y: number },
    parentGroupId?: string,
    groupNodesArray?: TemplateDynamicGroupNode<any>[],
    shellNodesArray?: HtmlTemplateDynamicNode[]
  ): {
    shellNode: HtmlTemplateDynamicNode;
    groupNode: TemplateDynamicGroupNode<any> | null;
    groupEdge: Edge | null;
  } {
    const shellNode = this.createNode(agentData, shellPoint, parentGroupId);

    let groupNode: TemplateDynamicGroupNode<any> | null = null;
    let groupEdge: Edge | null = null;

    if (this.isWorkflowAgent(agentData.agent_class)) {
      const result = this.createWorkflowGroup(agentData, shellNode, shellPoint, parentGroupId, groupNodesArray, shellNodesArray);
      groupNode = result.groupNode;
      groupEdge = result.edge;
    }

    return { shellNode, groupNode, groupEdge };
  }

  private createWorkflowChildEdge(
    childNode: HtmlTemplateDynamicNode,
    parentGroupId: string | undefined
  ): Edge | null {
    return this.createWorkflowChildEdgeFromArrays(
      childNode,
      parentGroupId,
      this.nodes(),
      this.groupNodes()
    );
  }

  /**
   * Creates an edge for a sub-agent inside a workflow group.
   * - Loop/Parallel: Connects workflow shell node to the sub-agent
   * - Sequential: Connects to the previous sibling in the chain
   *
   */
  private createWorkflowChildEdgeFromArrays(
    childNode: HtmlTemplateDynamicNode,
    parentGroupId: string | undefined,
    shellNodes: HtmlTemplateDynamicNode[],
    groupNodes: TemplateDynamicGroupNode<any>[]
  ): Edge | null {
    if (!parentGroupId) {
      return null;
    }

    const parentGroupNode = groupNodes.find(g => g.id === parentGroupId);
    if (!parentGroupNode || !parentGroupNode.data) {
      return null;
    }

    const workflowAgentClass = parentGroupNode.data().agent_class;

    if (workflowAgentClass === "LoopAgent" || workflowAgentClass === "ParallelAgent") {
      const workflowShellNode = shellNodes.find(n =>
        n.data && n.data().name === parentGroupNode.data!().name
      );

      if (workflowShellNode) {
        return {
          id: this.generateEdgeId(),
          source: workflowShellNode.id,
          sourceHandle: 'source-bottom',
          target: childNode.id,
          targetHandle: 'target-top',
        };
      }
    }

    if (workflowAgentClass === "SequentialAgent") {
      // Get all siblings in the group
      const siblings = shellNodes.filter(n =>
        n.parentId && n.parentId() === parentGroupId
      );

      if (siblings.length === 0) {
        return null;
      }

      siblings.sort((a, b) => a.point().x - b.point().x);

      const currentIndex = siblings.findIndex(n => n.id === childNode.id);

      if (currentIndex <= 0) {
        return null;
      }

      const previousSibling = siblings[currentIndex - 1];

      return {
        id: this.generateEdgeId(),
        source: previousSibling.id,
        sourceHandle: 'source-right',
        target: childNode.id,
        targetHandle: 'target-left',
      };
    }

    return null;
  }

  isWorkflowAgent(agentClass: string | undefined): boolean {
    if (!agentClass) {
      return false;
    }

    return (
      agentClass === "SequentialAgent" ||
      agentClass === "ParallelAgent" ||
      agentClass === "LoopAgent"
    );
  }

  addSubAgent(parentAgentName: string, agentClass: string = "LlmAgent", isFromEmptyGroup: boolean = false) {
    const clickedNode: HtmlTemplateDynamicNode = this.nodes().find(
      (node) => node.data && node.data().name === parentAgentName
    ) as HtmlTemplateDynamicNode;
    if (!clickedNode || !clickedNode.data) return;

    const newAgentName = this.agentBuilderService.getNextSubAgentName();

    const agentNodeData: AgentNode = {
      name: newAgentName,
      agent_class: agentClass,
      model: "gemini-2.5-flash",
      instruction: "You are a sub-agent that performs specialized tasks.",
      isRoot: false,
      sub_agents: [],
      tools: [],
    };

    const isClickedNodeWorkflow = this.isWorkflowAgent(
      clickedNode.data().agent_class
    );

    const isInsideGroup = clickedNode.parentId && clickedNode.parentId() &&
      this.groupNodes().some(g => g.id === clickedNode.parentId!());

    let shellNode: HtmlTemplateDynamicNode;
    let groupNode: TemplateDynamicGroupNode<any> | null = null;

    //If this is from the empty group button, always add to the workflow's own group
    if (isFromEmptyGroup && isClickedNodeWorkflow) {
      const clickedAgentData = clickedNode.data();
      if (!clickedAgentData) return;

      const groupForClickedNode = this.groupNodes().find(
        g => g.data && g.data()?.name === clickedAgentData.name
      );

      if (!groupForClickedNode) {
        console.error('Could not find group for workflow node');
        return;
      }

      const clickedAgentServiceData = this.agentBuilderService.getNode(clickedNode.data().name);
      if (!clickedAgentServiceData) {
        console.error('Could not find clicked agent data');
        return;
      }

      const subAgentIndex = clickedAgentServiceData.sub_agents.length;
      const groupHeight = groupForClickedNode.height ? groupForClickedNode.height() : this.workflowGroupHeight;
      const shellPoint = this.calculateWorkflowChildPosition(subAgentIndex, groupHeight);

      const result = this.createAgentNodeWithGroup(agentNodeData, shellPoint, groupForClickedNode.id);
      shellNode = result.shellNode;
      groupNode = result.groupNode;

      clickedAgentServiceData.sub_agents.push(agentNodeData);

      if (groupNode) {
        this.groupNodes.set([...this.groupNodes(), groupNode]);
      }
      if (result.groupEdge) {
        this.edges.set([...this.edges(), result.groupEdge]);
      }
    } else if (isInsideGroup) {
      //Node inside a group (+ button) - add sibling to parent group
      const groupId = clickedNode.parentId!() ?? undefined;
      const existingGroupNode = this.groupNodes().find(g => g.id === groupId);

      if (!existingGroupNode || !existingGroupNode.data) {
        console.error('Could not find parent group node');
        return;
      }

      const workflowParentName = existingGroupNode.data().name;
      const workflowParentAgent = this.agentBuilderService.getNode(workflowParentName);

      if (!workflowParentAgent) {
        console.error('Could not find workflow parent agent');
        return;
      }

      const subAgentIndex = workflowParentAgent.sub_agents.length;
      const groupHeight = existingGroupNode.height ? existingGroupNode.height() : this.workflowGroupHeight;
      const shellPoint = this.calculateWorkflowChildPosition(subAgentIndex, groupHeight);

      const result = this.createAgentNodeWithGroup(agentNodeData, shellPoint, groupId);
      shellNode = result.shellNode;
      groupNode = result.groupNode;

      workflowParentAgent.sub_agents.push(agentNodeData);

      if (groupNode) {
        this.groupNodes.set([...this.groupNodes(), groupNode]);
      }
      if (result.groupEdge) {
        this.edges.set([...this.edges(), result.groupEdge]);
      }
    } else {
      const subAgentIndex = clickedNode.data().sub_agents.length;
      const shellPoint = {
        x: clickedNode.point().x + subAgentIndex * 400,
        y: clickedNode.point().y + 300,
      };

      const result = this.createAgentNodeWithGroup(agentNodeData, shellPoint);
      shellNode = result.shellNode;
      groupNode = result.groupNode;

      const clickedAgentData = this.agentBuilderService.getNode(clickedNode.data().name);
      if (clickedAgentData) {
        clickedAgentData.sub_agents.push(agentNodeData);
      }

      if (groupNode) {
        this.groupNodes.set([...this.groupNodes(), groupNode]);
      }
      if (result.groupEdge) {
        this.edges.set([...this.edges(), result.groupEdge]);
      }
    }

    this.agentBuilderService.addNode(agentNodeData);

    this.nodes.set([...this.nodes(), shellNode]);
    this.selectedAgents = [shellNode];

    if (isInsideGroup || isClickedNodeWorkflow) {
      this.updateGroupDimensions();
    }

    // Create edges connecting the parent to the sub-agent
    if (isClickedNodeWorkflow || isInsideGroup) {
      const parentGroupId = shellNode.parentId ? shellNode.parentId() ?? undefined : undefined;
      const workflowEdge = this.createWorkflowChildEdge(
        shellNode,
        parentGroupId
      );

      if (workflowEdge) {
        this.edges.set([...this.edges(), workflowEdge]);
      }
    } else {
      const edge: Edge = {
        id: this.generateEdgeId(),
        source: clickedNode.id,
        sourceHandle: 'source-bottom',
        target: shellNode.id,
        targetHandle: 'target-top',
      };
      this.edges.set([...this.edges(), edge]);
    }

    // Auto-select the newly created sub-agent and switch to Config tab
    this.agentBuilderService.setSelectedNode(agentNodeData);
    this.agentBuilderService.requestSideTabChange("config");
  }

  addTool(parentNodeId: string) {
    // Find the parent node
    const parentNode = this.nodes().find(
      (node) => node.id === parentNodeId
    ) as HtmlTemplateDynamicNode;
    if (!parentNode) return;
    if (!parentNode.data) return;

    // Get parent data
    const parentData = parentNode.data();
    if (!parentData) return;

    const dialogRef = this.dialog.open(AddToolDialogComponent, {
      width: "500px",
    });

    dialogRef.afterClosed().subscribe((result) => {
      if (result) {
        if (result.toolType === "Agent Tool") {
          // For Agent Tool, show the create agent dialog instead
          this.createAgentTool(parentData.name);
        } else {
          const tool: any = {
            toolType: result.toolType,
            name: result.name,
          };

          this.agentBuilderService.addTool(parentData.name, tool);

          // Automatically select the newly created tool
          this.agentBuilderService.setSelectedTool(tool);
        }
      }
    });
  }

  addCallback(parentNodeId: string) {
    // Find the parent node
    const parentNode = this.nodes().find(
      (node) => node.id === parentNodeId
    ) as HtmlTemplateDynamicNode;
    if (!parentNode) return;
    if (!parentNode.data) return;

    const callback = {
      name: `callback_${this.callbackId}`,
      type: "before_agent" as const,
      code: "def callback_function(callback_context):\n    # Add your callback logic here\n    return None",
      description: "Auto-generated callback",
    };
    this.callbackId++;

    const result = this.agentBuilderService.addCallback(
      parentNode.data().name,
      callback
    );
    if (!result.success) {
      this._snackBar.open(result.error || "Failed to add callback", "Close", {
        duration: 3000,
        panelClass: ["error-snackbar"],
      });
    }
  }

  createAgentTool(parentAgentName: string) {
    const dialogRef = this.dialog.open(ConfirmationDialogComponent, {
      width: "750px",
      height: "310px",
      data: {
        title: "Create Agent Tool",
        message: "Please enter a name for the agent tool:",
        confirmButtonText: "Create",
        showInput: true,
        inputLabel: "Agent Tool Name",
        inputPlaceholder: "Enter agent tool name",
      },
    });

    dialogRef.afterClosed().subscribe((result) => {
      if (result && typeof result === "string") {
        this.agentBuilderService.requestNewTab(result, parentAgentName);
      }
    });
  }

  deleteTool(agentName: string, tool: any) {
    const isAgentTool = tool.toolType === "Agent Tool";
    const toolDisplayName = isAgentTool
      ? tool.toolAgentName || tool.name
      : tool.name;

    const dialogRef = this.dialog.open(ConfirmationDialogComponent, {
      data: {
        title: isAgentTool ? "Delete Agent Tool" : "Delete Tool",
        message: isAgentTool
          ? `Are you sure you want to delete the agent tool "${toolDisplayName}"? This will also delete the corresponding board.`
          : `Are you sure you want to delete ${toolDisplayName}?`,
        confirmButtonText: "Delete",
      },
    });

    dialogRef.afterClosed().subscribe((result) => {
      if (result === "confirm") {
        this.deleteToolWithoutDialog(agentName, tool);
      }
    });
  }

  private deleteToolWithoutDialog(agentName: string, tool: any) {
    if (tool.toolType === "Agent Tool") {
      const agentToolName = tool.toolAgentName || tool.name;
      this.deleteAgentToolAndBoard(agentName, tool, agentToolName);
    } else {
      this.agentBuilderService.deleteTool(agentName, tool);
    }
  }

  deleteAgentToolAndBoard(agentName: string, tool: any, agentToolName: string) {
    this.agentBuilderService.deleteTool(agentName, tool);

    this.agentBuilderService.requestTabDeletion(agentToolName);
  }

  deleteCallback(agentName: string, callback: any) {
    const dialogRef = this.dialog.open(ConfirmationDialogComponent, {
      data: {
        title: "Delete Callback",
        message: `Are you sure you want to delete ${callback.name}?`,
        confirmButtonText: "Delete",
      },
    });

    dialogRef.afterClosed().subscribe((result) => {
      if (result === "confirm") {
        const deleteResult = this.agentBuilderService.deleteCallback(
          agentName,
          callback
        );
        if (!deleteResult.success) {
          this._snackBar.open(
            deleteResult.error || "Failed to delete callback",
            "Close",
            {
              duration: 3000,
              panelClass: ["error-snackbar"],
            }
          );
        }
        this.cdr.detectChanges();
      }
    });
  }

  openDeleteSubAgentDialog(agentName: string) {
    const dialogRef = this.dialog.open(ConfirmationDialogComponent, {
      data: {
        title: "Delete sub agent",
        message: `Are you sure you want to delete ${agentName}? This will also delete all the underlying sub agents and tools.`,
        confirmButtonText: "Delete",
      },
    });

    dialogRef.afterClosed().subscribe((result) => {
      if (result === "confirm") {
        this.deleteSubAgent(agentName);
      }
    });
  }

  deleteSubAgent(agentName: string) {
    const currentNode: AgentNode | undefined =
      this.agentBuilderService.getNode(agentName);

    if (!currentNode) {
      return;
    }

    const parentNode = this.agentBuilderService.getParentNode(
      this.agentBuilderService.getRootNode(),
      currentNode,
      undefined,
      this.agentToolBoards()
    );

    if (!parentNode) {
      return;
    }

    this.deleteSubAgentHelper(currentNode, parentNode);

    // select the parent node if the current selected node is deleted
    this.agentBuilderService
      .getSelectedNode()
      .pipe(
        take(1),
        filter((node) => !!node)
      )
      .subscribe((node) => {
        if (!this.agentBuilderService.getNodes().includes(node)) {
          this.agentBuilderService.setSelectedNode(parentNode);
        }
      });
  }

  /**
   * Check if a node is inside a sequential workflow group
   */
  private isNodeInSequentialWorkflow(node: HtmlTemplateDynamicNode): boolean {
    if (!node.parentId || !node.parentId()) {
      return false;
    }

    const parentGroupId = node.parentId();
    const parentGroup = this.groupNodes().find(g => g.id === parentGroupId);

    if (!parentGroup || !parentGroup.data) {
      return false;
    }

    return parentGroup.data().agent_class === "SequentialAgent";
  }

  /**
   * Get the previous and next siblings of a node in a sequential workflow
   */
  private getSequentialSiblings(node: HtmlTemplateDynamicNode): {
    previous: HtmlTemplateDynamicNode | undefined;
    next: HtmlTemplateDynamicNode | undefined;
  } {
    if (!node.parentId || !node.parentId()) {
      return { previous: undefined, next: undefined };
    }

    const parentGroupId = node.parentId();
    const siblings = this.nodes().filter(n =>
      n.parentId && n.parentId() === parentGroupId
    );

    siblings.sort((a, b) => a.point().x - b.point().x);

    const currentIndex = siblings.findIndex(n => n.id === node.id);

    if (currentIndex === -1) {
      return { previous: undefined, next: undefined };
    }

    return {
      previous: currentIndex > 0 ? siblings[currentIndex - 1] : undefined,
      next: currentIndex < siblings.length - 1 ? siblings[currentIndex + 1] : undefined,
    };
  }

  deleteSubAgentHelper(
    agentNode: AgentNode | undefined,
    parentNode: AgentNode
  ) {
    if (!agentNode) {
      return;
    }

    // recursive until it's leaf node
    for (const subAgent of agentNode.sub_agents) {
      this.deleteSubAgentHelper(subAgent, agentNode);
    }

    // it's leaf node
    for (const tool of agentNode.tools ?? []) {
      this.deleteToolWithoutDialog(agentNode.name, tool);
    }

    const shellNode = this.nodes().find(
      (node) => node.data && node.data().name === agentNode.name
    );

    if (shellNode) {
      const isInSequentialWorkflow = this.isNodeInSequentialWorkflow(shellNode);
      let previousSibling: HtmlTemplateDynamicNode | undefined;
      let nextSibling: HtmlTemplateDynamicNode | undefined;

      if (isInSequentialWorkflow) {
        const siblings = this.getSequentialSiblings(shellNode);
        previousSibling = siblings.previous;
        nextSibling = siblings.next;
      }

      this.nodes.set(
        this.nodes().filter((node: HtmlTemplateDynamicNode) => {
          return node.id !== shellNode.id;
        })
      );

      const groupNode = this.groupNodes().find(
        (node) => node.data && node.data().name === agentNode.name
      );

      if (groupNode) {
        this.groupNodes.set(
          this.groupNodes().filter((node) => node.id !== groupNode.id)
        );

        const newEdges = this.edges().filter(
          (edge) =>
            edge.target !== shellNode.id &&
            edge.source !== shellNode.id &&
            edge.target !== groupNode.id &&
            edge.source !== groupNode.id
        );
        this.edges.set(newEdges);
      } else {
        const newEdges = this.edges().filter(
          (edge) => edge.target !== shellNode.id && edge.source !== shellNode.id
        );
        this.edges.set(newEdges);
      }

      // Reconnect siblings in sequential workflow
      if (isInSequentialWorkflow && previousSibling && nextSibling) {
        const reconnectionEdge: Edge = {
          id: this.generateEdgeId(),
          source: previousSibling.id,
          sourceHandle: 'source-right',
          target: nextSibling.id,
          targetHandle: 'target-left',
        };
        this.edges.set([...this.edges(), reconnectionEdge]);
      }
    }

    this.nodePositions.delete(agentNode.name);

    parentNode.sub_agents = parentNode.sub_agents.filter(
      (subagent) => subagent.name !== agentNode.name
    );

    // delete node data in builder service
    this.agentBuilderService.deleteNode(agentNode);

    if (shellNode && shellNode.parentId && shellNode.parentId()) {
      this.updateGroupDimensions();
    }
  }

  selectTool(tool: any, node: HtmlTemplateDynamicNode) {
    if (tool.toolType === "Agent Tool") {
      const agentToolName = tool.name;
      this.switchToAgentToolBoard(agentToolName);
      return;
    }

    // Open edit dialog for Function tool and Built-in tool
    if (tool.toolType === 'Function tool' || tool.toolType === 'Built-in tool') {
      if (node.data) {
        const agentNodeData = this.agentBuilderService.getNode(node.data().name);
        if (agentNodeData) {
          this.editTool(tool, agentNodeData);
        }
      }
      return;
    }

    if (node.data) {
      const agentNodeData = this.agentBuilderService.getNode(node.data().name);
      if (agentNodeData) {
        this.agentBuilderService.setSelectedNode(agentNodeData);
      }
    }
    this.agentBuilderService.setSelectedTool(tool);
  }

  editTool(tool: any, agentNode: AgentNode) {
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
        const toolIndex = agentNode.tools?.findIndex(t => t.name === tool.name);
        if (toolIndex !== undefined && toolIndex !== -1 && agentNode.tools) {
          agentNode.tools[toolIndex].name = result.name;

          // Update args if provided
          if (result.args) {
            agentNode.tools[toolIndex].args = result.args;
          }

          // Trigger update in the service
          this.agentBuilderService.setAgentTools(agentNode.name, agentNode.tools);
        }
      }
    });
  }

  selectCallback(callback: any, node: HtmlTemplateDynamicNode) {
    if (node.data) {
      const agentNodeData = this.agentBuilderService.getNode(node.data().name);
      if (agentNodeData) {
        this.agentBuilderService.setSelectedNode(agentNodeData);
      }
    }
    this.agentBuilderService.setSelectedCallback(callback);
  }
  openToolsTab(node: HtmlTemplateDynamicNode) {
    if (node.data) {
      const agentNodeData = this.agentBuilderService.getNode(node.data().name);
      if (agentNodeData) {
        this.agentBuilderService.setSelectedNode(agentNodeData);
      }
    }
    this.agentBuilderService.requestSideTabChange("tools");
  }

  saveAgent(appName: string) {
    const rootAgent: AgentNode | undefined =
      this.agentBuilderService.getRootNode();

    if (!rootAgent) {
      this._snackBar.open("Please create an agent first.", "OK");
      return;
    }

    const formData = new FormData();

    const agentToolBoards = this.agentToolBoards();
    YamlUtils.generateYamlFile(rootAgent, formData, appName, agentToolBoards);

    this.agentService.agentBuild(formData).subscribe((success) => {
      if (success) {
        this.router
          .navigate(["/"], {
            queryParams: { app: appName },
          })
          .then(() => {
            window.location.reload();
          });
      } else {
        this._snackBar.open("Something went wrong, please try again", "OK");
      }
    });
  }

  isRootAgent(agentName: string): boolean {
    const rootAgent = this.agentBuilderService.getRootNode();

    if (!rootAgent) {
      return false;
    }

    return rootAgent.name === agentName;
  }

  isRootAgentForCurrentTab(agentName: string): boolean {
    if (this.isAgentToolMode && this.currentAgentTool()) {
      return agentName === this.currentAgentTool();
    }

    return this.isRootAgent(agentName);
  }

  /**
   * Horizontal handles (left/right): Only for chained sub-agents inside Sequential workflow
   * @param node The node to check
   * @param position 'left' for left handle (not first node), 'right' for right handle (not last node)
   */
  shouldShowHorizontalHandle(node: HtmlTemplateDynamicNode, position: 'left' | 'right'): boolean {
    if (!node.parentId || !node.parentId()) {
      return false;
    }

    const parentGroupId = node.parentId();
    const parentGroup = this.groupNodes().find(g => g.id === parentGroupId);

    if (!parentGroup || !parentGroup.data) {
      return false;
    }

    const parentAgentClass = parentGroup.data().agent_class;

    if (parentAgentClass !== "SequentialAgent") {
      return false;
    }

    const siblings = this.nodes().filter(n =>
      n.parentId && n.parentId() === parentGroupId
    );

    if (siblings.length <= 1) {
      return false;
    }

    siblings.sort((a, b) => a.point().x - b.point().x);
    const nodeIndex = siblings.findIndex(n => n.id === node.id);

    return position === 'left' ? nodeIndex > 0 : nodeIndex < siblings.length - 1;
  }

  shouldShowLeftHandle(node: HtmlTemplateDynamicNode): boolean {
    return this.shouldShowHorizontalHandle(node, 'left');
  }

  shouldShowRightHandle(node: HtmlTemplateDynamicNode): boolean {
    return this.shouldShowHorizontalHandle(node, 'right');
  }

  /**
   * Bottom handle appears when:
   * - Shell node is a workflow agent OR
   * - LLM agent has sub-agents
   */
  shouldShowBottomHandle(node: HtmlTemplateDynamicNode): boolean {
    const nodeData = node.data ? node.data() : undefined;
    if (!nodeData) {
      return false;
    }

    if (this.isWorkflowAgent(nodeData.agent_class)) {
      return true;
    }
    if (nodeData.agent_class === "LlmAgent" && nodeData.sub_agents && nodeData.sub_agents.length > 0) {
      return true;
    }

    return false;
  }

  /**
   * Top handle appears when:
   * 1. Sequential workflow group always has top handle
   * 2. Sub-agents inside Loop and Parallel workflows
   * 3. All LLM Agents that have a parent
   */
  shouldShowTopHandle(node: HtmlTemplateDynamicNode | TemplateDynamicGroupNode<any>): boolean {
    const nodeData = node.data ? node.data() : undefined;
    const nodeName = nodeData?.name;
    const isRoot = nodeName ? this.isRootAgent(nodeName) : false;

    const isGroupNode = node.type === 'template-group';

    if (isGroupNode) {
      return nodeData?.agent_class === "SequentialAgent";
    }

    if (isRoot) {
      return false;
    }

    if (node.parentId && node.parentId()) {
      const parentGroupId = node.parentId();
      const parentGroup = this.groupNodes().find(g => g.id === parentGroupId);

      if (parentGroup && parentGroup.data) {
        const parentAgentClass = parentGroup.data().agent_class;

        if (parentAgentClass === "LoopAgent" || parentAgentClass === "ParallelAgent") {
          return true;
        }
      }

      return false;
    }

    return true;
  }

  getToolsForNode(
    nodeName: string | undefined,
    toolsMap: Map<string, ToolNode[]> | null | undefined
  ): ToolNode[] {
    if (!nodeName || !toolsMap) {
      return [];
    }

    return toolsMap.get(nodeName) ?? [];
  }

  loadFromYaml(yamlContent: string, appName: string) {
    try {
      // Parse the YAML content
      const yamlData = YAML.parse(yamlContent);

      this.agentBuilderService.clear();
      this.nodePositions.clear();
      this.agentToolBoards.set(new Map());
      this.agentBuilderService.setAgentToolBoards(new Map());
      this.currentAgentTool.set(null);
      this.isAgentToolMode = false;
      this.navigationStack = [];

      // Create root agent from YAML
      const rootAgent: AgentNode = {
        name: yamlData.name || "root_agent",
        agent_class: yamlData.agent_class || "LlmAgent",
        model: yamlData.model || "gemini-2.5-flash",
        instruction: yamlData.instruction || "",
        description: yamlData.description || "",
        ...(yamlData.max_iterations && { max_iterations: yamlData.max_iterations }),
        isRoot: true,
        sub_agents: yamlData.sub_agents || [],
        tools: this.parseToolsFromYaml(yamlData.tools || []),
        callbacks: this.parseCallbacksFromYaml(yamlData),
      };

      // Add to agent builder service
      this.agentBuilderService.addNode(rootAgent);
      this.agentBuilderService.setSelectedNode(rootAgent);

      this.processAgentToolsFromYaml(rootAgent.tools || [], appName);

      this.loadAgentBoard(rootAgent);
    } catch (error) {
      console.error("Error parsing YAML:", error);
    }
  }

  private parseToolsFromYaml(tools: any[]): ToolNode[] {
    return tools.map((tool) => {
      const toolNode: ToolNode = {
        name: tool.name,
        toolType: this.determineToolType(tool),
        toolAgentName: tool.name,
      };

      // Handle agent tools - extract the actual agent name from config_path
      if (
        tool.name === "AgentTool" &&
        tool.args &&
        tool.args.agent &&
        tool.args.agent.config_path
      ) {
        toolNode.toolType = "Agent Tool";
        // Extract the agent name from the config_path (e.g., "./at1.yaml" -> "at1")
        const configPath = tool.args.agent.config_path;
        const agentName = configPath.replace("./", "").replace(".yaml", "");
        toolNode.name = agentName; // Use the actual agent name
        toolNode.toolAgentName = agentName;
        toolNode.args = tool.args;
      } else if (tool.args) {
        toolNode.args = tool.args;
      }
      return toolNode;
    });
  }

  private parseCallbacksFromYaml(yamlData: any): CallbackNode[] {
    const callbacks: CallbackNode[] = [];

    // Look for callback groups at the root level
    Object.keys(yamlData).forEach((key) => {
      if (key.endsWith("_callback") && Array.isArray(yamlData[key])) {
        const callbackType = key.replace("_callback", "");

        yamlData[key].forEach((callbackData: any) => {
          if (callbackData.name) {
            callbacks.push({
              name: callbackData.name,
              type: callbackType as any,
            });
          }
        });
      }
    });

    return callbacks;
  }

  private determineToolType(tool: any): string {
    if (tool.name === "AgentTool" && tool.args && tool.args.agent) {
      return "Agent Tool";
    } else if (tool.name && tool.name.includes(".") && tool.args) {
      return "Custom tool";
    } else if (tool.name && tool.name.includes(".") && !tool.args) {
      return "Function tool";
    } else {
      return "Built-in tool";
    }
  }

  private processAgentToolsFromYaml(tools: ToolNode[], appName: string) {
    const agentTools = tools.filter((tool) => tool.toolType === "Agent Tool");

    for (const agentTool of agentTools) {
      // Create board for agent tool
      const agentToolBoards = this.agentToolBoards();
      if (!agentToolBoards.has(agentTool.name)) {
        // Try to load the agent tool's YAML file to get its actual configuration
        this.loadAgentToolConfiguration(agentTool, appName);
      }
    }
  }

  private loadAgentToolConfiguration(agentTool: ToolNode, appName: string) {
    const agentToolName = agentTool.name;
    // Try to fetch the agent tool's YAML file
    this.agentService
      .getSubAgentBuilder(appName, `${agentToolName}.yaml`)
      .subscribe({
        next: (yamlContent: string) => {
          if (yamlContent) {
            try {
              const yamlData = YAML.parse(yamlContent);

              const agentToolAgent: AgentNode = {
                name: yamlData.name || agentToolName,
                agent_class: yamlData.agent_class || "LlmAgent",
                model: yamlData.model || "gemini-2.5-flash",
                instruction:
                  yamlData.instruction ||
                  `You are the ${agentToolName} agent that can be used as a tool by other agents.`,
                description: yamlData.description || "",
                ...(yamlData.max_iterations && { max_iterations: yamlData.max_iterations }),
                isRoot: false,
                sub_agents: yamlData.sub_agents || [],
                tools: this.parseToolsFromYaml(yamlData.tools || []),
                callbacks: this.parseCallbacksFromYaml(yamlData),
                isAgentTool: true,
                skip_summarization: !!agentTool.args?.["skip_summarization"],
              };

              const currentAgentToolBoards = this.agentToolBoards();
              currentAgentToolBoards.set(agentToolName, agentToolAgent);
              this.agentToolBoards.set(currentAgentToolBoards);
              this.agentBuilderService.setAgentToolBoards(
                currentAgentToolBoards
              );

              this.agentBuilderService.addNode(agentToolAgent);

              this.processAgentToolsFromYaml(
                agentToolAgent.tools || [],
                appName
              );

              if (
                agentToolAgent.sub_agents &&
                agentToolAgent.sub_agents.length > 0
              ) {
                for (const subAgent of agentToolAgent.sub_agents) {
                  if (subAgent.config_path) {
                    this.agentService
                      .getSubAgentBuilder(appName, subAgent.config_path)
                      .subscribe((a) => {
                        if (a) {
                          const yamlData = YAML.parse(a) as AgentNode;
                          this.processAgentToolsFromYaml(
                            this.parseToolsFromYaml(yamlData.tools || []),
                            appName
                          );
                        }
                      });
                  }
                }
              }
            } catch (error) {
              console.error(
                `Error parsing YAML for agent tool ${agentToolName}:`,
                error
              );
              this.createDefaultAgentToolConfiguration(agentTool);
            }
          } else {
            this.createDefaultAgentToolConfiguration(agentTool);
          }
        },
        error: (error) => {
          console.error(
            `Error loading agent tool configuration for ${agentToolName}:`,
            error
          );
          this.createDefaultAgentToolConfiguration(agentTool);
        },
      });
  }

  private createDefaultAgentToolConfiguration(agentTool: ToolNode) {
    const agentToolName = agentTool.name;
    const agentToolAgent: AgentNode = {
      name: agentToolName,
      agent_class: "LlmAgent",
      model: "gemini-2.5-flash",
      instruction: `You are the ${agentToolName} agent that can be used as a tool by other agents.`,
      isRoot: false,
      sub_agents: [],
      tools: [],
      isAgentTool: true,
      skip_summarization: !!agentTool.args?.["skip_summarization"],
    };

    const currentAgentToolBoards = this.agentToolBoards();
    currentAgentToolBoards.set(agentToolName, agentToolAgent);
    this.agentToolBoards.set(currentAgentToolBoards);
    this.agentBuilderService.setAgentToolBoards(currentAgentToolBoards);

    this.agentBuilderService.addNode(agentToolAgent);
  }

  loadAgentTools(agent: AgentNode) {
    if (!agent.tools) {
      agent.tools = [];
    } else {
      // Filter out any tools with empty names
      agent.tools = agent.tools.filter(
        (tool) => tool.name && tool.name.trim() !== ""
      );
      agent.tools.forEach((tool) => {
        // Preserve Agent Tool type if already set
        if (tool.toolType === "Agent Tool") {
          return; // Don't override Agent Tool type
        }
        if (tool.name.includes(".") && tool.args) {
          tool.toolType = "Custom tool";
        } else if (tool.name.includes(".") && !tool.args) {
          tool.toolType = "Function tool";
        } else {
          tool.toolType = "Built-in tool";
        }
      });
    }
  }

  isNodeSelected(node: HtmlTemplateDynamicNode): boolean {
    return this.selectedAgents.includes(node);
  }

  isGroupSelected(groupNode: TemplateDynamicGroupNode<any>): boolean {
    if (!groupNode.data) {
      return false;
    }

    const groupAgentName = groupNode.data().name;
    const shellNode = this.nodes().find(n =>
      n.data && n.data().name === groupAgentName
    );

    if (!shellNode) {
      return false;
    }

    return this.isNodeSelected(shellNode);
  }

  async loadSubAgents(appName: string, rootAgent: AgentNode) {
    type BFSItem = {
      node: AgentNode;
      depth: number;
      index: number;
      parentShellId?: string;
      parentAgent?: AgentNode;
      parentGroupId?: string;
    };
    const queue: BFSItem[] = [
      {
        node: rootAgent,
        depth: 1,
        index: 1,
        parentShellId: undefined,
        parentAgent: undefined,
        parentGroupId: undefined,
      },
    ];

    const shellNodes: HtmlTemplateDynamicNode[] = [];
    const groupNodes: TemplateDynamicGroupNode<any>[] = [];
    const edges: Edge[] = [];

    while (queue.length > 0) {
      const { node, depth, index, parentShellId, parentAgent, parentGroupId } = queue.shift()!;
      let agentData = node;
      if (node.config_path) {
        try {
          const subAgentData = await firstValueFrom(
            this.agentService.getSubAgentBuilder(appName, node.config_path)
          );
          agentData = YAML.parse(subAgentData) as AgentNode;
          if (agentData.tools) {
            agentData.tools = this.parseToolsFromYaml(agentData.tools || []);
          }

          this.processAgentToolsFromYaml(agentData.tools || [], appName);
        } catch (e) {
          console.error(`Failed to load agent from ${node.config_path}`, e);
          continue;
        }
      }

      if (parentAgent && parentAgent.sub_agents) {
        const subAgentIndex = parentAgent.sub_agents.indexOf(node);
        if (subAgentIndex !== -1) {
          parentAgent.sub_agents[subAgentIndex] = agentData;
          this.agentBuilderService.addNode(parentAgent);
        }
      }

      this.agentBuilderService.addNode(agentData);

      const savedPosition = this.nodePositions.get(agentData.name);
      const isWorkflow = this.isWorkflowAgent(agentData.agent_class);
      const parentIsWorkflow = parentAgent ? this.isWorkflowAgent(parentAgent.agent_class) : false;

      let shellPoint: { x: number; y: number };
      let shellNode: HtmlTemplateDynamicNode;
      let newGroupNode: TemplateDynamicGroupNode<any> | null = null;

      if (parentIsWorkflow && !agentData.isRoot) {
        const subAgentIndex = parentAgent?.sub_agents.indexOf(agentData) ?? index;
        const parentGroupNode = groupNodes.find(g => g.id === parentGroupId);
        const groupHeight = parentGroupNode?.height ? parentGroupNode.height() : this.workflowGroupHeight;

        shellPoint = savedPosition ?? this.calculateWorkflowChildPosition(subAgentIndex, groupHeight);

        const result = this.createAgentNodeWithGroup(agentData, shellPoint, parentGroupId ?? undefined, groupNodes, shellNodes);
        shellNode = result.shellNode;
        newGroupNode = result.groupNode;

        shellNodes.push(shellNode);
        if (newGroupNode) {
          groupNodes.push(newGroupNode);
        }
        if (result.groupEdge) {
          edges.push(result.groupEdge);
        }
      } else {
        // Normal positioning
        if (!savedPosition) {
          if (!parentShellId) {
            // Root agent
            shellPoint = { x: 100, y: 150 };
          } else {
            const parentNode = shellNodes.find(n => n.id === parentShellId);
            if (parentNode) {
              shellPoint = {
                x: parentNode.point().x + (index - 1) * 400,
                y: parentNode.point().y + 300,
              };
            } else {
              shellPoint = {
                x: 100,
                y: depth * 150 + 50,
              };
            }
          }
        } else {
          shellPoint = savedPosition;
        }

        const result = this.createAgentNodeWithGroup(agentData, shellPoint, undefined, groupNodes, shellNodes);
        shellNode = result.shellNode;
        newGroupNode = result.groupNode;

        shellNodes.push(shellNode);

        // If this is a workflow agent, create its group
        if (isWorkflow && !agentData.isRoot) {
          if (newGroupNode) {
            groupNodes.push(newGroupNode);
          }
          if (result.groupEdge) {
            edges.push(result.groupEdge);
          }
        }
      }

      if (parentShellId) {
        if (parentGroupId) {
          // Use the refactored helper method for workflow child edges
          const workflowEdge = this.createWorkflowChildEdgeFromArrays(
            shellNode,
            parentGroupId,
            shellNodes,
            groupNodes
          );

          if (workflowEdge) {
            edges.push(workflowEdge);
          }
        } else {
          const edge: Edge = {
            id: this.generateEdgeId(),
            source: parentShellId,
            sourceHandle: 'source-bottom',
            target: shellNode.id,
            targetHandle: 'target-top',
          };
          edges.push(edge);
        }
      }

      if (agentData.sub_agents && agentData.sub_agents.length > 0) {
        let subIndex = 1;
        const groupIdForChildren = isWorkflow && newGroupNode ? newGroupNode.id : parentGroupId;

        for (const sub of agentData.sub_agents) {
          queue.push({
            node: sub,
            parentShellId: shellNode.id,
            depth: depth + 1,
            index: subIndex,
            parentAgent: agentData,
            parentGroupId: groupIdForChildren,
          });
          subIndex++;
        }
      }
    }

    this.nodes.set(shellNodes);
    this.groupNodes.set(groupNodes);
    this.edges.set(edges);
    this.updateGroupDimensions();
  }

  switchToAgentToolBoard(agentToolName: string, currentAgentName?: string) {
    const currentContext = this.currentAgentTool() || "main";
    if (currentContext !== agentToolName) {
      this.navigationStack.push(currentContext);
    }

    const agentToolBoards = this.agentToolBoards();
    let agentToolAgent = agentToolBoards.get(agentToolName);

    if (!agentToolAgent) {
      agentToolAgent = {
        isRoot: false,
        name: agentToolName,
        agent_class: "LlmAgent",
        model: "gemini-2.5-flash",
        instruction: `You are the ${agentToolName} agent that can be used as a tool by other agents.`,
        sub_agents: [],
        tools: [],
        isAgentTool: true,
        skip_summarization: false,
      };

      const newAgentToolBoards = new Map(agentToolBoards);
      newAgentToolBoards.set(agentToolName, agentToolAgent);
      this.agentToolBoards.set(newAgentToolBoards);
      this.agentBuilderService.setAgentToolBoards(newAgentToolBoards);

      if (currentAgentName) {
        this.addAgentToolToAgent(agentToolName, currentAgentName);
      } else {
        this.addAgentToolToRoot(agentToolName);
      }
    }

    this.currentAgentTool.set(agentToolName);
    this.isAgentToolMode = true;
    this.loadAgentBoard(agentToolAgent);

    this.agentBuilderService.setSelectedNode(agentToolAgent);
    this.agentBuilderService.requestSideTabChange("config");
  }

  backToMainCanvas() {
    if (this.navigationStack.length > 0) {
      const parentContext = this.navigationStack.pop();

      if (parentContext === "main") {
        this.currentAgentTool.set(null);
        this.isAgentToolMode = false;

        const rootAgent = this.agentBuilderService.getRootNode();
        if (rootAgent) {
          this.loadAgentBoard(rootAgent);

          this.agentBuilderService.setSelectedNode(rootAgent);
          this.agentBuilderService.requestSideTabChange("config");
        }
      } else {
        const agentToolBoards = this.agentToolBoards();
        const parentAgent = agentToolBoards.get(parentContext!);

        if (parentAgent) {
          this.currentAgentTool.set(parentContext!);
          this.isAgentToolMode = true;
          this.loadAgentBoard(parentAgent);

          this.agentBuilderService.setSelectedNode(parentAgent);
          this.agentBuilderService.requestSideTabChange("config");
        }
      }
    } else {
      this.currentAgentTool.set(null);
      this.isAgentToolMode = false;

      const rootAgent = this.agentBuilderService.getRootNode();
      if (rootAgent) {
        this.loadAgentBoard(rootAgent);

        this.agentBuilderService.setSelectedNode(rootAgent);
        this.agentBuilderService.requestSideTabChange("config");
      }
    }
  }

  async loadAgentBoard(agent: AgentNode) {
    this.captureCurrentNodePositions();
    this.nodes.set([]);
    this.groupNodes.set([]);
    this.edges.set([]);

    this.nodeId = 0;
    this.edgeId = 0;

    this.loadAgentTools(agent);
    this.agentBuilderService.addNode(agent);

    if (agent.tools && agent.tools.length > 0) {
      this.agentBuilderService.setAgentTools(agent.name, agent.tools);
    } else {
      this.agentBuilderService.setAgentTools(agent.name, []);
    }

    if (agent.sub_agents && agent.sub_agents.length > 0) {
      await this.loadSubAgents(this.appName, agent);
    } else {
      const shellPoint = this.nodePositions.get(agent.name) ?? {
        x: 100,
        y: 150,
      };

      const shellNode = this.createNode(agent, shellPoint);
      this.nodes.set([shellNode]);

      if (this.isWorkflowAgent(agent.agent_class)) {
        const { groupNode, edge } = this.createWorkflowGroup(agent, shellNode, shellPoint);
        this.groupNodes.set([groupNode]);
        if (edge) {
          this.edges.set([edge]);
        }
      }
    }
    this.agentBuilderService.setSelectedNode(agent);
  }

  addAgentToolToAgent(agentToolName: string, targetAgentName: string) {
    const targetAgent = this.agentBuilderService.getNode(targetAgentName);

    if (targetAgent) {
      if (
        targetAgent.tools &&
        targetAgent.tools.some((tool) => tool.name === agentToolName)
      ) {
        return;
      }

      const agentTool: ToolNode = {
        name: agentToolName,
        toolType: "Agent Tool",
        toolAgentName: agentToolName,
      };

      if (!targetAgent.tools) {
        targetAgent.tools = [];
      }
      targetAgent.tools.push(agentTool);
      targetAgent.tools = targetAgent.tools.filter(
        (tool) => tool.name && tool.name.trim() !== ""
      );

      this.agentBuilderService.setAgentTools(
        targetAgentName,
        targetAgent.tools
      );
    }
  }

  addAgentToolToRoot(agentToolName: string) {
    const rootAgent = this.agentBuilderService.getRootNode();
    if (rootAgent) {
      if (
        rootAgent.tools &&
        rootAgent.tools.some((tool) => tool.name === agentToolName)
      ) {
        return;
      }

      const agentTool: ToolNode = {
        name: agentToolName,
        toolType: "Agent Tool",
        toolAgentName: agentToolName,
      };

      if (!rootAgent.tools) {
        rootAgent.tools = [];
      }
      rootAgent.tools.push(agentTool);

      this.agentBuilderService.setAgentTools("root_agent", rootAgent.tools);
    }
  }

  deleteAgentToolBoard(agentToolName: string) {
    const agentToolBoards = this.agentToolBoards();
    const newAgentToolBoards = new Map(agentToolBoards);
    newAgentToolBoards.delete(agentToolName);
    this.agentToolBoards.set(newAgentToolBoards);
    this.agentBuilderService.setAgentToolBoards(newAgentToolBoards);

    const allNodes = this.agentBuilderService.getNodes();
    for (const agent of allNodes) {
      if (agent.tools) {
        agent.tools = agent.tools.filter(
          (t) =>
            !(
              t.toolType === "Agent Tool" &&
              (t.toolAgentName === agentToolName || t.name === agentToolName)
            )
        );
        this.agentBuilderService.setAgentTools(agent.name, agent.tools);
      }
    }

    this.navigationStack = this.navigationStack.filter(
      (context) => context !== agentToolName
    );

    if (this.currentAgentTool() === agentToolName) {
      this.backToMainCanvas();
    }
  }

  getBackButtonTooltip(): string {
    if (this.navigationStack.length > 0) {
      const parentContext =
        this.navigationStack[this.navigationStack.length - 1];
      return parentContext === "main"
        ? "Back to Main Canvas"
        : `Back to ${parentContext}`;
    }
    return "Back to Main Canvas";
  }

  onBuilderAssistantClose(): void {
    this.builderAssistantCloseRequest.emit();
  }

  reloadCanvasFromYaml(): void {
    if (this.appNameInput) {
      this.agentService.getAgentBuilderTmp(this.appNameInput).subscribe({
        next: (yamlContent: string) => {
          if (yamlContent) {
            this.loadFromYaml(yamlContent, this.appNameInput);
          }
        },
        error: (error) => {
          console.error("Error reloading canvas:", error);
        },
      });
    }
  }

  private captureCurrentNodePositions() {
    for (const node of this.nodes()) {
      if (!node?.data) {
        continue;
      }

      const data = node.data();
      if (!data) {
        continue;
      }

      this.nodePositions.set(data.name, { ...node.point() });
    }
  }

  private updateGroupDimensions() {
    const NODE_WIDTH = 340;
    const BASE_NODE_HEIGHT = 120;
    const TOOL_ITEM_HEIGHT = 36;
    const TOOLS_CONTAINER_PADDING = 20;
    const ADD_BUTTON_WIDTH = 68;
    const PADDING = 40;
    const FIXED_NODE_Y = 80;

    for (const groupNode of this.groupNodes()) {
      if (!groupNode.data) continue;

      const groupAgentName = groupNode.data().name;

      const subAgents = this.nodes().filter(node =>
        node.parentId && node.parentId() === groupNode.id
      );

      if (subAgents.length === 0) {
        if (groupNode.width) groupNode.width.set(480);
        if (groupNode.height) groupNode.height.set(220);
        continue;
      }

      subAgents.sort((a, b) => a.point().x - b.point().x);

      subAgents.forEach((node, index) => {
        const NODE_WIDTH = 340;
        const ADD_BUTTON_WIDTH = 68;
        const SPACING = 20;
        const xPosition = 45 + index * (NODE_WIDTH + ADD_BUTTON_WIDTH + SPACING);

        const newPosition = { x: xPosition, y: FIXED_NODE_Y };
        node.point.set(newPosition);

        if (node.data) {
          const agentData = node.data();
          if (agentData) {
            this.nodePositions.set(agentData.name, newPosition);
          }
        }
      });

      let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;

      for (const node of subAgents) {
        const point = node.point();
        const nodeData = node.data ? node.data() : undefined;
        let nodeHeight = BASE_NODE_HEIGHT;
        if (nodeData && nodeData.tools && nodeData.tools.length > 0) {
          nodeHeight += TOOLS_CONTAINER_PADDING + (nodeData.tools.length * TOOL_ITEM_HEIGHT);
        }

        minX = Math.min(minX, point.x);
        minY = Math.min(minY, point.y);
        maxX = Math.max(maxX, point.x + NODE_WIDTH + ADD_BUTTON_WIDTH);
        maxY = Math.max(maxY, point.y + nodeHeight);
      }

      const width = maxX - minX + PADDING * 2;
      const height = maxY - minY + PADDING * 2;

      if (groupNode.width) groupNode.width.set(Math.max(480, width));
      if (groupNode.height) groupNode.height.set(Math.max(220, height));
    }
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

  isGroupEmpty(groupId: string): boolean {
    // Check if the group has any child nodes
    const hasChildren = this.nodes().some(node =>
      node.parentId && node.parentId() === groupId
    );
    return !hasChildren;
  }

  shouldShowAddButton(node: HtmlTemplateDynamicNode): boolean {
    const nodeData = node.data ? node.data() : undefined;
    if (!nodeData) return false;

    const isWorkflow = this.isWorkflowAgent(nodeData.agent_class);
    const isInsideGroup = node.parentId && node.parentId();

    // Don't show for workflow agents UNLESS they are inside a group (nested workflows)
    if (isWorkflow && !isInsideGroup) {
      return false;
    }

    if (!this.isNodeSelected(node)) {
      return false;
    }

    if (isInsideGroup && node.parentId) {
      const parentGroupId = node.parentId();

      const siblings = this.nodes().filter(n =>
        n.parentId && n.parentId() === parentGroupId
      );

      if (siblings.length === 0) return true;
      const rightmostSibling = siblings.reduce((rightmost, current) => {
        return current.point().x > rightmost.point().x ? current : rightmost;
      }, siblings[0]);

      return node.id === rightmostSibling.id;
    }

    return true;
  }
}
