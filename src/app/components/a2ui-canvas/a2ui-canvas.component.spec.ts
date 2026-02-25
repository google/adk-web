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


import {MessageProcessor} from '@a2ui/angular';
import * as Types from '@a2ui/web_core/types/types';
import {SimpleChanges} from '@angular/core';
import {ComponentFixture, TestBed} from '@angular/core/testing';
// 1p-ONLY-IMPORTS: import {beforeEach, describe, expect, it}

import {initTestBed} from '../../testing/utils';

import {A2uiCanvasComponent} from './a2ui-canvas.component';

describe('A2uiCanvasComponent', () => {
  let component: A2uiCanvasComponent;
  let fixture: ComponentFixture<A2uiCanvasComponent>;
  let mockMessageProcessor: jasmine.SpyObj<MessageProcessor>;

  beforeEach(async () => {
    initTestBed();
    mockMessageProcessor = jasmine.createSpyObj<MessageProcessor>(
        'MessageProcessor', ['processMessages', 'getSurfaces']);
    mockMessageProcessor.getSurfaces.and.returnValue(new Map());

    await TestBed
        .configureTestingModule({
          imports: [A2uiCanvasComponent],
          providers: [
            {provide: MessageProcessor, useValue: mockMessageProcessor},
          ],
        })
        .compileComponents();

    fixture = TestBed.createComponent(A2uiCanvasComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('should process beginRendering message', () => {
    const message = {
      beginRendering: {
        surfaceId: 'sales_data_yearly_surface',
        root: 'root-column',
        styles: {primaryColor: '#00BFFF', font: 'Arial'}
      }
    } as unknown as Types.ServerToClientMessage;
    component.beginRendering = message;

    const changes: SimpleChanges = {
      beginRendering: {
        currentValue: message,
        previousValue: null,
        firstChange: true,
        isFirstChange: () => true
      }
    };
    component.ngOnChanges(changes);

    expect(mockMessageProcessor.processMessages).toHaveBeenCalledWith([message]);
    expect(component.surfaceId()).toBe('sales_data_yearly_surface');
  });

  it('should process surfaceUpdate message', () => {
    const message = {
      surfaceUpdate: {
        surfaceId: 'sales_data_yearly_surface',
        components: [
          {
            id: 'root-column',
            component: {
              Column: {
                children: {explicitList: ['chart-title', 'category-list']}
              }
            }
          },
          {
            id: 'chart-title',
            component: {
              Text: {text: {path: 'chart.title'}, usageHint: 'h2'}
            }
          },
          {
            id: 'category-list',
            component: {
              List: {
                direction: 'vertical',
                children: {
                  template: {
                    componentId: 'category-item-template',
                    dataBinding: '/chart.items'
                  }
                }
              }
            }
          },
          {
            id: 'category-item-template',
            component: {Card: {child: 'item-row'}}
          },
          {
            id: 'item-row',
            component: {
              Row: {
                distribution: 'spaceBetween',
                children: {explicitList: ['item-label', 'item-value']}
              }
            }
          },
          {
            id: 'item-label',
            component: {Text: {text: {path: 'label'}}}
          },
          {
            id: 'item-value',
            component: {Text: {text: {path: 'value'}}}
          }
        ]
      }
    } as unknown as Types.ServerToClientMessage;
    component.surfaceUpdate = message;

    const changes: SimpleChanges = {
      surfaceUpdate: {
        currentValue: message,
        previousValue: null,
        firstChange: true,
        isFirstChange: () => true
      }
    };
    component.ngOnChanges(changes);

    expect(mockMessageProcessor.processMessages).toHaveBeenCalledWith([message]);
    expect(component.surfaceId()).toBe('sales_data_yearly_surface');
  });

  it('should process dataModelUpdate message', () => {
    const message = {
      dataModelUpdate: {
        surfaceId: 'sales_data_yearly_surface',
        path: '/',
        contents: [
          {key: 'chart.title', valueString: 'Yearly Sales by Category'},
          {key: 'chart.items[0].label', valueString: 'Apparel'},
          {key: 'chart.items[0].value', valueNumber: 41},
          {key: 'chart.items[1].label', valueString: 'Home Goods'},
          {key: 'chart.items[1].value', valueNumber: 15},
          {key: 'chart.items[2].label', valueString: 'Electronics'},
          {key: 'chart.items[2].value', valueNumber: 28},
          {key: 'chart.items[3].label', valueString: 'Health & Beauty'},
          {key: 'chart.items[3].value', valueNumber: 10},
          {key: 'chart.items[4].label', valueString: 'Other'},
          {key: 'chart.items[4].value', valueNumber: 6}
        ]
      }
    } as unknown as Types.ServerToClientMessage;
    component.dataModelUpdate = message;

    const changes: SimpleChanges = {
      dataModelUpdate: {
        currentValue: message,
        previousValue: null,
        firstChange: true,
        isFirstChange: () => true
      }
    };
    component.ngOnChanges(changes);

    expect(mockMessageProcessor.processMessages).toHaveBeenCalledWith([message]);
    expect(component.surfaceId()).toBe('sales_data_yearly_surface');
  });

  it('should update activeSurface when surfaceId matches', () => {
    const surfaceId = 'sales_data_yearly_surface';
    const mockSurface = {} as Types.Surface;
    const surfaces = new Map<string, Types.Surface>([[surfaceId, mockSurface]]);
    mockMessageProcessor.getSurfaces.and.returnValue(surfaces);

    const message = {
      beginRendering: {surfaceId: surfaceId, root: 'root-column'}
    } as unknown as Types.ServerToClientMessage;

    component.beginRendering = message;
    component.ngOnChanges({
      beginRendering: {
        currentValue: message,
        previousValue: null,
        firstChange: true,
        isFirstChange: () => true
      }
    });

    expect(component.activeSurface()).toBe(mockSurface);
  });
});
