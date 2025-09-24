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

import {StringToColorServiceImpl} from './string-to-color.service';

describe('StringToColorService', () => {
  it(`should convert an arbitrary string into a color code like '#aabbcc'`, () => {
    const service = new StringToColorServiceImpl();
    expect(service.stc('test')).toMatch(/^#[0-9a-f]{6,8}$/i);
  });
});
