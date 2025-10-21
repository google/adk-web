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
import {BehaviorSubject, Subject} from 'rxjs';
import {WebSocketSubject} from 'rxjs/webSocket';

import {LiveRequest} from '../models/LiveRequest';
import {Event} from '../models/types';

import {AUDIO_PLAYING_SERVICE} from './interfaces/audio-playing';
import {WebSocketService as WebSocketServiceInterface} from './interfaces/websocket';

@Injectable({
  providedIn: 'root',
})
export class WebSocketService implements WebSocketServiceInterface {
  private readonly audioPlayingService = inject(AUDIO_PLAYING_SERVICE);

  private socket$!: WebSocketSubject<any>;
  private messages$: BehaviorSubject<string> = new BehaviorSubject<string>('');
  private audioBuffer: Uint8Array[] = [];
  private audioIntervalId: any = null;
  private closeReasonSubject = new Subject<string>();

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
    this.audioIntervalId = setInterval(() => this.playIncomingAudio(), 250);
  }

  private playIncomingAudio() {
    this.audioPlayingService.playAudio(this.audioBuffer);
    this.audioBuffer = [];
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
    const msg = JSON.parse(message) as Event;
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

  private base64ToUint8Array(base64: string): Uint8Array {
    const binaryString = atob(this.urlSafeBase64ToBase64(base64));
    const len = binaryString.length;
    const bytes = new Uint8Array(len);
    for (let i = 0; i < len; i++) {
      bytes[i] = binaryString.charCodeAt(i);
    }
    return bytes;
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
