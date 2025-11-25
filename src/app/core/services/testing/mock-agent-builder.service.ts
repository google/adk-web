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

import {Injectable} from '@angular/core';
import {BehaviorSubject} from 'rxjs';
import {
  AgentNode,
  CallbackNode,
  ToolNode,
} from '../../models/AgentBuilder';
import {AgentBuilderService} from '../interfaces/agent-builder';

@Injectable()
export class MockAgentBuilderService implements AgentBuilderService {
  getNode = jasmine.createSpy('getNode');
  getRootNode = jasmine.createSpy('getRootNode');
  addNode = jasmine.createSpy('addNode');
  getNodes = jasmine.createSpy('getNodes');
  clear = jasmine.createSpy('clear');

  selectedNodeSubject = new BehaviorSubject<AgentNode | undefined>(undefined);
  getSelectedNode = jasmine
    .createSpy('getSelectedNode')
    .and.returnValue(this.selectedNodeSubject);
  setSelectedNode = jasmine.createSpy('setSelectedNode');

  selectedToolSubject = new BehaviorSubject<ToolNode | undefined>(undefined);
  getSelectedTool = jasmine
    .createSpy('getSelectedTool')
    .and.returnValue(this.selectedToolSubject);
  setSelectedTool = jasmine.createSpy('setSelectedTool');

  selectedCallbackSubject = new BehaviorSubject<CallbackNode | undefined>(
    undefined,
  );
  getSelectedCallback = jasmine
    .createSpy('getSelectedCallback')
    .and.returnValue(this.selectedCallbackSubject);
  setSelectedCallback = jasmine.createSpy('setSelectedCallback');

  getNextSubAgentName = jasmine.createSpy('getNextSubAgentName');
  addTool = jasmine.createSpy('addTool');
  deleteTool = jasmine.createSpy('deleteTool');
  addCallback = jasmine.createSpy('addCallback');
  updateCallback = jasmine.createSpy('updateCallback');
  deleteCallback = jasmine.createSpy('deleteCallback');
  setLoadedAgentData = jasmine.createSpy('setLoadedAgentData');

  loadedAgentDataSubject = new BehaviorSubject<string | undefined>(undefined);
  getLoadedAgentData = jasmine
    .createSpy('getLoadedAgentData')
    .and.returnValue(this.loadedAgentDataSubject);

  agentToolsMapSubject = new BehaviorSubject<Map<string, ToolNode[]>>(
    new Map(),
  );
  getAgentToolsMap = jasmine
    .createSpy('getAgentToolsMap')
    .and.returnValue(this.agentToolsMapSubject);

  agentCallbacksMapSubject = new BehaviorSubject<Map<string, CallbackNode[]>>(
    new Map(),
  );
  getAgentCallbacksMap = jasmine
    .createSpy('getAgentCallbacksMap')
    .and.returnValue(this.agentCallbacksMapSubject);

  requestSideTabChange = jasmine.createSpy('requestSideTabChange');

  tabChangeSubject = new BehaviorSubject<string | undefined>(undefined);
  getSideTabChangeRequest = jasmine
    .createSpy('getSideTabChangeRequest')
    .and.returnValue(this.tabChangeSubject);

  requestNewTab = jasmine.createSpy('requestNewTab');

  newAgentToolBoardSubject = new BehaviorSubject<
    {tabName: string; currentAgentName?: string} | undefined
  >(undefined);
  getNewTabRequest = jasmine
    .createSpy('getNewTabRequest')
    .and.returnValue(this.newAgentToolBoardSubject);

  requestTabDeletion = jasmine.createSpy('requestTabDeletion');

  agentToolDeletionSubject = new BehaviorSubject<string | undefined>(undefined);
  getTabDeletionRequest = jasmine
    .createSpy('getTabDeletionRequest')
    .and.returnValue(this.agentToolDeletionSubject);

  setAgentToolBoards = jasmine.createSpy('setAgentToolBoards');

  agentToolBoardsSubject = new BehaviorSubject<Map<string, AgentNode>>(
    new Map(),
  );
  getAgentToolBoards = jasmine
    .createSpy('getAgentToolBoards')
    .and.returnValue(this.agentToolBoardsSubject);

  getCurrentAgentToolBoards = jasmine.createSpy('getCurrentAgentToolBoards');

  agentToolsSubject = new BehaviorSubject<
    {agentName: string; tools: ToolNode[]} | undefined
  >(undefined);
  getAgentTools = jasmine
    .createSpy('getAgentTools')
    .and.returnValue(this.agentToolsSubject);

  deleteSubAgentSubject = new BehaviorSubject<string>('');
  getDeleteSubAgentSubject = jasmine
    .createSpy('getDeleteSubAgentSubject')
    .and.returnValue(this.deleteSubAgentSubject);
  setDeleteSubAgentSubject = jasmine.createSpy('setDeleteSubAgentSubject');

  addSubAgentSubject = new BehaviorSubject<{
    parentAgentName: string;
    agentClass?: string;
    isFromEmptyGroup?: boolean;
  }>({parentAgentName: ''});
  getAddSubAgentSubject = jasmine
    .createSpy('getAddSubAgentSubject')
    .and.returnValue(this.addSubAgentSubject);
  setAddSubAgentSubject = jasmine.createSpy('setAddSubAgentSubject');

  setAgentTools = jasmine.createSpy('setAgentTools');

  agentCallbacksSubject = new BehaviorSubject<
    {agentName: string; callbacks: CallbackNode[]} | undefined
  >(undefined);
  getAgentCallbacks = jasmine
    .createSpy('getAgentCallbacks')
    .and.returnValue(this.agentCallbacksSubject);

  setAgentCallbacks = jasmine.createSpy('setAgentCallbacks');
  getParentNode = jasmine.createSpy('getParentNode');
  deleteNode = jasmine.createSpy('deleteNode');
}
