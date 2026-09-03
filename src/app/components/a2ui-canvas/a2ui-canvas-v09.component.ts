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

import {A2uiRendererService, SurfaceComponent} from '@a2ui/angular/v0_9';
import {ChangeDetectionStrategy, Component, inject, Input, OnChanges, signal, SimpleChanges,} from '@angular/core';

/** The message type the v0.9 renderer accepts. */
type A2uiV09Message =
    Parameters<A2uiRendererService['processMessages']>[0][number];

/**
 * Renders an A2UI spec v0.9 surface.
 *
 * A sibling of `A2uiCanvasComponent` rather than a branch inside it: the two
 * renderers have different lifecycles. v0.8's `<a2ui-surface>` needs a resolved
 * surface object re-read from a map on every change, while v0.9's
 * `<a2ui-v09-surface>` takes only a surfaceId and resolves internally.
 */
@Component({
  selector: 'app-a2ui-canvas-v09',
  template: `
    @if (surfaceId()) {
      <a2ui-v09-surface [surfaceId]="surfaceId()!" />
    }
  `,
  styleUrls: ['./a2ui-canvas-v09.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [SurfaceComponent],
})
export class A2uiCanvasV09Component implements OnChanges {
  private readonly renderer = inject(A2uiRendererService);

  /** The de-enveloped v0.9 messages for this bubble, in send order. */
  @Input() messages: readonly unknown[]|null = null;

  readonly surfaceId = signal<string|null>(null);

  /**
   * The last array instance processed. The renderer service is root-scoped, so
   * re-processing the same batch would duplicate work and log spurious
   * "surface already exists" failures on every change-detection pass.
   */
  private lastProcessed: readonly unknown[]|null = null;

  ngOnChanges(changes: SimpleChanges): void {
    if (!changes['messages']) return;

    const messages = this.messages;
    if (!messages || messages.length === 0) return;
    if (messages === this.lastProcessed) return;
    this.lastProcessed = messages;

    for (const message of messages) {
      this.processMessage(message);
    }

    // Derive the surfaceId only after processing, so the template's @if gate
    // cannot mount the child before its surface exists. `ComponentHostComponent`
    // looks the surface up once in ngOnInit and, on a miss, warns and never
    // retries -- unlike a missing component, which recovers via onCreated.
    const surfaceId = this.surfaceIdOf(messages);
    if (surfaceId) {
      this.surfaceId.set(surfaceId);
    }
  }

  /**
   * Processes one message in isolation.
   *
   * Per-message rather than one batched `processMessages` call because v0.9's
   * processor throws on a duplicate `createSurface`, an unknown catalogId, and
   * an update naming an absent surface -- and a throw mid-batch would abandon
   * every remaining message, leaving a half-built surface.
   */
  private processMessage(message: unknown): void {
    if (this.isRedundantCreateSurface(message)) return;

    try {
      this.renderer.processMessages([message as A2uiV09Message]);
    } catch (e: unknown) {
      console.error('Failed to process an A2UI v0.9 message:', e, message);
    }
  }

  /**
   * True when this `createSurface` names a surface that already exists.
   *
   * The renderer service is root-scoped and its surfaces outlive any one
   * bubble, so re-creating one -- on a history reload, or when a bubble
   * re-processes its batch -- would throw "Surface <id> already exists". Since
   * the subsequent update messages are idempotent upserts against the existing
   * surface, skipping the create is the correct recovery: the already-mounted
   * child keeps a valid surface reference and simply receives the new
   * components.
   */
  private isRedundantCreateSurface(message: unknown): boolean {
    if (!message || typeof message !== 'object') return false;
    const create = (message as Record<string, unknown>)['createSurface'];
    if (!create || typeof create !== 'object') return false;

    const surfaceId = (create as Record<string, unknown>)['surfaceId'];
    if (typeof surfaceId !== 'string') return false;

    return this.renderer.surfaceGroup?.getSurface(surfaceId) !== undefined;
  }

  /** The first surfaceId named by any message in the batch. */
  private surfaceIdOf(messages: readonly unknown[]): string|null {
    for (const message of messages) {
      if (!message || typeof message !== 'object') continue;
      for (const body of Object.values(message as Record<string, unknown>)) {
        if (body && typeof body === 'object') {
          const surfaceId = (body as Record<string, unknown>)['surfaceId'];
          if (typeof surfaceId === 'string') return surfaceId;
        }
      }
    }
    return null;
  }
}
