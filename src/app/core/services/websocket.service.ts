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

import {Injectable, InjectionToken} from '@angular/core';
import {BehaviorSubject, Subject} from 'rxjs';
import {webSocket, WebSocketSubject} from 'rxjs/webSocket';
import {LiveRequest} from '../models/LiveRequest';

export const WEBSOCKET_SERVICE = new InjectionToken<WebSocketService>('WebSocketService');

@Injectable({
  providedIn: 'root',
})
export class WebSocketService {
  private socket$!: WebSocketSubject<any>;
  private messages$: BehaviorSubject<string> = new BehaviorSubject<string>('');
  private audioContext = new AudioContext({sampleRate: 22000});
  private audioBuffer: Uint8Array[] = [];
  private audioIntervalId: any = null;
  private lastAudioTime = 0;
  private closeReasonSubject = new Subject<string>();

  constructor() {}

  connect(serverUrl: string) {
    this.socket$ = new WebSocketSubject({
      url: serverUrl,
      serializer: (msg) => JSON.stringify(msg),
      deserializer: (event) => event.data,
      closeObserver: {
        next: (closeEvent: CloseEvent) => {
          this.emitWsCloseReason(closeEvent.reason);
        },
      },
    });

    this.socket$.subscribe(
      (message) => {
        this.handleIncomingAudio(message), this.messages$.next(message);
      },
      (error) => {
        console.error('WebSocket error:', error);
      },
    );
    this.audioIntervalId = setInterval(() => this.processBufferedAudio(), 250);
  }

  sendMessage(data: LiveRequest) {
    data.blob.data = this.arrayBufferToBase64(data.blob.data.buffer);
    if (!this.socket$ || this.socket$.closed) {
      console.error('WebSocket is not open.');
      return;
    }
    this.socket$.next(data);
  }

  closeConnection() {
    clearInterval(this.audioIntervalId);
    this.audioIntervalId = null;
    if (this.socket$) {
      this.socket$.complete();
    }
  }

  getMessages() {
    return this.messages$.asObservable();
  }

  private arrayBufferToBase64(buffer: ArrayBuffer): string {
    let binary = '';
    const bytes = new Uint8Array(buffer);
    const len = bytes.byteLength;
    for (let i = 0; i < len; i++) {
      binary += String.fromCharCode(bytes[i]);
    }
    return btoa(binary);
  }

  private handleIncomingAudio(message: any) {
    const msg = JSON.parse(message);
    if (
      msg['content'] &&
      msg['content']['parts'] &&
      msg['content']['parts'][0]['inlineData']
    ) {
      const pcmBytes = this.base64ToUint8Array(
          msg['content']['parts'][0]['inlineData']['data'],
      );
      this.audioBuffer.push(pcmBytes);
    }
  }

  private processBufferedAudio() {
    if (this.audioBuffer.length === 0) return;

    // Merge received chunks into a single buffer
    const totalLength = this.audioBuffer.reduce(
      (sum, chunk) => sum + chunk.length,
      0,
    );
    const mergedBuffer = new Uint8Array(totalLength);
    let offset = 0;
    for (const chunk of this.audioBuffer) {
      mergedBuffer.set(chunk, offset);
      offset += chunk.length;
    }

    this.playPCM(mergedBuffer); // Play combined audio
    this.audioBuffer = []; // Clear buffer after processing
  }

  private base64ToUint8Array(base64: string): Uint8Array {
    const binaryString = atob(this.urlSafeBase64ToBase64(base64));
    const len = binaryString.length;
    const bytes = new Uint8Array(len);
    for (let i = 0; i < len; i++) {
      bytes[i] = binaryString.charCodeAt(i);
    }
    return bytes;
  }

  private playPCM(pcmBytes: Uint8Array) {
    const float32Array = new Float32Array(pcmBytes.length / 2);
    for (let i = 0; i < float32Array.length; i++) {
      let int16 = pcmBytes[i * 2] | (pcmBytes[i * 2 + 1] << 8);
      if (int16 >= 32768) int16 -= 65536; // Convert unsigned to signed
      float32Array[i] = int16 / 32768.0; // Normalize to [-1, 1]
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

  urlSafeBase64ToBase64(urlSafeBase64: string): string {
    let base64 = urlSafeBase64.replace(/_/g, '/').replace(/-/g, '+');

    // Ensure correct padding
    while (base64.length % 4 !== 0) {
      base64 += '=';
    }

    return base64;
  }

  emitWsCloseReason(reason: string) {
    this.closeReasonSubject.next(reason);
  }

  onCloseReason() {
    return this.closeReasonSubject.asObservable();
  }
}
