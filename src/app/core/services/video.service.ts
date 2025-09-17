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

import {
  ElementRef,
  Injectable,
  InjectionToken,
  Renderer2,
  RendererFactory2,
} from '@angular/core';
import {LiveRequest} from '../models/LiveRequest';
import {WebSocketService} from './websocket.service';

export const VIDEO_SERVICE = new InjectionToken<VideoService>('VideoService');

@Injectable({
  providedIn: 'root',
})
export class VideoService {
  private mediaRecorder!: MediaRecorder;
  private stream!: MediaStream;
  private renderer: Renderer2;
  private videoElement!: HTMLVideoElement;
  private videoBuffer: Uint8Array[] = [];
  private videoIntervalId: any = null;

  constructor(
    private wsService: WebSocketService,
    rendererFactory: RendererFactory2,
  ) {
    this.renderer = rendererFactory.createRenderer(null, null);
  }

  createVideoElement(container: ElementRef) {
    this.clearVideoElement(container);

    this.videoElement = this.renderer.createElement('video');
    this.renderer.setAttribute(this.videoElement, 'width', '400');
    this.renderer.setAttribute(this.videoElement, 'height', '300');
    this.renderer.setAttribute(this.videoElement, 'autoplay', 'true');
    this.renderer.setAttribute(this.videoElement, 'muted', 'true');

    this.renderer.appendChild(container.nativeElement, this.videoElement);
  }

  async startRecording(container: ElementRef) {
    this.createVideoElement(container);

    try {
      this.stream = await navigator.mediaDevices.getUserMedia({video: true});
      this.videoElement.srcObject = this.stream;

      this.mediaRecorder = new MediaRecorder(this.stream, {
        mimeType: 'video/webm',
      });

      this.mediaRecorder.start(1000);
      this.videoIntervalId = setInterval(
        () => this.captureAndSendFrame(),
        1000,
      );
    } catch (error) {
      console.error('Error accessing camera/microphone:', error);
    }
  }

  private async captureAndSendFrame() {
    try {
      const frameBlob = await this.captureFrame();
      const frameUint8Array = await this.blobToUint8Array(frameBlob);
      const request: LiveRequest = {
        blob: {
          mime_type: 'image/jpeg',
          data: frameUint8Array,
        },
      };
      this.wsService.sendMessage(request);
    } catch (error) {
      console.error('Error capturing frame:', error);
    }
  }

  private async blobToUint8Array(blob: Blob): Promise<Uint8Array> {
    const arrayBuffer = await blob.arrayBuffer();
    return new Uint8Array(arrayBuffer);
  }

  private async captureFrame(): Promise<Blob> {
    return new Promise((resolve, reject) => {
      try {
        const canvas = document.createElement('canvas');
        canvas.width = this.videoElement.videoWidth;
        canvas.height = this.videoElement.videoHeight;
        const ctx = canvas.getContext('2d');

        if (!ctx) {
          reject(new Error('Canvas context not supported'));
          return;
        }

        ctx.drawImage(this.videoElement, 0, 0, canvas.width, canvas.height);

        canvas.toBlob((blob) => {
          if (blob) resolve(blob);
          else reject(new Error('Failed to create image blob'));
        }, 'image/png');
      } catch (error) {
        reject(error);
      }
    });
  }

  private sendBufferedVideo() {
    if (this.videoBuffer.length === 0) return;
    // Concatenate all accumulated chunks into one Uint8Array
    const totalLength = this.videoBuffer.reduce(
      (sum, chunk) => sum + chunk.length,
      0,
    );
    const combinedBuffer = new Uint8Array(totalLength);

    let offset = 0;
    for (const chunk of this.videoBuffer) {
      combinedBuffer.set(chunk, offset);
      offset += chunk.length;
    }

    const request: LiveRequest = {
      blob: {
        mime_type: 'image/jpeg',
        data: combinedBuffer,
      },
    };
    this.wsService.sendMessage(request);
    this.videoBuffer = [];
  }

  stopRecording(container: ElementRef) {
    if (this.mediaRecorder) {
      this.mediaRecorder.stop();
    }
    if (this.stream) {
      this.stream.getTracks().forEach((track) => track.stop());
    }
    clearInterval(this.videoIntervalId);
    this.clearVideoElement(container);
  }

  private clearVideoElement(container: ElementRef) {
    const existingVideo = container.nativeElement.querySelector('video');
    if (existingVideo) {
      this.renderer.removeChild(container.nativeElement, existingVideo);
    }
  }
}
