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


import {A2uiRendererService} from '@a2ui/angular/v0_9';
import {SimpleChanges} from '@angular/core';
import {ComponentFixture, TestBed} from '@angular/core/testing';
// 1p-ONLY-IMPORTS: import {beforeEach, describe, expect, it}

import {initTestBed} from '../../testing/utils';

import {A2uiCanvasV09Component} from './a2ui-canvas-v09.component';

/** A v0.9 message batch that builds one surface. */
const CREATE_SURFACE = {
  version: 'v0.9',
  createSurface: {
    surfaceId: 'dash',
    catalogId: 'https://a2ui.org/specification/v0_9/basic_catalog.json'
  }
};
const UPDATE_COMPONENTS = {
  version: 'v0.9',
  updateComponents: {surfaceId: 'dash', components: []}
};

describe('A2uiCanvasV09Component', () => {
  let component: A2uiCanvasV09Component;
  let fixture: ComponentFixture<A2uiCanvasV09Component>;
  let mockRenderer: jasmine.SpyObj<A2uiRendererService>;
  let surfaces: Map<string, unknown>;

  /** Builds the SimpleChanges record Angular would pass for `messages`. */
  const changeRecord = (currentValue: unknown): SimpleChanges => ({
    messages: {
      currentValue,
      previousValue: null,
      firstChange: true,
      isFirstChange: () => true
    }
  });

  beforeEach(async () => {
    initTestBed();
    surfaces = new Map<string, unknown>();
    // `surfaceGroup` is a getter, so it has to be spied as a property rather
    // than listed among the methods.
    mockRenderer = jasmine.createSpyObj<A2uiRendererService>(
        'A2uiRendererService', ['processMessages'], {
          surfaceGroup: {
            getSurface: (id: string) => surfaces.get(id),
          } as any,
        });

    await TestBed
        .configureTestingModule({
          imports: [A2uiCanvasV09Component],
          providers: [
            {provide: A2uiRendererService, useValue: mockRenderer},
          ],
        })
        .compileComponents();

    fixture = TestBed.createComponent(A2uiCanvasV09Component);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('should process each message and derive the surfaceId', () => {
    const consoleError = spyOn(console, 'error');
    const messages = [CREATE_SURFACE, UPDATE_COMPONENTS];
    component.messages = messages;

    component.ngOnChanges(changeRecord(messages));

    // One call per message, not one batched call: a throw mid-batch would
    // abandon every message after it.
    expect(mockRenderer.processMessages).toHaveBeenCalledTimes(2);
    expect(mockRenderer.processMessages)
        .toHaveBeenCalledWith([CREATE_SURFACE] as any);
    expect(mockRenderer.processMessages)
        .toHaveBeenCalledWith([UPDATE_COMPONENTS] as any);
    expect(component.surfaceId()).toBe('dash');
    expect(consoleError).not.toHaveBeenCalled();
  });

  it('should derive the surfaceId from updateComponents alone', () => {
    // The streaming case: createSurface arrived in an earlier event, so this
    // bubble sees only updates.
    const messages = [UPDATE_COMPONENTS];
    component.messages = messages;

    component.ngOnChanges(changeRecord(messages));

    expect(component.surfaceId()).toBe('dash');
  });

  it('should do nothing without a messages change record', () => {
    component.messages = [CREATE_SURFACE];

    component.ngOnChanges({});

    expect(mockRenderer.processMessages).not.toHaveBeenCalled();
    expect(component.surfaceId()).toBeNull();
  });

  it('should not reprocess the same array instance twice', () => {
    const messages = [CREATE_SURFACE];
    component.messages = messages;

    component.ngOnChanges(changeRecord(messages));
    component.ngOnChanges(changeRecord(messages));

    expect(mockRenderer.processMessages).toHaveBeenCalledTimes(1);
  });

  it('should do nothing for an empty or null batch', () => {
    component.messages = [];
    component.ngOnChanges(changeRecord([]));
    component.messages = null;
    component.ngOnChanges(changeRecord(null));

    expect(mockRenderer.processMessages).not.toHaveBeenCalled();
    expect(component.surfaceId()).toBeNull();
  });

  it('should skip a createSurface for a surface that already exists', () => {
    // v0.9's processor throws "Surface dash already exists" here. Skipping the
    // create lets the idempotent updates land on the existing surface, which is
    // what makes a history reload work.
    surfaces.set('dash', {});
    const messages = [CREATE_SURFACE, UPDATE_COMPONENTS];
    component.messages = messages;

    component.ngOnChanges(changeRecord(messages));

    expect(mockRenderer.processMessages).toHaveBeenCalledTimes(1);
    expect(mockRenderer.processMessages)
        .toHaveBeenCalledWith([UPDATE_COMPONENTS] as any);
    expect(component.surfaceId()).toBe('dash');
  });

  it('should contain a failed message and still process the rest', () => {
    const consoleError = spyOn(console, 'error');
    mockRenderer.processMessages.and.callFake((batch: any) => {
      if (batch[0] === CREATE_SURFACE) throw new Error('catalog not found');
    });
    const messages = [CREATE_SURFACE, UPDATE_COMPONENTS];
    component.messages = messages;

    expect(() => component.ngOnChanges(changeRecord(messages))).not.toThrow();

    expect(mockRenderer.processMessages).toHaveBeenCalledTimes(2);
    expect(consoleError).toHaveBeenCalled();
  });

  it('should not mount the surface before its messages are processed', () => {
    // `ComponentHostComponent` looks its surface up once in ngOnInit and, on a
    // miss, warns and never retries -- so the @if gate on surfaceId is
    // load-bearing, not cosmetic.
    expect(fixture.nativeElement.querySelector('a2ui-v09-surface')).toBeNull();

    const messages = [CREATE_SURFACE];
    component.messages = messages;
    component.ngOnChanges(changeRecord(messages));
    fixture.detectChanges();

    expect(fixture.nativeElement.querySelector('a2ui-v09-surface'))
        .not.toBeNull();
  });
});
