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

import {Pipe, PipeTransform} from '@angular/core';
import {Span} from '../../core/models/Trace';

@Pipe({
  name: 'invocId',
  standalone: true,
})
export class InvocIdPipe implements PipeTransform {
  transform(spans: Span[] | undefined | null): string | undefined {
    if (!spans) {
      return undefined;
    }
    return spans.find(
      (item) =>
        item.attributes !== undefined &&
        'gcp.vertex.agent.invocation_id' in item.attributes,
    )?.attributes['gcp.vertex.agent.invocation_id'];
  }
}
