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

import {ElementRef, InjectionToken} from '@angular/core';

export const VIDEO_SERVICE = new InjectionToken<VideoService>('VideoService');

/**
 * Service to provide methods to handle video.
 */
export declare abstract class VideoService {
  abstract createVideoElement(container: ElementRef): void;
  abstract startRecording(container: ElementRef): Promise<void>;
  abstract getCapturedFrame(): Promise<Uint8Array | void>;
  abstract stopRecording(container: ElementRef): void;
}
