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

import { TestBed } from '@angular/core/testing';
import { AgentBuilderService } from './agent-builder.service';
import {AGENT_BUILDER_SERVICE} from './interfaces/agent-builder';
import { AgentNode, CallbackNode } from '../models/AgentBuilder';
import {firstValueFrom} from 'rxjs';
// 1p-ONLY-IMPORTS: import {beforeEach, describe, expect, it}
import {initTestBed} from '../../testing/utils';

describe('AgentBuilderService - Callback Management', () => {
  let service: AgentBuilderService;
  let mockAgentNode: AgentNode;

  beforeEach(() => {
    initTestBed();  // required for 1p compat
    TestBed.configureTestingModule({providers: [
      AgentBuilderService,
    ]});
    service = TestBed.inject(AgentBuilderService);

    mockAgentNode = {
      name: 'test-agent',
      isRoot: true,
      agent_class: 'LlmAgent',
      model: 'gemini-2.5-flash',
      instruction: 'Test instruction',
      sub_agents: [],
      tools: [],
      callbacks: [],
    };

    service.addNode(mockAgentNode);
  });

  afterEach(() => {
    service.clear();
  });

  describe('addCallback', () => {
    it('should add a callback to an agent', () => {
      const callback: CallbackNode = {
        name: 'test_callback',
        type: 'before_agent',
        code: 'def test_callback(callback_context): return None',
        description: 'Test callback',
      };

      const result = service.addCallback('test-agent', callback);

      expect(result.success).toBe(true);
      const agent = service.getNode('test-agent');
      expect(agent?.callbacks).toContain(callback);
      expect(agent?.callbacks?.length).toBe(1);
    });

    it('should handle adding callbacks to non-existent agent', () => {
      const callback: CallbackNode = {
        name: 'test_callback',
        type: 'before_agent',
        code: 'def test_callback(callback_context): return None',
      };

      const result = service.addCallback('non-existent', callback);
      expect(result.success).toBe(false);
      expect(result.error).toBe('Agent not found');

      const agent = service.getNode('non-existent');
      expect(agent).toBeUndefined();
    });

    it('should initialize callbacks array if undefined', () => {
      // Remove callbacks array
      const agent = service.getNode('test-agent');
      if (agent) {
        agent.callbacks = undefined;
      }

      const callback: CallbackNode = {
        name: 'test_callback',
        type: 'before_agent',
        code: 'def test_callback(callback_context): return None',
      };

      const result = service.addCallback('test-agent', callback);

      expect(result.success).toBe(true);
      const updatedAgent = service.getNode('test-agent');
      expect(updatedAgent?.callbacks).toBeDefined();
      expect(updatedAgent?.callbacks?.length).toBe(1);
    });

    it('should emit callback update', () => {
      spyOn(service['agentCallbacksSubject'], 'next');

      const callback: CallbackNode = {
        name: 'test_callback',
        type: 'before_agent',
        code: 'def test_callback(callback_context): return None',
      };

      const result = service.addCallback('test-agent', callback);

      expect(result.success).toBe(true);
      expect(service['agentCallbacksSubject'].next).toHaveBeenCalledWith({
        agentName: 'test-agent',
        callbacks: [callback],
      });
    });

    it('should reject duplicate callback names', () => {
      const callback1: CallbackNode = {
        name: 'duplicate_callback',
        type: 'before_agent',
        code: 'def duplicate_callback(ctx): pass',
      };

      const callback2: CallbackNode = {
        name: 'duplicate_callback',
        type: 'after_agent',
        code: 'def duplicate_callback(ctx): pass',
      };

      const result1 = service.addCallback('test-agent', callback1);
      expect(result1.success).toBe(true);

      const result2 = service.addCallback('test-agent', callback2);
      expect(result2.success).toBe(false);
      expect(result2.error).toContain('already exists');
    });
  });

  describe('deleteCallback', () => {
    let callback: CallbackNode;

    beforeEach(() => {
      callback = {
        name: 'test_callback',
        type: 'before_agent',
        code: 'def test_callback(callback_context): return None',
      };
      service.addCallback('test-agent', callback);
    });

    it('should delete a callback from an agent', () => {
      const result = service.deleteCallback('test-agent', callback);

      expect(result.success).toBe(true);
      const agent = service.getNode('test-agent');
      expect(agent?.callbacks).not.toContain(callback);
      expect(agent?.callbacks?.length).toBe(0);
    });

    it('should handle deleting from non-existent agent', () => {
      expect(() =>
        service.deleteCallback('non-existent', callback)
      ).not.toThrow();
    });

    it('should emit callback update after deletion', () => {
      spyOn(service['agentCallbacksSubject'], 'next');

      service.deleteCallback('test-agent', callback);

      expect(service['agentCallbacksSubject'].next).toHaveBeenCalledWith({
        agentName: 'test-agent',
        callbacks: [],
      });
    });

    it('should clear selected callback if deleted', async () => {
      service.setSelectedCallback(callback);

      service.deleteCallback('test-agent', callback);

      expect(
        await firstValueFrom(service.getSelectedCallback())
      ).toBeUndefined();
    });
  });

  describe('callback selection', () => {
    it('should get and set selected callback', async () => {
      const callback: CallbackNode = {
        name: 'test_callback',
        type: 'before_agent',
        code: 'def test_callback(callback_context): return None',
      };

      service.setSelectedCallback(callback);

      expect(await firstValueFrom(service.getSelectedCallback())).toBe(
        callback
      );
    });

    it('should clear selected callback', async () => {
      const callback: CallbackNode = {
        name: 'test_callback',
        type: 'before_agent',
        code: 'def test_callback(callback_context): return None',
      };

      service.setSelectedCallback(callback);
      service.setSelectedCallback(undefined);

      expect(
        await firstValueFrom(service.getSelectedCallback())
      ).toBeUndefined();
    });
  });

  describe('getAgentCallbacks', () => {
    it('should emit callback updates', async () => {
      const callback: CallbackNode = {
        name: 'test_callback',
        type: 'before_agent',
        code: 'def test_callback(callback_context): return None',
      };

      service.addCallback('test-agent', callback);

      expect(await firstValueFrom(service.getAgentCallbacks())).toEqual({
        agentName: 'test-agent',
        callbacks: [callback],
      });
    });
  });

  describe('setAgentCallbacks', () => {
    it('should set callbacks with agent name and callbacks', async () => {
      const callbacks: CallbackNode[] = [
        {
          name: 'test_callback',
          type: 'before_agent',
          code: 'def test_callback(callback_context): return None',
        },
      ];

      service.setAgentCallbacks('test-agent', callbacks);

      expect(await firstValueFrom(service.getAgentCallbacks())).toEqual({
        agentName: 'test-agent',
        callbacks: callbacks,
      });
    });

    it('should clear callbacks when called without parameters', async () => {
      service.setAgentCallbacks();

      expect(await firstValueFrom(service.getAgentCallbacks())).toBeUndefined();
    });
  });
});
