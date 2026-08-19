/**
 * @license
 * Copyright 2026 Google LLC
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

import {AsyncPipe, DatePipe, DecimalPipe, KeyValuePipe} from '@angular/common';
import {ChangeDetectionStrategy, Component, computed, effect, inject, input, output, ViewChild, ElementRef} from '@angular/core';
import {toSignal} from '@angular/core/rxjs-interop';
import {MatIconButton, MatButtonModule} from '@angular/material/button';
import {MatIcon} from '@angular/material/icon';
import {MatPaginator, PageEvent} from '@angular/material/paginator';
import {MatProgressSpinner} from '@angular/material/progress-spinner';
import {MatTooltip} from '@angular/material/tooltip';
import {MatMenuModule, MatMenuTrigger} from '@angular/material/menu';
import {type SafeHtml} from '@angular/platform-browser';
import {CustomJsonViewerComponent} from '../custom-json-viewer/custom-json-viewer.component';
import {InfoTable} from '../info-table/info-table';

import {Event, Part} from '../../core/models/types';
import {UI_STATE_SERVICE} from '../../core/services/interfaces/ui-state';
import {SidePanelMessagesInjectionToken} from '../side-panel/side-panel.component.i18n';
import {Span} from '../../core/models/Trace';
import {TRACE_SERVICE} from '../../core/services/interfaces/trace';
import {addSvgNodeHoverEffects} from '../../utils/svg-interaction.utils';
export type SpanNode = Span & {
  children: SpanNode[];
  depth: number;
  duration: number;
  id: string;  // Using span_id as string ID
};

@Component({
  changeDetection: ChangeDetectionStrategy.OnPush,
  selector: 'app-event-tab',
  templateUrl: './event-tab.component.html',
  styleUrls: ['./event-tab.component.scss'],
  standalone: true,
  imports: [
    AsyncPipe,
    DatePipe,
    DecimalPipe,
    MatButtonModule,
    MatIconButton,
    MatIcon,
    MatPaginator,
    MatProgressSpinner,
    MatTooltip,
    MatMenuModule,
    CustomJsonViewerComponent,
    InfoTable,
  ],
})
export class EventTabComponent {
  readonly eventDataSize = input.required<number>();
  readonly eventDataMap = input<Map<string, any>>(new Map());
  readonly selectedEventIndex = input<number | undefined>();
  readonly selectedEvent = input.required<Event | undefined>();
  readonly filteredSelectedEvent = input<any>();
  readonly renderedEventGraph = input<SafeHtml | undefined>();
  readonly rawSvgString = input<string | null>(null);
  readonly llmRequest = input<any>();
  readonly llmResponse = input<any>();
  readonly traceData = input<Span[]>([]);
  readonly appName = input<string>('');
  readonly selectedEventGraphPath = input<string>('');
  readonly hasSubWorkflows = input<boolean>(false);
  readonly graphsAvailable = input<boolean>(true);
  readonly invocationDisplayMap = input<Map<string, string>>(new Map());
  readonly forceGraphTab = input(false);
  readonly isViewOnlySession = input(false);
  readonly isViewOnlyAppNameMismatch = input(false);

  readonly invocationDisplayEntries = computed(() => {
    return Array.from(this.invocationDisplayMap().entries()).map(([key, value]) => ({key, value}));
  });

  readonly breadcrumbs = computed(() => {
    const path = this.selectedEventGraphPath();
    if (!path) return [];
    return path.split('/').filter(s => s);
  });

  readonly functionCalls = computed(() => {
    const parts = this.selectedEvent()?.content?.parts || [];
    return parts.filter(p => !!p.functionCall).map(p => p.functionCall);
  });

  readonly functionResponses = computed(() => {
    const parts = this.selectedEvent()?.content?.parts || [];
    return parts.filter(p => !!p.functionResponse).map(p => p.functionResponse);
  });

  readonly processedFunctionResponses = computed(() => {
    const responses = this.functionResponses();
    return responses.map(fr => {
      if (!fr) return null;
      if (fr && Array.isArray((fr as any)['parts'])) {
        const parts = (fr as any)['parts'] as Part[];
        const mediaParts = parts.filter(p => !!p.inlineData).map(p => {
          if (p.inlineData && p.inlineData.data) {
            return {
              ...p,
              inlineData: {
                ...p.inlineData,
                data: p.inlineData.data.replace(/-/g, '+').replace(/_/g, '/')
              }
            };
          }
          return p;
        });
        const cleanedFr = { ...fr };
        delete (cleanedFr as any)['parts'];
        return {
          name: fr.name,
          cleanedFr,
          mediaParts,
          hasMedia: mediaParts.length > 0
        };
      }
      return {
        name: fr.name,
        cleanedFr: fr,
        mediaParts: [],
        hasMedia: false
      };
    }).filter((r): r is any => r !== null);
  });

  readonly page = output<PageEvent>();
  readonly closeSelectedEvent = output<void>();
  readonly openImageDialog = output<string | null>();
  readonly switchToTraceView = output<void>();
  readonly showAgentStructureGraph = output<boolean>();
  readonly drillDownNodePath = output<string>();
  readonly selectEventById = output<string>();
  readonly jumpToInvocation = output<string>();

  onInvocationSelected(invocationId: string) {
    this.jumpToInvocation.emit(invocationId);
  }

  @ViewChild('eventMenuTrigger') eventMenuTrigger!: MatMenuTrigger;
  @ViewChild('graphContainer') graphContainer!: ElementRef;

  menuEvents: any[] = [];
  menuPos = { x: 0, y: 0 };

  protected readonly uiStateService = inject(UI_STATE_SERVICE);
  protected readonly traceService = inject(TRACE_SERVICE);
  readonly i18n = inject(SidePanelMessagesInjectionToken);

  readonly isEventRequestResponseLoadingSignal = toSignal(
      this.uiStateService.isEventRequestResponseLoading(), {initialValue: false});

  readonly associatedSpans = computed(() => {
    const ev = this.selectedEvent();
    if (!ev || !ev.id) return [];

    const allSpans = this.traceData();
    if (!allSpans) return [];

    const flatten = (arr: any[]): any[] => {
      let result: any[] = [];
      for (const item of arr) {
        result.push(item);
        if (item.children) {
          result = result.concat(flatten(item.children));
        }
      }
      return result;
    };

    const flatSpans = flatten(allSpans);
    return flatSpans.filter(s => s.attrEventId === ev.id);
  });

  readonly sessionUsageMetadata = computed(() => {
    const allEvents = Array.from(this.eventDataMap().values());
    let totalPromptTokens = 0;
    let totalCandidatesTokens = 0;
    let totalCachedContentTokens = 0;
    let totalThoughtsTokens = 0;
    let totalTokens = 0;

    allEvents.forEach(ev => {
      const metadata = ev.usageMetadata;
      if (metadata) {
        const prompt = metadata.promptTokenCount ?? metadata.promptTokens ?? 0;
        const candidates = metadata.candidatesTokenCount ?? metadata.candidatesTokens ?? 0;
        const cachedContent = metadata.cachedContentTokenCount ?? metadata.cachedContentTokens ?? 0;
        const thoughts = metadata.thoughtsTokenCount ?? metadata.thoughtsTokens ?? 0;
        const total = metadata.totalTokenCount ?? metadata.totalTokens ?? 0;

        totalPromptTokens += Number(prompt);
        totalCandidatesTokens += Number(candidates);
        totalCachedContentTokens += Number(cachedContent);
        totalThoughtsTokens += Number(thoughts);
        totalTokens += Number(total);
      }
    });

    return {
      'Prompt Tokens': totalPromptTokens,
      'Candidates Tokens': totalCandidatesTokens,
      'Cached Content Tokens': totalCachedContentTokens,
      'Thoughts Tokens': totalThoughtsTokens,
      'Total Tokens': totalTokens
    };
  });

  private _selectedDetailTab: 'event' | 'raw' | 'request' | 'response' | 'graph' | 'metadata' | 'state' = 'event';

  get selectedDetailTab() {
    return this._selectedDetailTab;
  }

  set selectedDetailTab(tab: 'event' | 'raw' | 'request' | 'response' | 'graph' | 'metadata' | 'state') {
    this._selectedDetailTab = tab;
    window.localStorage.setItem('adk-event-tab-selected-tab', tab);
    if (tab === 'graph') {
      setTimeout(() => {
        if (this.graphContainer?.nativeElement) {
          addSvgNodeHoverEffects(this.graphContainer.nativeElement, (nodeName: string, mouseEvent?: MouseEvent) => {
            this.handleNodeClick(nodeName, mouseEvent);
          });
        }
      }, 50);
    }
  }

  copiedId: string | null = null;

  copyToClipboard(value: string | undefined | null, key?: string) {
    if (!value) return;
    navigator.clipboard.writeText(value).then(() => {
      this.copiedId = key || value;
      setTimeout(() => this.copiedId = null, 2000);
    });
  }

  copyJsonToClipboard(json: any, key: string) {
    if (!json) return;
    const value = JSON.stringify(json, null, 2);
    navigator.clipboard.writeText(value).then(() => {
      this.copiedId = key;
      setTimeout(() => this.copiedId = null, 2000);
    });
  }

  switchToSpan(span: any) {
    this.switchToTraceView.emit();
    this.traceService.selectedRow(span);
  }

  readonly stateChanges = computed(() => {
    const ev = this.selectedEvent();
    if (!ev) return [];

    const allEvents = Array.from(this.eventDataMap().values());
    allEvents.sort((a, b) => (a.timestamp || 0) - (b.timestamp || 0));

    const state: Record<string, any> = {};
    const changes: Array<{ key: string; oldValue: any; newValue: any }> = [];

    for (const currentEvent of allEvents) {
      const delta = currentEvent.actions?.stateDelta;
      if (currentEvent.id === ev.id) {
        if (delta) {
          for (const key of Object.keys(delta)) {
            if (key === '__llm_request_key__') continue;
            changes.push({
              key,
              oldValue: state[key] !== undefined ? state[key] : 'N/A',
              newValue: delta[key],
            });
          }
        }
        break;
      }
      if (delta) {
        for (const key of Object.keys(delta)) {
          if (key !== '__llm_request_key__') {
            state[key] = delta[key];
          }
        }
      }
    }

    return changes;
  });

  constructor() {
    const savedTab = window.localStorage.getItem('adk-event-tab-selected-tab');
    if (savedTab && ['event', 'raw', 'request', 'response', 'graph', 'metadata', 'state'].includes(savedTab)) {
      this._selectedDetailTab = savedTab as 'event' | 'raw' | 'request' | 'response' | 'graph' | 'metadata' | 'state';
    }

    effect(() => {
      const svgTree = this.renderedEventGraph();
      const currentTab = this._selectedDetailTab;
      if (svgTree && currentTab === 'graph') {
        setTimeout(() => {
          if (this.graphContainer?.nativeElement) {
            addSvgNodeHoverEffects(this.graphContainer.nativeElement, (nodeName: string, mouseEvent?: MouseEvent) => {
              this.handleNodeClick(nodeName, mouseEvent);
            });
          }
        }, 50);
      }
    });

    let prevForceGraphTab = false;
    effect(() => {
      const force = this.forceGraphTab();
      const event = this.selectedEvent();

      if (force && !prevForceGraphTab) {
        this.selectedDetailTab = this.graphsAvailable() ? 'graph' : 'event';
      }
      prevForceGraphTab = force;
    });
  }

  formatTime(timestamp: number | undefined): string {
    if (!timestamp) return 'N/A';
    // If timestamp is before 2286-11-20 in seconds, treat as seconds.
    const inMs = timestamp < 10000000000 ? timestamp * 1000 : timestamp;
    return new Date(inMs).toLocaleString();
  }

  isNumber(value: any): boolean {
    return typeof value === 'number';
  }

  isNumericValue(key: string, value: any): boolean {
    if (typeof value === 'number') return true;
    const detailKeys = [
      'promptTokensDetails',
      'promptTokenDetails',
      'candidatesTokenDetails',
      'candidatesTokensDetails',
      'cacheTokensDetails',
    ];
    return detailKeys.includes(key);
  }

  isObject(value: any): boolean {
    return value !== null && typeof value === 'object';
  }

  handleNodeClick(nodeName: string, mouseEvent?: MouseEvent) {
    let allEvents = Array.from(this.eventDataMap().values());
    const selectedEv = this.selectedEvent();
    const targetInvocationId = selectedEv?.invocationId;

    if (targetInvocationId) {
      allEvents = allEvents.filter(ev => ev.invocationId === targetInvocationId);
    }

    const travelsForNode: any[][] = [];
    let currentTravel: any[] = [];
    let lastNodeName = '';

    allEvents.forEach(ev => {
      let np = ev.nodeInfo?.path;
      if (ev.author === 'user') {
        np = '__START__';
      }
      if (!np) return;

      let bareNp = np;
      if (np !== '__START__') {
        bareNp = np.split('/').map((s: string) => s.split('@')[0]).join('/');
      }

      const segments = bareNp.split('/');
      let evNodeName = segments[segments.length - 1];
      let evGraphPath = '';

      if (segments.length >= 2 && segments[segments.length - 1] === 'call_llm' && segments[segments.length - 2] === ev.author) {
        evNodeName = segments[segments.length - 2];
        evGraphPath = segments.slice(1, -2).join('/');
      } else {
        evGraphPath = segments.slice(1, -1).join('/');
      }

      if (evGraphPath === this.selectedEventGraphPath()) {
        const fullSegments = np.split('/');
        const fullEvNodeName = fullSegments[fullSegments.length - 1];
        const currentName = nodeName.includes('@') ? fullEvNodeName : evNodeName;

        if (currentName !== lastNodeName) {
           if (lastNodeName === nodeName && currentTravel.length > 0) {
             travelsForNode.push(currentTravel);
           }
           lastNodeName = currentName;
           currentTravel = [];
        }

        if (currentName === nodeName) {
           currentTravel.push(ev);
        }
      }
    });

    if (lastNodeName === nodeName && currentTravel.length > 0) {
       travelsForNode.push(currentTravel);
    }

    if (travelsForNode.length === 0) {
      return;
    } else if (travelsForNode.length === 1) {
      this.selectEventById.emit(travelsForNode[0][0].id);
    } else {
      this.menuEvents = travelsForNode.map((travel, index) => ({
        id: travel[0].id,
        runIndex: index + 1,
        timestamp: travel[0].timestamp
      }));
      if (mouseEvent) {
        this.menuPos = { x: mouseEvent.clientX, y: mouseEvent.clientY };
      }
      this.eventMenuTrigger.openMenu();
    }
  }

  handleMenuSelection(event: any) {
    this.selectEventById.emit(event.id);
  }

  protected readonly Object = Object;
}
