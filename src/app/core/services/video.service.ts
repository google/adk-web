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

import {ElementRef, Injectable, Renderer2, RendererFactory2} from '@angular/core';

import {LiveRequest} from '../models/LiveRequest';
import {VideoService as VideoServiceInterface} from './interfaces/video';

@Injectable({
  providedIn: 'root',
})
export class VideoService implements VideoServiceInterface {
  private mediaRecorder!: MediaRecorder;
  private stream!: MediaStream;
  private renderer: Renderer2;
  private videoElement!: HTMLVideoElement;
  private videoBuffer: Uint8Array[] = [];

  constructor(
      rendererFactory: RendererFactory2,
  ) {
    this.renderer = rendererFactory.createRenderer(null, null);
  }

  createVideoElement(container: ElementRef) {
    if (!container?.nativeElement) {
      return;
    }

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
      if (this.videoElement) {
        this.videoElement.srcObject = this.stream;
      }

      this.mediaRecorder = new MediaRecorder(this.stream, {
        mimeType: 'video/webm',
      });

      this.mediaRecorder.start(1000);
    } catch (error) {
      console.error('Error accessing camera/microphone:', error);
    }
  }

  async getCapturedFrame() {
    try {
      const frameBlob = await this.captureFrame();
      return this.blobToUint8Array(frameBlob);
    } catch (error) {
      console.error('Error capturing frame:', error);
      return;
    }
  }

  private async blobToUint8Array(blob: Blob): Promise<Uint8Array> {
    const arrayBuffer = await blob.arrayBuffer();
    return new Uint8Array(arrayBuffer);
  }

  private async captureFrame(): Promise<Blob> {
    return new Promise((resolve, reject) => {
      try {
        if (!this.videoElement) {
          reject(new Error('Video element not available'));
          return;
        }

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
          if (blob)
            resolve(blob);
          else
            reject(new Error('Failed to create image blob'));
        }, 'image/png');
      } catch (error) {
        reject(error);
      }
    });
  }

  stopRecording(container: ElementRef) {
    if (this.mediaRecorder) {
      this.mediaRecorder.stop();
    }
    if (this.stream) {
      this.stream.getTracks().forEach((track) => track.stop());
    }
    this.clearVideoElement(container);
  }

  private clearVideoElement(container: ElementRef) {
    const existingVideo = container.nativeElement.querySelector('video');
    if (existingVideo) {
      this.renderer.removeChild(container.nativeElement, existingVideo);
    }
  }
}
