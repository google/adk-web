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

import {MessageProcessor, Surface} from '@a2ui/angular';
import * as Types from '@a2ui/web_core/types/types';
import {CommonModule} from '@angular/common';
import {ChangeDetectionStrategy, Component, computed, inject, Input, OnChanges, signal, SimpleChanges,} from '@angular/core';

/**
 * Component responsible for rendering A2UI content on a canvas.
 */
@Component({
  selector: 'app-a2ui-canvas',
  template: `
    @if (surface()) {
      <a2ui-surface [surfaceId]="surfaceId()!" [surface]="surface()!" />
    }
  `,
  styleUrls: ['./a2ui-canvas.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [CommonModule, Surface],
})
export class A2uiCanvasComponent implements OnChanges {
  private readonly processor = inject(MessageProcessor);

  @Input() beginRendering: Types.ServerToClientMessage | null = null;
  @Input() surfaceUpdate: Types.ServerToClientMessage | null = null;
  @Input() dataModelUpdate: Types.ServerToClientMessage | null = null;

  readonly surfaceId = signal<string | null>(null);

  readonly activeSurface = signal<Types.Surface | null>(null);
  readonly surface = computed(() => this.activeSurface());

  constructor() {}

  ngOnChanges(changes: SimpleChanges): void {
    const messages: Types.ServerToClientMessage[] = [];
    let detectedSurfaceId: string | null = null;

    if (changes['beginRendering'] && this.beginRendering && Object.keys(this.beginRendering).length > 0) {
      messages.push(this.beginRendering);
      detectedSurfaceId = this.beginRendering?.beginRendering?.surfaceId ?? detectedSurfaceId;
    }
    if (changes['surfaceUpdate'] && this.surfaceUpdate && Object.keys(this.surfaceUpdate).length > 0) {
      messages.push(this.surfaceUpdate);
      detectedSurfaceId = this.surfaceUpdate?.surfaceUpdate?.surfaceId ?? detectedSurfaceId;
    }
    if (changes['dataModelUpdate'] && this.dataModelUpdate && Object.keys(this.dataModelUpdate).length > 0) {
      messages.push(this.dataModelUpdate);
      detectedSurfaceId = this.dataModelUpdate?.dataModelUpdate?.surfaceId ?? detectedSurfaceId;
    }

    if (messages.length > 0) {
      this.processor.processMessages(messages);
    }

    if (detectedSurfaceId) {
      this.surfaceId.set(detectedSurfaceId);
    }

    // Refresh active surface from processor state
    const currentId = this.surfaceId();
    if (currentId) {
      const surfaces = this.processor.getSurfaces();
      if (surfaces.has(currentId)) {
        this.activeSurface.set(surfaces.get(currentId)!);
      }
    }
  }
}
