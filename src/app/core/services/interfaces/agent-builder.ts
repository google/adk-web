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

import {InjectionToken} from '@angular/core';
import {BehaviorSubject, Observable} from 'rxjs';
import {AgentNode, CallbackNode, ToolNode} from '../../models/AgentBuilder';
import {AgentRunRequest} from '../../models/AgentRunRequest';
import {LlmResponse} from '../../models/types';

export const AGENT_BUILDER_SERVICE = new InjectionToken<AgentBuilderService>('AgentBuilderService');

/**
 * Service to provide methods to handle agent.
 */
export declare abstract class AgentBuilderService {
  abstract getNode(agentName: string): AgentNode | undefined;
  abstract getRootNode(): AgentNode | undefined;
  abstract addNode(newNode: AgentNode): void;
  abstract getNodes(): AgentNode[];
  abstract clear(): void;
  abstract getSelectedNode(): Observable<AgentNode | undefined>;
  abstract setSelectedNode(node: AgentNode | undefined): void;
  abstract getSelectedTool(): Observable<ToolNode | undefined>;
  abstract setSelectedTool(tool: ToolNode | undefined): void;
  abstract getSelectedCallback(): Observable<CallbackNode | undefined>;
  abstract setSelectedCallback(callback: CallbackNode | undefined): void;
  abstract getNextSubAgentName(): string;
  abstract addTool(agentName: string, tool: ToolNode): void;
  abstract deleteTool(agentName: string, toolToDelete: ToolNode): void;
  abstract addCallback(
    agentName: string,
    callback: CallbackNode,
  ): {success: boolean; error?: string};
  abstract updateCallback(
    agentName: string,
    originalCallbackName: string,
    updatedCallback: CallbackNode,
  ): {success: boolean; error?: string};
  abstract deleteCallback(
    agentName: string,
    callbackToDelete: CallbackNode,
  ): {success: boolean; error?: string};
  abstract setLoadedAgentData(agent: string | undefined): void;
  abstract getLoadedAgentData(): Observable<string | undefined>;
  abstract getAgentToolsMap(): Observable<Map<string, ToolNode[]>>;
  abstract getAgentCallbacksMap(): Observable<Map<string, CallbackNode[]>>;
  abstract requestSideTabChange(tabName: string): void;
  abstract getSideTabChangeRequest(): Observable<string | undefined>;
  abstract requestNewTab(toolName: string, currentAgentName?: string): void;
  abstract getNewTabRequest(): Observable<
    {tabName: string; currentAgentName?: string} | undefined
  >;
  abstract requestTabDeletion(toolName: string): void;
  abstract getTabDeletionRequest(): Observable<string | undefined>;
  abstract setAgentToolBoards(agentToolBoards: Map<string, AgentNode>): void;
  abstract getAgentToolBoards(): Observable<Map<string, AgentNode>>;
  abstract getCurrentAgentToolBoards(): Map<string, AgentNode>;
  abstract getAgentTools(): Observable<
    {agentName: string; tools: ToolNode[]} | undefined
  >;
  abstract getDeleteSubAgentSubject(): Observable<string>;
  abstract setDeleteSubAgentSubject(agentName: string): void;
  abstract getAddSubAgentSubject(): Observable<{
    parentAgentName: string;
    agentClass?: string;
    isFromEmptyGroup?: boolean;
  }>;
  abstract setAddSubAgentSubject(
    agentName: string,
    agentClass?: string,
    isFromEmptyGroup?: boolean,
  ): void;
  abstract setAgentTools(agentName?: string, tools?: ToolNode[]): void;
  abstract getAgentCallbacks(): Observable<
    {agentName: string; callbacks: CallbackNode[]} | undefined
  >;
  abstract setAgentCallbacks(
    agentName?: string,
    callbacks?: CallbackNode[],
  ): void;
  abstract getParentNode(
    current: AgentNode | undefined,
    target: AgentNode,
    parent: AgentNode | undefined,
    allTabAgents: Map<string, AgentNode>,
  ): AgentNode | undefined;
  abstract deleteNode(agentNode: AgentNode): void;
}
