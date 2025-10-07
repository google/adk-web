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

import {ElementRef, Inject, Injectable, InjectionToken} from '@angular/core';

import {URLUtil} from '../../../utils/url-util';
import {LiveRequest} from '../models/LiveRequest';

import {AUDIO_SERVICE, AudioService} from './audio.service';
import {VIDEO_SERVICE, VideoService} from './video.service';
import {WEBSOCKET_SERVICE, WebSocketService} from './websocket.service';

export const STREAM_CHAT_SERVICE =
    new InjectionToken<StreamChatService>('StreamChatService');

/**
 * Service for supporting live streaming with audio/video.
 */
@Injectable({
  providedIn: 'root',
})
export class StreamChatService {
  private audioIntervalId: number|undefined = undefined;
  private videoIntervalId: number|undefined = undefined;

  constructor(
      @Inject(AUDIO_SERVICE) private readonly audioService: AudioService,
      @Inject(VIDEO_SERVICE) private readonly videoService: VideoService,
      @Inject(WEBSOCKET_SERVICE) private readonly webSocketService:
          WebSocketService,
  ) {}

  async startAudioChat({
    appName,
    userId,
    sessionId,
  }: {appName: string; userId: string; sessionId: string;}) {
    const protocol = window.location.protocol === 'https:' ? 'wss' : 'ws';
    this.webSocketService.connect(
        `${protocol}://${URLUtil.getWSServerUrl()}/run_live?app_name=${
            appName}&user_id=${userId}&session_id=${sessionId}`,
    );

    await this.startAudioStreaming();
  }

  stopAudioChat() {
    this.stopAudioStreaming();
    this.webSocketService.closeConnection();
  }

  private async startAudioStreaming() {
    try {
      await this.audioService.startRecording();
      this.audioIntervalId = setInterval(() => this.sendBufferedAudio(), 250);
    } catch (error) {
      console.error('Error accessing microphone:', error);
    }
  }

  private stopAudioStreaming() {
    clearInterval(this.audioIntervalId);
    this.audioIntervalId = undefined;
    this.audioService.stopRecording();
  }

  private sendBufferedAudio() {
    const combinedBuffer = this.audioService.getCombinedAudioBuffer();
    if (!combinedBuffer) return;

    const request: LiveRequest = {
      blob: {
        mime_type: 'audio/pcm',
        data: combinedBuffer,
      },
    };
    this.webSocketService.sendMessage(request);
    this.audioService.cleanAudioBuffer();
  }

  async startVideoChat({
    appName,
    userId,
    sessionId,
    videoContainer,
  }: {
    appName: string; userId: string; sessionId: string;
    videoContainer: ElementRef
  }) {
    const protocol = window.location.protocol === 'https:' ? 'wss' : 'ws';
    this.webSocketService.connect(
        `${protocol}://${URLUtil.getWSServerUrl()}/run_live?app_name=${
            appName}&user_id=${userId}&session_id=${sessionId}`,
    );

    await this.startAudioStreaming();
    await this.startVideoStreaming(videoContainer);
  }

  stopVideoChat(videoContainer: ElementRef) {
    this.stopAudioStreaming();
    this.stopVideoStreaming(videoContainer);
    this.webSocketService.closeConnection();
  }

  private async startVideoStreaming(videoContainer: ElementRef) {
    try {
      await this.videoService.startRecording(videoContainer);
      this.videoIntervalId = setInterval(
          async () => await this.sendCapturedFrame(),
          1000,
      );
    } catch (error) {
      console.error('Error accessing camera:', error);
    }
  }

  private async sendCapturedFrame() {
    const capturedFrame = await this.videoService.getCapturedFrame();
    if (!capturedFrame) return;

    const request: LiveRequest = {
      blob: {
        mime_type: 'image/jpeg',
        data: capturedFrame,
      },
    };
    this.webSocketService.sendMessage(request);
  }

  private stopVideoStreaming(videoContainer: ElementRef) {
    clearInterval(this.videoIntervalId);
    this.videoIntervalId = undefined;
    this.videoService.stopRecording(videoContainer);
  }

  onStreamClose() {
    return this.webSocketService.onCloseReason();
  }

  closeStream() {
    this.webSocketService.closeConnection();
  }
}
