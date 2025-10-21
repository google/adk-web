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

import {Injectable} from '@angular/core';
import {AudioPlayingService as AudioPlayingServiceInterface} from './interfaces/audio-playing';

@Injectable({
  providedIn: 'root',
})
export class AudioPlayingService implements AudioPlayingServiceInterface {
  private audioContext = new AudioContext({sampleRate: 22000});
  private lastAudioTime = 0;

  playAudio(buffer: Uint8Array[]) {
    const pcmBytes = this.combineAudioBuffer(buffer);
    if (!pcmBytes) return;

    this.playPCM(pcmBytes);
  }

  private combineAudioBuffer(buffer: Uint8Array[]) {
    if (buffer.length === 0) return undefined;

    // Merge received chunks into a single buffer
    const totalLength = buffer.reduce(
        (sum, chunk) => sum + chunk.length,
        0,
    );
    const combinedBuffer = new Uint8Array(totalLength);
    let offset = 0;
    for (const chunk of buffer) {
      combinedBuffer.set(chunk, offset);
      offset += chunk.length;
    }

    return combinedBuffer;
  }

  private playPCM(pcmBytes: Uint8Array) {
    const float32Array = new Float32Array(pcmBytes.length / 2);
    for (let i = 0; i < float32Array.length; i++) {
      let int16 = pcmBytes[i * 2] | (pcmBytes[i * 2 + 1] << 8);
      if (int16 >= 32768) int16 -= 65536;  // Convert unsigned to signed
      float32Array[i] = int16 / 32768.0;   // Normalize to [-1, 1]
    }

    const buffer = this.audioContext.createBuffer(
        1,
        float32Array.length,
        22000,
    );
    buffer.copyToChannel(float32Array, 0);

    const source = this.audioContext.createBufferSource();
    source.buffer = buffer;
    source.connect(this.audioContext.destination);

    const currentTime = this.audioContext.currentTime;
    const startTime = Math.max(this.lastAudioTime, currentTime);
    source.start(startTime);

    this.lastAudioTime = startTime + buffer.duration;
  }
}
