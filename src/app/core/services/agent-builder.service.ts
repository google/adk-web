import { Injectable, InjectionToken } from '@angular/core';
import { Observable, BehaviorSubject } from 'rxjs';
import { map } from 'rxjs/operators';
import { AgentNode, ToolNode, CallbackNode } from '../models/AgentBuilder';

export const AGENT_BUILDER_SERVICE = new InjectionToken<AgentBuilderService>('AgentBuilderService');

@Injectable({
  providedIn: 'root'
})
export class AgentBuilderService {
  private nodes: AgentNode[] = [];
  private subAgentIdCounter = 1;

  private selectedToolSubject = new BehaviorSubject<any | undefined>(undefined);
  private selectedNodeSubject = new BehaviorSubject<AgentNode|undefined>(undefined);
  private selectedCallbackSubject = new BehaviorSubject<CallbackNode|undefined>(undefined);
  private loadedAgentDataSubject = new BehaviorSubject<string|undefined>(undefined);
  private agentToolsMapSubject = new BehaviorSubject<Map<string, ToolNode[]>>(new Map());
  private agentToolsSubject = new BehaviorSubject<{ agentName: string, tools: ToolNode[] } | undefined>(undefined);
  private newAgentToolBoardSubject = new BehaviorSubject<{toolName: string, currentAgentName?: string}|undefined>(undefined);
  private agentCallbacksMapSubject = new BehaviorSubject<Map<string, CallbackNode[]>>(new Map());
  private agentCallbacksSubject = new BehaviorSubject<{ agentName: string, callbacks: CallbackNode[] } | undefined>(undefined);
  private agentToolDeletionSubject = new BehaviorSubject<string|undefined>(undefined);
  private deleteSubAgentSubject = new BehaviorSubject<string>('');
  private addSubAgentSubject = new BehaviorSubject<{parentAgentName: string, agentClass?: string, isFromEmptyGroup?: boolean}>({parentAgentName: ''});
  private tabChangeSubject = new BehaviorSubject<string|undefined>(undefined);
  private agentToolBoardsSubject = new BehaviorSubject<Map<string, AgentNode>>(new Map());

  constructor() { }

  /**
   * Returns the node data.
   */
  getNode(agentName: string): AgentNode|undefined {
    const node = this.nodes.find(node => node.name === agentName);
    return node;
  }

  /**
   * Returns the root node data.
   */
  getRootNode(): AgentNode|undefined {
    const node = this.nodes.find(node => !!node.isRoot);
    return node;
  }

  /**
   * Adds a new AgentNode to the list.
   * @param newNode The agentNode to add.
   */
  addNode(newNode: AgentNode): void {
    const existingNodeIndex = this.nodes.findIndex(n => n.name === newNode.name);
    if (existingNodeIndex !== -1) {
      this.nodes[existingNodeIndex] = newNode;
    } else {
      this.nodes.push(newNode);
    }

    // If a new node's name matches the sub-agent pattern, update the counter
    // to avoid name collisions.
    const subAgentNamePattern = /^sub_agent_(\d+)$/;
    const match = newNode.name.match(subAgentNamePattern);
    if (match) {
      const numericPart = parseInt(match[1], 10);
      if (numericPart >= this.subAgentIdCounter) {
        this.subAgentIdCounter = numericPart + 1;
      }
    }

    const currentMap = this.agentToolsMapSubject.value;
    const newMap = new Map(currentMap);
    newMap.set(newNode.name, newNode.tools || []);
    this.agentToolsMapSubject.next(newMap);

    const currentCallbacksMap = this.agentCallbacksMapSubject.value;
    const newCallbacksMap = new Map(currentCallbacksMap);
    newCallbacksMap.set(newNode.name, newNode.callbacks || []);
    this.agentCallbacksMapSubject.next(newCallbacksMap);

    this.setSelectedNode(this.selectedNodeSubject.value);
  }

  getNodes(): AgentNode[] {
    return this.nodes;
  }

  clear() {
    this.nodes = [];
    this.subAgentIdCounter = 1;
    this.setSelectedNode(undefined);
    this.setSelectedTool(undefined);
    this.agentToolsMapSubject.next(new Map());
    this.agentCallbacksMapSubject.next(new Map());
    this.setSelectedCallback(undefined);
    this.setAgentTools();
    this.setAgentCallbacks();
  }

  getSelectedNode(): Observable<AgentNode|undefined> {
    return this.selectedNodeSubject.asObservable();
  }

  setSelectedNode(node: AgentNode | undefined) {
    this.selectedNodeSubject.next(node);
  }

  getSelectedTool(): Observable<ToolNode|undefined> {
    return this.selectedToolSubject.asObservable();
  }

  setSelectedTool(tool: ToolNode | undefined) {
    this.selectedToolSubject.next(tool);
  }

  getSelectedCallback(): Observable<CallbackNode|undefined> {
    return this.selectedCallbackSubject.asObservable();
  }

  setSelectedCallback(callback: CallbackNode | undefined) {
    this.selectedCallbackSubject.next(callback);
  }

  getNextSubAgentName(): string {
    return `sub_agent_${this.subAgentIdCounter++}`;
  }

  addTool(agentName: string, tool: ToolNode) {
    const agentNode = this.getNode(agentName);
    if (agentNode) {
      const oldTools = agentNode.tools || [];
      agentNode.tools = [tool, ...oldTools];

      const currentMap = this.agentToolsMapSubject.value;
      const newMap = new Map(currentMap);
      newMap.set(agentName, agentNode.tools);
      this.agentToolsMapSubject.next(newMap);
    }
  }

  deleteTool(agentName: string, toolToDelete: ToolNode) {
    const agentNode = this.getNode(agentName);
    if (agentNode && agentNode.tools) {
      const originalLength = agentNode.tools.length;
      agentNode.tools = agentNode.tools.filter(t => t.name !== toolToDelete.name);

      if (agentNode.tools.length < originalLength) {
        const currentMap = this.agentToolsMapSubject.value;
        const newMap = new Map(currentMap);
        newMap.set(agentName, agentNode.tools);
        this.agentToolsMapSubject.next(newMap);

        if (this.selectedToolSubject.value?.name === toolToDelete.name) {
          this.setSelectedTool(undefined);
        }
      }
    }
  }

  addCallback(agentName: string, callback: CallbackNode): { success: boolean, error?: string } {
    try {
      const agentNode = this.getNode(agentName);
      if (!agentNode) {
        return { success: false, error: 'Agent not found' };
      }

      if (!agentNode.callbacks) {
        agentNode.callbacks = [];
      }

      // Check for duplicate callback names
      const duplicateCallback = agentNode.callbacks.find(cb => cb.name === callback.name);
      if (duplicateCallback) {
        return { success: false, error: `Callback with name '${callback.name}' already exists` };
      }

      agentNode.callbacks.push(callback);
      this.agentCallbacksSubject.next({ agentName, callbacks: agentNode.callbacks });

      const currentMap = this.agentCallbacksMapSubject.value;
      const newMap = new Map(currentMap);
      newMap.set(agentName, agentNode.callbacks);
      this.agentCallbacksMapSubject.next(newMap);

      return { success: true };
    } catch (error) {
      return { success: false, error: 'Failed to add callback: ' + (error as Error).message };
    }
  }

  updateCallback(
    agentName: string,
    originalCallbackName: string,
    updatedCallback: CallbackNode,
  ): { success: boolean; error?: string } {
    try {
      const agentNode = this.getNode(agentName);
      if (!agentNode) {
        return { success: false, error: 'Agent not found' };
      }

      if (!agentNode.callbacks) {
        return { success: false, error: 'No callbacks found for this agent' };
      }

      const callbackIndex = agentNode.callbacks.findIndex(cb => cb.name === originalCallbackName);
      if (callbackIndex === -1) {
        return { success: false, error: 'Callback not found' };
      }

      const duplicateExists = agentNode.callbacks.some((cb, index) => {
        return index !== callbackIndex && cb.name === updatedCallback.name;
      });

      if (duplicateExists) {
        return { success: false, error: `Callback with name '${updatedCallback.name}' already exists` };
      }

      const mergedCallback = {
        ...agentNode.callbacks[callbackIndex],
        ...updatedCallback,
      };

      agentNode.callbacks[callbackIndex] = mergedCallback;
      this.agentCallbacksSubject.next({ agentName, callbacks: agentNode.callbacks });

      const currentMap = this.agentCallbacksMapSubject.value;
      const newMap = new Map(currentMap);
      newMap.set(agentName, agentNode.callbacks);
      this.agentCallbacksMapSubject.next(newMap);

      if (this.selectedCallbackSubject.value?.name === originalCallbackName) {
        this.setSelectedCallback(mergedCallback);
      }

      return { success: true };
    } catch (error) {
      return { success: false, error: 'Failed to update callback: ' + (error as Error).message };
    }
  }

  deleteCallback(agentName: string, callbackToDelete: CallbackNode): { success: boolean, error?: string } {
    try {
      const agentNode = this.getNode(agentName);
      if (!agentNode) {
        return { success: false, error: 'Agent not found' };
      }

      if (!agentNode.callbacks) {
        return { success: false, error: 'No callbacks found for this agent' };
      }

      const callbackIndex = agentNode.callbacks.findIndex(callback => callback.name === callbackToDelete.name);
      if (callbackIndex === -1) {
        return { success: false, error: 'Callback not found' };
      }

      agentNode.callbacks.splice(callbackIndex, 1);
      this.agentCallbacksSubject.next({ agentName, callbacks: agentNode.callbacks });

      const currentMap = this.agentCallbacksMapSubject.value;
      const newMap = new Map(currentMap);
      newMap.set(agentName, agentNode.callbacks);
      this.agentCallbacksMapSubject.next(newMap);

      // Clear selection if the deleted callback was selected
      if (this.selectedCallbackSubject.value?.name === callbackToDelete.name) {
        this.setSelectedCallback(undefined);
      }

      return { success: true };
    } catch (error) {
      return { success: false, error: 'Failed to delete callback: ' + (error as Error).message };
    }
  }

  setLoadedAgentData(agent: string | undefined) {
    this.loadedAgentDataSubject.next(agent);
  }

  getLoadedAgentData(): Observable<string|undefined> {
    return this.loadedAgentDataSubject.asObservable();
  }

  getAgentToolsMap(): Observable<Map<string, ToolNode[]>> {
    return this.agentToolsMapSubject.asObservable();
  }

  getAgentCallbacksMap(): Observable<Map<string, CallbackNode[]>> {
    return this.agentCallbacksMapSubject.asObservable();
  }

  requestSideTabChange(tabName: string) {
    this.tabChangeSubject.next(tabName);
  }

  getSideTabChangeRequest(): Observable<string|undefined> {
    return this.tabChangeSubject.asObservable();
  }

  requestNewTab(toolName: string, currentAgentName?: string) {
    this.newAgentToolBoardSubject.next({toolName, currentAgentName});
  }

  getNewTabRequest(): Observable<{tabName: string, currentAgentName?: string}|undefined> {
    const newTabRequest = this.newAgentToolBoardSubject.asObservable();
    // Map the property names to match expected interface
    return newTabRequest.pipe(
      map(request => request ? { tabName: request.toolName, currentAgentName: request.currentAgentName } : undefined)
    ) as Observable<{tabName: string, currentAgentName?: string}|undefined>;
  }

  requestTabDeletion(toolName: string) {
    this.agentToolDeletionSubject.next(toolName);
  }

  getTabDeletionRequest(): Observable<string|undefined> {
    return this.agentToolDeletionSubject.asObservable();
  }

  setAgentToolBoards(agentToolBoards: Map<string, AgentNode>) {
    this.agentToolBoardsSubject.next(agentToolBoards);
  }

  getAgentToolBoards(): Observable<Map<string, AgentNode>> {
    return this.agentToolBoardsSubject.asObservable();
  }

  getCurrentAgentToolBoards(): Map<string, AgentNode> {
    return this.agentToolBoardsSubject.value;
  }

  getAgentTools(): Observable<{ agentName: string, tools: ToolNode[] } | undefined> {
    return this.agentToolsSubject.asObservable();
  }

  getDeleteSubAgentSubject(): Observable<string> {
    return this.deleteSubAgentSubject.asObservable();
  }

  setDeleteSubAgentSubject(agentName: string) {
    this.deleteSubAgentSubject.next(agentName);
  }

  getAddSubAgentSubject(): Observable<{parentAgentName: string, agentClass?: string, isFromEmptyGroup?: boolean}> {
    return this.addSubAgentSubject.asObservable();
  }

  setAddSubAgentSubject(agentName: string, agentClass?: string, isFromEmptyGroup?: boolean) {
    this.addSubAgentSubject.next({parentAgentName: agentName, agentClass, isFromEmptyGroup});
  }

  setAgentTools(agentName?: string, tools?: ToolNode[]) {
    if (agentName && tools) {
      this.agentToolsSubject.next({ agentName, tools });
      const currentMap = this.agentToolsMapSubject.value;
      const newMap = new Map(currentMap);
      newMap.set(agentName, tools);
      this.agentToolsMapSubject.next(newMap);
    } else {
      this.agentToolsSubject.next(undefined);
    }
  }

  getAgentCallbacks(): Observable<{ agentName: string, callbacks: CallbackNode[] } | undefined> {
    return this.agentCallbacksSubject.asObservable();
  }

  setAgentCallbacks(agentName?: string, callbacks?: CallbackNode[]) {
    if (agentName && callbacks) {
      this.agentCallbacksSubject.next({ agentName, callbacks });
    } else {
      this.agentCallbacksSubject.next(undefined);
    }
  }

  getParentNode(current: AgentNode | undefined, target: AgentNode, parent: AgentNode | undefined, allTabAgents: Map<string, AgentNode>): AgentNode | undefined {
    if (!current) {
      return undefined;
    }

    if (current.name === target.name) {
      return parent;
    }

    // Search within sub-agents
    for (const subNode of current.sub_agents) {
      const foundParent = this.getParentNode(subNode, target, current, allTabAgents);
      if (foundParent) {
        return foundParent;
      }
    }

    // Search within agent tools
    if (current.tools) {
      for (const tool of current.tools) {
        if (tool.toolType === 'Agent Tool') {
          const agentToolNode = allTabAgents.get(tool.toolAgentName || tool.name);
          if (agentToolNode) {
            const foundParent = this.getParentNode(agentToolNode, target, current, allTabAgents);
            if (foundParent) {
              return foundParent;
            }
          }
        }
      }
    }

    return undefined;
  }

  deleteNode(agentNode: AgentNode) {
    this.nodes = this.nodes.filter(node => node.name !== agentNode.name);

    this.setSelectedNode(this.selectedNodeSubject.value);
  }
}
