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

import {ElementRef, inject, Injectable} from '@angular/core';

import {URLUtil} from '../../../utils/url-util';
import {LiveRequest} from '../models/LiveRequest';

import {AUDIO_RECORDING_SERVICE} from './interfaces/audio-recording';
import {STREAM_CHAT_SERVICE, StreamChatService as StreamChatServiceInterface} from './interfaces/stream-chat';
import {VIDEO_SERVICE} from './interfaces/video';
import {WEBSOCKET_SERVICE} from './interfaces/websocket';
import {VideoService} from './video.service';
import {WebSocketService} from './websocket.service';

/**
 * Service for supporting live streaming with audio/video.
 */
@Injectable({
  providedIn: 'root',
})
export class StreamChatService implements StreamChatServiceInterface {
  private readonly audioRecordingService = inject(AUDIO_RECORDING_SERVICE);
  private readonly videoService = inject(VIDEO_SERVICE);
  private readonly webSocketService = inject(WEBSOCKET_SERVICE);
  private audioIntervalId: number|undefined = undefined;
  private videoIntervalId: number|undefined = undefined;

  constructor() {}

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
      await this.audioRecordingService.startRecording();
      this.audioIntervalId = setInterval(() => this.sendBufferedAudio(), 250);
    } catch (error) {
      console.error('Error accessing microphone:', error);
    }
  }

  private stopAudioStreaming() {
    clearInterval(this.audioIntervalId);
    this.audioIntervalId = undefined;
    this.audioRecordingService.stopRecording();
  }

  private sendBufferedAudio() {
    const combinedBuffer = this.audioRecordingService.getCombinedAudioBuffer();
    if (!combinedBuffer) return;

    const request: LiveRequest = {
      blob: {
        mime_type: 'audio/pcm',
        data: combinedBuffer,
      },
    };
    this.webSocketService.sendMessage(request);
    this.audioRecordingService.cleanAudioBuffer();
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
