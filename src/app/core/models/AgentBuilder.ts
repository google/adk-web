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

export interface AgentNode {
    isRoot: boolean;
    name: string;
    agent_class: string;
    model: string;
    instruction: string;
    description?: string;
    output_key?: string;
    max_iterations?: number;
    sub_agents: AgentNode[];
    tools?: ToolNode[];
    callbacks?: CallbackNode[];
    config_path?: string;
    isAgentTool?: boolean;
    skip_summarization?: boolean;
}

export interface ToolNode {
    name: string;
    toolType: string;
    toolAgentName?: string;
    args?: {[key: string]: any};
}

export interface CallbackNode {
    name: string;
    type: 'before_agent' | 'after_agent' | 'before_model' | 'after_model' | 'before_tool' | 'after_tool';
    code?: string;
    description?: string;
}

export interface YamlConfig {
  name: string;
  model: string;
  agent_class: string;
  description?: string;
  instruction?: string;
  max_iterations?: number;
  sub_agents: any;
  tools?: any[];
  callbacks?: any[];
}

export interface DiagramNode {
  id: string;
  type: 'agent' | 'tool';
  x: number;
  y: number;
  label: string;
  color: string;
  icon: string;
  data: AgentNode | ToolNode;
}

export interface DiagramConnection {
  id: string;
  fromNodeId: string;
  toNodeId: string;
  fromX: number;
  fromY: number;
  toX: number;
  toY: number;
}
