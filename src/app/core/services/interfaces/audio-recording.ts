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

import {InjectionToken} from '@angular/core';

export const AUDIO_RECORDING_SERVICE =
    new InjectionToken<AudioRecordingService>('AudioRecordingService');
export const AUDIO_WORKLET_MODULE_PATH =
    new InjectionToken<string>('AudioWorkletModulePath');

/**
 * Service to provide methods to handle audio recording.
 */
export declare abstract class AudioRecordingService {
  abstract startRecording(): Promise<void>;
  abstract stopRecording(): void;
  abstract getCombinedAudioBuffer(): Uint8Array|void;
  abstract cleanAudioBuffer(): void;
}
