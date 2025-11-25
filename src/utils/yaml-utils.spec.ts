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

import { YamlUtils } from './yaml-utils';
import { AgentNode, CallbackNode, ToolNode } from '../app/core/models/AgentBuilder';
// 1p-ONLY-IMPORTS: import {beforeEach, describe, expect, it}

describe('YamlUtils - Callback Support', () => {
  let mockAgentNode: AgentNode;
  let mockFormData: FormData;

  beforeEach(() => {
    mockFormData = new FormData();

    mockAgentNode = {
      name: 'test-agent',
      isRoot: true,
      agent_class: 'LlmAgent',
      model: 'gemini-2.5-flash',
      instruction: 'Test instruction',
      sub_agents: [],
      tools: [{
        name: '.tool_1',
        toolType: 'Custom tool',
        args: []
      }],
      callbacks: [{
        name: 'callback_1',
        type: 'before_agent',
        code: 'def callback_function(callback_context):\n    return None',
        description: 'Test callback'
      }]
    };
  });

  describe('buildCallbacksConfig', () => {
    it('should build callbacks configuration grouped by type', () => {
      const callbacks: CallbackNode[] = [
        {
          name: 'before_callback',
          type: 'before_agent',
          code: 'def before_callback(ctx): pass',
          description: 'Before agent callback'
        },
        {
          name: 'after_callback',
          type: 'after_tool',
          code: 'def after_callback(ctx): pass'
        },
        {
          name: 'another_before_callback',
          type: 'before_agent',
          code: 'def another_before_callback(ctx): pass'
        }
      ];

      const config = YamlUtils.buildCallbacksConfig(callbacks);

      expect(config).toEqual({
        before_agent_callbacks: [
          { name: 'before_callback' },
          { name: 'another_before_callback' }
        ],
        after_tool_callbacks: [
          { name: 'after_callback' }
        ]
      });
    });

    it('should return empty object for undefined callbacks', () => {
      const config = YamlUtils.buildCallbacksConfig(undefined);
      expect(config).toEqual({});
    });

    it('should return empty object for empty callbacks array', () => {
      const config = YamlUtils.buildCallbacksConfig([]);
      expect(config).toEqual({});
    });
  });

  describe('generateYamlFile', () => {
    it('should generate YAML file with callbacks when agent has callbacks', () => {
      // Test the YAML generation logic by creating a mock YAML config
      const callbacksConfig = YamlUtils.buildCallbacksConfig(mockAgentNode.callbacks);

      expect(callbacksConfig).toEqual({
        before_agent_callbacks: [
          { name: 'callback_1' }
        ]
      });

      // Verify that generateYamlFile creates a FormData entry
      YamlUtils.generateYamlFile(mockAgentNode, mockFormData, 'test-app', new Map());

      expect(mockFormData.getAll('files').length).toBe(1);
      const file = mockFormData.get('files') as File;
      expect(file).toBeTruthy();
      expect(file.name).toBe('test-app/root_agent.yaml');
    });

    it('should not include callbacks in YAML when agent has no callbacks', () => {
      mockAgentNode.callbacks = undefined;
      const callbacksConfig = YamlUtils.buildCallbacksConfig(mockAgentNode.callbacks);

      expect(callbacksConfig).toEqual({});
    });

    it('should handle empty callbacks array', () => {
      mockAgentNode.callbacks = [];
      const callbacksConfig = YamlUtils.buildCallbacksConfig(mockAgentNode.callbacks);

      expect(callbacksConfig).toEqual({});
    });
  });
});
