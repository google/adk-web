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

/** The A2UI specification versions this app can render. */
export type A2uiSpecVersion = 'v0.8'|'v0.9';

/**
 * Message kind keys defined by A2UI spec v0.8.
 *
 * Disjoint from `A2UI_V09_KINDS`, which is what makes version detection by
 * kind key unambiguous for payloads that omit the `version` discriminator.
 */
export const A2UI_V08_KINDS = [
  'beginRendering',
  'surfaceUpdate',
  'dataModelUpdate',
] as const;

/** Message kind keys defined by A2UI spec v0.9. */
export const A2UI_V09_KINDS = [
  'createSurface',
  'updateComponents',
  'updateDataModel',
  'deleteSurface',
] as const;

/**
 * A version-tagged batch of A2UI messages extracted from one event.
 *
 * `messages` is an ordered array rather than one slot per kind because v0.9
 * legitimately sends N `updateComponents` / `updateDataModel` messages, which a
 * fixed set of last-wins slots cannot represent.
 */
export interface A2uiPayload {
  readonly version: A2uiSpecVersion;
  /** De-enveloped messages, in send order. */
  readonly messages: readonly unknown[];
  /** The first surfaceId named by any message in the batch, if any. */
  readonly surfaceId?: string;
  /**
   * v0.8-only aliases, populated only when `version === 'v0.8'`. Retained so
   * the existing v0.8 render bindings stay unchanged.
   */
  readonly beginRendering?: unknown;
  readonly surfaceUpdate?: unknown;
  readonly dataModelUpdate?: unknown;
}
