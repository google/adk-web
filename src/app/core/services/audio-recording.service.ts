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

import {inject, Injectable} from '@angular/core';
import {AUDIO_WORKLET_MODULE_PATH, AudioRecordingService as AudioRecordingServiceInterface} from './interfaces/audio-recording';


@Injectable({
  providedIn: 'root',
})
export class AudioRecordingService implements AudioRecordingServiceInterface {
  private readonly audioWorkletModulePath = inject(AUDIO_WORKLET_MODULE_PATH);

  private stream!: MediaStream;
  private audioContext!: AudioContext;
  private source!: MediaStreamAudioSourceNode;
  private audioBuffer: Uint8Array[] = [];

  async startRecording() {
    try {
      this.stream = await navigator.mediaDevices.getUserMedia({audio: true});

      this.audioContext = new AudioContext();
      await this.audioContext.audioWorklet.addModule(
          this.audioWorkletModulePath);

      this.source = this.audioContext.createMediaStreamSource(this.stream);
      const workletNode = new AudioWorkletNode(
          this.audioContext,
          'audio-processor',
      );

      workletNode.port.onmessage = (event) => {
        const audioData = event.data;
        const pcmBlob = this.float32ToPCM(audioData);
        this.audioBuffer.push(pcmBlob);
      };

      this.source.connect(workletNode);
      workletNode.connect(this.audioContext.destination);
    } catch (error) {
      console.error('Error accessing microphone:', error);
    }
  }

  stopRecording() {
    if (this.source) {
      this.source.disconnect();
    }
    if (this.audioContext) {
      this.audioContext.close();
    }
    if (this.stream) {
      this.stream.getTracks().forEach((track) => track.stop());
    }
  }

  getCombinedAudioBuffer(): Uint8Array|void {
    if (this.audioBuffer.length === 0) return;
    // Concatenate all accumulated chunks into one Uint8Array
    const totalLength = this.audioBuffer.reduce(
        (sum, chunk) => sum + chunk.length,
        0,
    );
    const combinedBuffer = new Uint8Array(totalLength);

    let offset = 0;
    for (const chunk of this.audioBuffer) {
      combinedBuffer.set(chunk, offset);
      offset += chunk.length;
    }

    return combinedBuffer;
  }

  cleanAudioBuffer() {
    this.audioBuffer = [];
  }

  private float32ToPCM(audioData: Float32Array): Uint8Array {
    const buffer = new ArrayBuffer(audioData.length * 2);
    const view = new DataView(buffer);

    for (let i = 0; i < audioData.length; i++) {
      let sample = Math.max(-1, Math.min(1, audioData[i]));
      sample = sample < 0 ? sample * 0x8000 : sample * 0x7fff;
      view.setInt16(i * 2, sample, true);
    }

    return new Uint8Array(buffer);
  }
}
