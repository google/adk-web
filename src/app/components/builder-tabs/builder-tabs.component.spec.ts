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

import { ComponentFixture, TestBed } from '@angular/core/testing';
import { BuilderTabsComponent } from './builder-tabs.component';
import { AGENT_BUILDER_SERVICE, AgentBuilderService } from '../../core/services/agent-builder.service';
import {AGENT_SERVICE} from '../../core/services/interfaces/agent';
import {CallbackNode} from '../../core/models/AgentBuilder';
import {provideNoopAnimations} from '@angular/platform-browser/animations';
import {FEATURE_FLAG_SERVICE} from '../../core/services/interfaces/feature-flag';
import {MockFeatureFlagService} from '../../core/services/testing/mock-feature-flag.service';
import {MatDialog} from '@angular/material/dialog';
import {MatSnackBar} from '@angular/material/snack-bar';
import {Router} from '@angular/router';

describe('BuilderTabsComponent - Callback Support', () => {
  let component: BuilderTabsComponent;
  let fixture: ComponentFixture<BuilderTabsComponent>;

  beforeEach(async () => {
    const agentServiceSpy = jasmine.createSpyObj('AgentService', [
      'getApp',
      'agentBuild',
    ]);
    const mockFeatureFlagService = new MockFeatureFlagService();
    const mockDialog = jasmine.createSpyObj('MatDialog', ['open']);
    const mockSnackBar = jasmine.createSpyObj('MatSnackBar', ['open']);
    const mockRouter = jasmine.createSpyObj('Router', ['navigate']);

    await TestBed.configureTestingModule({
      imports: [BuilderTabsComponent],
      providers: [
        {provide: AGENT_BUILDER_SERVICE, useExisting: AgentBuilderService},
        {provide: AGENT_SERVICE, useValue: agentServiceSpy},
        {provide: FEATURE_FLAG_SERVICE, useValue: mockFeatureFlagService},
        {provide: MatDialog, useValue: mockDialog},
        {provide: MatSnackBar, useValue: mockSnackBar},
        {provide: Router, useValue: mockRouter},
        provideNoopAnimations(),
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(BuilderTabsComponent);
    component = fixture.componentInstance;
  });

  describe('Callback Properties', () => {
    it('should have callback-related properties', () => {
      expect(component.callbackTypes).toBeDefined();
      expect(component.callbackTypes.length).toBe(6);
      expect(component.callbackTypes).toContain('before_agent');
      expect(component.callbackTypes).toContain('after_agent');
      expect(component.callbackTypes).toContain('before_model');
      expect(component.callbackTypes).toContain('after_model');
      expect(component.callbackTypes).toContain('before_tool');
      expect(component.callbackTypes).toContain('after_tool');
    });
  });

  describe('Callback Methods', () => {
    let mockCallback: CallbackNode;

    beforeEach(() => {
      mockCallback = {
        name: 'test_callback',
        type: 'before_agent',
        code: 'def test_callback(ctx): pass',
        description: 'Test callback',
      };
    });

    it('should select callback correctly', () => {
      component.selectCallback(mockCallback);

      expect(component.editingCallback).toBe(mockCallback);
    });

    it('should navigate back to callback list', () => {
      component.editingCallback = mockCallback;

      component.backToCallbackList();

      expect(component.editingCallback).toBeNull();
    });

    it('should handle callback type change', () => {
      const callback = {...mockCallback};

      component.onCallbackTypeChange(callback);

      expect(callback.type).toBe('before_agent');
    });
  });

  describe('Service Integration', () => {
    it('should subscribe to selected callback changes', () => {
      const mockCallback: CallbackNode = {
        name: 'test_callback',
        type: 'before_agent',
        code: 'def test_callback(ctx): pass',
      };

      fixture.detectChanges(); // Trigger component initialization
      TestBed.inject(AgentBuilderService).setSelectedCallback(mockCallback);

      expect(component.selectedCallback).toBe(mockCallback);
      expect(component.selectedTabIndex).toBe(3); // Callback tab index
    });

    it('should subscribe to agent callback updates', () => {
      component.agentConfig = {
        name: 'test-agent',
        isRoot: true,
        agent_class: 'LlmAgent',
        model: 'gemini-2.5-flash',
        instruction: 'test',
        sub_agents: [],
        tools: [],
        callbacks: [],
      };
      const mockCallbacks: CallbackNode[] = [
        {
          name: 'callback1',
          type: 'before_agent',
          code: 'def callback1(ctx): pass',
        },
      ];
      fixture.detectChanges(); // Trigger component initialization

      TestBed.inject(AgentBuilderService).setAgentCallbacks(
        'test-agent',
        mockCallbacks,
      );

      expect(component.agentConfig?.callbacks).toEqual(mockCallbacks);
    });
  });

  describe('Callback UI Behavior', () => {
    it('should set selectedTabIndex to 3 when selecting a callback', () => {
      const mockCallback: CallbackNode = {
        name: 'test_callback',
        type: 'before_agent',
        code: 'def test_callback(ctx): pass',
      };

      fixture.detectChanges();
      TestBed.inject(AgentBuilderService).setSelectedCallback(mockCallback);

      expect(component.selectedTabIndex).toBe(3);
      expect(component.editingCallback).toBe(mockCallback);
    });

    it('should handle null callback selection', () => {
      fixture.detectChanges();
      component.editingCallback = {
        name: 'test',
        type: 'before_agent',
        code: '',
      };

      TestBed.inject(AgentBuilderService).setSelectedCallback(undefined);

      expect(component.editingCallback).toBeNull();
    });
  });

  describe('Callback Code Field', () => {
    it('should initialize callback with empty code', () => {
      const mockCallback: CallbackNode = {
        name: 'new_callback',
        type: 'before_agent',
        code: '',
      };

      component.selectCallback(mockCallback);

      expect(component.editingCallback?.code).toBe('');
    });

    it('should preserve callback code when editing', () => {
      const customCode =
        'def my_callback(ctx):\n    print("Custom callback")\n    return None';
      const mockCallback: CallbackNode = {
        name: 'custom_callback',
        type: 'after_agent',
        code: customCode,
      };

      component.selectCallback(mockCallback);

      expect(component.editingCallback?.code).toBe(customCode);
    });

    it('should handle callback with description', () => {
      const mockCallback: CallbackNode = {
        name: 'descriptive_callback',
        type: 'before_tool',
        code: 'def callback(ctx): pass',
        description: 'This callback logs tool execution',
      };

      component.selectCallback(mockCallback);

      expect(component.editingCallback?.description).toBe(
        'This callback logs tool execution'
      );
    });
  });

  describe('Callback Type Validation', () => {
    it('should have all ADK callback types available', () => {
      const expectedTypes = [
        'before_agent',
        'before_model',
        'before_tool',
        'after_tool',
        'after_model',
        'after_agent',
      ];

      expect(component.callbackTypes).toEqual(expectedTypes);
    });
  });

  describe('Agent Config with Callbacks', () => {
    it('should update agent callbacks when service emits update', () => {
      const cdr = (component as any).cdr;
      const markForCheckSpy = spyOn(cdr, 'markForCheck');
      fixture.detectChanges();
      component.agentConfig = {
        name: 'test-agent',
        isRoot: false,
        agent_class: 'LlmAgent',
        model: 'gemini-2.5-flash',
        instruction: 'test instruction',
        sub_agents: [],
        tools: [],
        callbacks: [],
      };

      const newCallbacks: CallbackNode[] = [
        {name: 'callback1', type: 'before_agent', code: 'def cb1(ctx): pass'},
        {name: 'callback2', type: 'after_model', code: 'def cb2(ctx): pass'},
      ];

      TestBed.inject(AgentBuilderService).setAgentCallbacks('test-agent', newCallbacks);

      expect(component.agentConfig.callbacks?.length).toBe(2);
      expect(component.agentConfig.callbacks).toEqual(newCallbacks);
      expect(markForCheckSpy).toHaveBeenCalled();
    });

    it('should not update callbacks for different agent', () => {
      fixture.detectChanges();
      component.agentConfig = {
        name: 'current-agent',
        isRoot: false,
        agent_class: 'LlmAgent',
        model: 'gemini-2.5-flash',
        instruction: 'test',
        sub_agents: [],
        tools: [],
        callbacks: [],
      };

      const newCallbacks: CallbackNode[] = [
        {name: 'callback1', type: 'before_agent', code: 'def cb1(ctx): pass'},
      ];

      TestBed.inject(AgentBuilderService).setAgentCallbacks('different-agent', newCallbacks);

      expect(component.agentConfig.callbacks?.length).toBe(0);
    });
  });
});
