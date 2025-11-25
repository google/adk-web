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
import {MatButtonToggleHarness} from '@angular/material/button-toggle/testing';
import {MatDialog} from '@angular/material/dialog';
import {MatListHarness} from '@angular/material/list/testing';
import {NoopAnimationsModule} from '@angular/platform-browser/animations';

import {Span} from '../../core/models/Trace';
import {FEATURE_FLAG_SERVICE} from '../../core/services/interfaces/feature-flag';
import {MockFeatureFlagService} from '../../core/services/testing/mock-feature-flag.service';

import {EventTabComponent} from './event-tab.component';
import {TraceChartComponent} from './trace-chart/trace-chart.component';

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
    children: [
      {
        name: 'sub-tool-1.invoke',
        start_time: 1733084710000000000,
        end_time: 1733084750000000000,
        span_id: 'span-3',
        parent_span_id: 'span-2',
        trace_id: 'trace-1',
        attributes: {
          'sub_tool_name': 'sub_project_helper_1',
        },
        children: [
          {
            name: 'sub-tool-2.invoke',
            start_time: 1733084715000000000,
            end_time: 1733084745000000000,
            span_id: 'span-4',
            parent_span_id: 'span-3',
            trace_id: 'trace-1',
            attributes: {
              'sub_tool_name': 'sub_project_helper_2',
            },
            children: [
              {
                name: 'sub-tool-3.invoke',
                start_time: 1733084720000000000,
                end_time: 1733084740000000000,
                span_id: 'span-5',
                parent_span_id: 'span-4',
                trace_id: 'trace-1',
                attributes: {
                  'sub_tool_name': 'sub_project_helper_3',
                },
                children: [],
              },
            ],
          },
        ],
      },
    ],
  }
] as Span[];

const MOCK_EVENTS_MAP = new Map<string, any>([
  ['event1', {title: 'Event 1 Title'}],
  ['event2', {title: 'Event 2 Title'}],
]);

describe('EventTabComponent', () => {
  let component: EventTabComponent;
  let fixture: ComponentFixture<EventTabComponent>;
  let featureFlagService: MockFeatureFlagService;
  let loader: HarnessLoader;
  let matDialogSpy: jasmine.SpyObj<MatDialog>;
  const mockDialogRef = {
    close: jasmine.createSpy('close'),
  };

  beforeEach(async () => {
    featureFlagService = new MockFeatureFlagService();
    matDialogSpy = jasmine.createSpyObj('MatDialog', ['open']);

    featureFlagService.isTraceEnabledResponse.next(true);

    await TestBed
        .configureTestingModule({
          imports: [EventTabComponent, NoopAnimationsModule],
          providers: [
            {provide: MatDialog, useValue: matDialogSpy},
            {provide: FEATURE_FLAG_SERVICE, useValue: featureFlagService},
          ],
        })
        .compileComponents();

    fixture = TestBed.createComponent(EventTabComponent);
    component = fixture.componentInstance;
    loader = TestbedHarnessEnvironment.loader(fixture);
    matDialogSpy.open.calls.reset();
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('should display "No conversations" if eventsMap is empty', () => {
    expect(fixture.nativeElement.textContent).toContain('No conversations');
  });

  describe('with events', () => {
    beforeEach(async () => {
      fixture.componentRef.setInput('eventsMap', MOCK_EVENTS_MAP);
      fixture.detectChanges();
      await fixture.whenStable();
    });

    it('should display events list by default', async () => {
      const list = await loader.getHarness(MatListHarness);
      const items = await list.getItems();
      expect(items.length).toBe(2);
      expect(await items[0].getFullText()).toContain('Event 1 Title');
      expect(await items[1].getFullText()).toContain('Event 2 Title');
    });

    it('should emit selectedEvent on event click', async () => {
      spyOn(component.selectedEvent, 'emit');
      const list = await loader.getHarness(MatListHarness);
      const items = await list.getItems();
      await (await items[0].host()).click();
      expect(component.selectedEvent.emit).toHaveBeenCalledWith('event1');
    });

    it('should not show toggle if traceData is empty', async () => {
      const hasToggleGroup = fixture.nativeElement.querySelector(
          'mat-button-toggle-group',
      );
      expect(hasToggleGroup).toBeNull();
    });
  });

  describe('with trace data', () => {
    beforeEach(async () => {
      fixture.componentRef.setInput('eventsMap', MOCK_EVENTS_MAP);
      fixture.componentRef.setInput('traceData', MOCK_TRACE_DATA);
      fixture.detectChanges();
      await fixture.whenStable();
    });

    it('should show toggle buttons', async () => {
      const toggles = await loader.getAllHarnesses(MatButtonToggleHarness);
      expect(toggles.length).toBe(2);
      expect(await toggles[0].getText()).toBe('Events');
      expect(await toggles[1].getText()).toBe('Trace');
    });

    it('should switch to trace view and display traces', async () => {
      const traceToggle = await loader.getHarness(
          MatButtonToggleHarness.with({text: 'Trace'}),
      );
      await traceToggle.check();
      fixture.detectChanges();

      const list = await loader.getHarness(MatListHarness);
      const items = await list.getItems();
      expect(items.length).toBe(1);
      expect(await items[0].getFullText()).toContain('Invocation 21332-322222');
    });

    it('should open dialog when trace item is clicked', async () => {
      const traceToggle = await loader.getHarness(
          MatButtonToggleHarness.with({text: 'Trace'}),
      );
      await traceToggle.check();
      fixture.detectChanges();

      const list = await loader.getHarness(MatListHarness);
      const items = await list.getItems();
      await (await items[0].host()).click();

      expect(matDialogSpy.open).toHaveBeenCalledWith(TraceChartComponent, {
        width: 'auto',
        maxWidth: '90vw',
        data: {
          spans: component.spansByTraceId().get('trace-1'),
          invocId: '21332-322222',
        },
      });
    });

    it('should display multiple traces if present', async () => {
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
            'gcp.vertex.agent.llm_request': '{}',
          },
        },
      ];
      fixture.componentRef.setInput(
          'traceData',
          MOCK_TRACE_DATA_WITH_MULTIPLE_TRACES,
      );
      fixture.detectChanges();
      await fixture.whenStable();

      const traceToggle = await loader.getHarness(
          MatButtonToggleHarness.with({text: 'Trace'}),
      );
      await traceToggle.check();
      fixture.detectChanges();

      const list = await loader.getHarness(MatListHarness);
      const items = await list.getItems();
      expect(items.length).toBe(2);
      expect(await items[0].getFullText()).toContain('Invocation 21332-322222');
      expect(await items[1].getFullText()).toContain('Invocation invoc-2');
    });
  });
});

describe('EventTabComponent feature disabling', () => {
  let component: EventTabComponent;
  let fixture: ComponentFixture<EventTabComponent>;
  let featureFlagService: MockFeatureFlagService;
  let matDialogSpy: jasmine.SpyObj<MatDialog>;
  const mockDialogRef = {
    close: jasmine.createSpy('close'),
  };

  beforeEach(async () => {
    featureFlagService = new MockFeatureFlagService();
    matDialogSpy = jasmine.createSpyObj('MatDialog', ['open']);

    featureFlagService.isTraceEnabledResponse.next(false);

    await TestBed
        .configureTestingModule({
          imports: [EventTabComponent, NoopAnimationsModule],
          providers: [
            {provide: MatDialog, useValue: matDialogSpy},
            {provide: FEATURE_FLAG_SERVICE, useValue: featureFlagService},
          ],
        })
        .compileComponents();

    fixture = TestBed.createComponent(EventTabComponent);
    component = fixture.componentInstance;
    fixture.componentRef.setInput('traceData', [
      {
        trace_id: '1',
        span_id: '1',
        start_time: 1,
        end_time: 2,
        name: 'test',
      },
    ]);
    fixture.detectChanges();
  });

  it('should hide the Trace mat-button-toggle', () => {
    const traceToggle = fixture.nativeElement.querySelector(
        'mat-button-toggle[value="trace"]',
    );
    expect(traceToggle).toBeNull();
  });
});

describe('EventTabComponent feature disabling', () => {
  let component: EventTabComponent;
  let fixture: ComponentFixture<EventTabComponent>;
  let featureFlagService: MockFeatureFlagService;
  let matDialogSpy: jasmine.SpyObj<MatDialog>;
  const mockDialogRef = {
    close: jasmine.createSpy('close'),
  };

  beforeEach(async () => {
    featureFlagService = new MockFeatureFlagService();
    matDialogSpy = jasmine.createSpyObj('MatDialog', ['open']);

    featureFlagService.isTraceEnabledResponse.next(false);

    await TestBed
        .configureTestingModule({
          imports: [EventTabComponent, NoopAnimationsModule],
          providers: [
            {provide: MatDialog, useValue: matDialogSpy},
            {provide: FEATURE_FLAG_SERVICE, useValue: featureFlagService},
          ],
        })
        .compileComponents();

    fixture = TestBed.createComponent(EventTabComponent);
    component = fixture.componentInstance;
    fixture.componentRef.setInput('traceData', [
      {
        trace_id: '1',
        span_id: '1',
        start_time: 1,
        end_time: 2,
        name: 'test',
      },
    ]);
    fixture.detectChanges();
  });

  it('should hide the Trace mat-button-toggle', () => {
    const traceToggle = fixture.nativeElement.querySelector(
      'mat-button-toggle[value="trace"]',
    );
    expect(traceToggle).toBeNull();
  });
});
