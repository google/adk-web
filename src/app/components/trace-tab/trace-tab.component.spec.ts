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
import {HarnessLoader} from '@angular/cdk/testing';
import {TestbedHarnessEnvironment} from '@angular/cdk/testing/testbed';
import {ComponentFixture, TestBed} from '@angular/core/testing';
import {MatExpansionPanelHarness} from '@angular/material/expansion/testing';
import {NoopAnimationsModule} from '@angular/platform-browser/animations';

import {Span} from '../../core/models/Trace';
import {TRACE_SERVICE} from '../../core/services/interfaces/trace';

import {MockTraceService} from './../../core/services/testing/mock-trace.service';
import {TraceTabComponent} from './trace-tab.component';

const MOCK_TRACE_DATA: Span[] = [
  {
    name: 'agent.act',
    start_time: 1733084700000000000,
    end_time: 1733084760000000000,
    span_id: 'span-1',
    trace_id: 'trace-1',
    attributes: {
      'event_id': 1,
      'gcp.vertex.agent.invocation_id': '21332-322222',
      'gcp.vertex.agent.llm_request':
          '{"contents":[{"role":"user","parts":[{"text":"Hello"}]},{"role":"agent","parts":[{"text":"Hi. What can I help you with?"}]},{"role":"user","parts":[{"text":"I need help with my project."}]}]}',
    },
  },
  {
    name: 'tool.invoke',
    start_time: 1733084705000000000,
    end_time: 1733084755000000000,
    span_id: 'span-2',
    parent_span_id: 'span-1',
    trace_id: 'trace-1',
    attributes: {
      'tool_name': 'project_helper',
    },
  },
];

describe('TraceTabComponent', () => {
  let component: TraceTabComponent;
  let fixture: ComponentFixture<TraceTabComponent>;
  let loader: HarnessLoader;

  beforeEach(async () => {
    await TestBed
        .configureTestingModule({
          imports: [TraceTabComponent, NoopAnimationsModule],
          providers: [
            {provide: TRACE_SERVICE, useClass: MockTraceService},
          ],
        })
        .compileComponents();

    fixture = TestBed.createComponent(TraceTabComponent);
    component = fixture.componentInstance;
    loader = TestbedHarnessEnvironment.loader(fixture);
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('should display no invocations if traceData is empty', async () => {
    const expansionPanels = await loader.getAllHarnesses(
        MatExpansionPanelHarness,
    );
    expect(expansionPanels.length).toBe(0);
  });

  describe('with trace data', () => {
    const MOCK_TRACE_DATA_WITH_MULTIPLE_TRACES: Span[] = [
      ...MOCK_TRACE_DATA,
      {
        name: 'agent.act-2',
        start_time: 1733084700000000000,
        end_time: 1733084760000000000,
        span_id: 'span-10',
        trace_id: 'trace-2',
        attributes: {
          'event_id': 10,
          'gcp.vertex.agent.invocation_id': 'invoc-2',
          'gcp.vertex.agent.llm_request':
              '{"contents":[{"role":"user","parts":[{"text":"Another user message"}]}]}',
        },
      },
    ];

    beforeEach(async () => {
      fixture.componentRef.setInput(
          'traceData',
          MOCK_TRACE_DATA_WITH_MULTIPLE_TRACES,
      );
      fixture.detectChanges();
      await fixture.whenStable();
    });

    it('should group traces by trace_id and display as expansion panels',
       async () => {
         const expansionPanels = await loader.getAllHarnesses(
             MatExpansionPanelHarness,
         );
         expect(expansionPanels.length).toBe(2);
       });

    it('should display user message as panel title', async () => {
      const expansionPanels = await loader.getAllHarnesses(
          MatExpansionPanelHarness,
      );
      expect(await expansionPanels[0].getTitle())
          .toBe(
              'I need help with my project.',
          );
      expect(await expansionPanels[1].getTitle()).toBe('Another user message');
    });

    it('should pass correct data to trace-tree component', async () => {
      spyOn(component, 'findInvocIdFromTraceId').and.callThrough();
      const expansionPanels = await loader.getAllHarnesses(
          MatExpansionPanelHarness,
      );
      await expansionPanels[0].expand();
      fixture.detectChanges();

      expect(component.findInvocIdFromTraceId).toHaveBeenCalledWith('trace-1');
      const traceTree = fixture.nativeElement.querySelector('app-trace-tree');
      expect(traceTree).toBeTruthy();
      // Further inspection of trace-tree inputs would require a harness or
      // mocking TraceTreeComponent
    });
  });
});
