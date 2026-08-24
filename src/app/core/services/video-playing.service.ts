/**
 * @license
 * Copyright 2026 Google LLC
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
import {objectUrlFromSafeSource} from 'safevalues/dom';

import {VideoPlayingService as VideoPlayingServiceInterface} from './interfaces/video-playing';

/**
 * The avatar arrives as a fragmented MP4 byte stream (H.264 baseline + AAC-LC
 * muxed together), so playback goes through MediaSource rather than a plain
 * src. The first entry matches what the Live API actually sends; the rest are
 * fallbacks in case the encoder profile changes.
 */
const AVATAR_MIME_CANDIDATES = [
  'video/mp4; codecs="avc1.42c020, mp4a.40.2"',
  'video/mp4; codecs="avc1.42E01F, mp4a.40.2"',
  'video/mp4',
];

/** Seconds of already-played video to keep before evicting. */
const BUFFER_BEHIND_SECONDS = 10;

/**
 * Seconds of buffer ahead of the playhead we tolerate before skipping forward.
 * The avatar is a live stream, so drifting behind shows up as the agent
 * replying late.
 */
const MAX_LAG_SECONDS = 2;

@Injectable({
  providedIn: 'root',
})
export class VideoPlayingService implements VideoPlayingServiceInterface {
  private readonly renderer: Renderer2;
  private videoElement?: HTMLVideoElement;
  private mediaSource?: MediaSource;
  private sourceBuffer?: SourceBuffer;
  private objectUrl?: string;
  /** Chunks waiting for the SourceBuffer to finish its previous append. */
  private pending: Uint8Array[] = [];

  constructor(rendererFactory: RendererFactory2) {
    this.renderer = rendererFactory.createRenderer(null, null);
  }

  startPlayback(container: ElementRef) {
    if (!container?.nativeElement) {
      return;
    }
    this.teardown(container);

    const mimeType = AVATAR_MIME_CANDIDATES.find(
        (candidate) => typeof MediaSource !== 'undefined' &&
            MediaSource.isTypeSupported(candidate));
    if (!mimeType) {
      console.error('Avatar video playback is not supported in this browser.');
      return;
    }

    this.videoElement = this.renderer.createElement('video');
    this.renderer.setAttribute(this.videoElement!, 'autoplay', 'true');
    this.renderer.setAttribute(this.videoElement!, 'playsinline', 'true');
    this.renderer.appendChild(container.nativeElement, this.videoElement);

    this.mediaSource = new MediaSource();
    this.objectUrl = objectUrlFromSafeSource(this.mediaSource);
    this.videoElement!.src = this.objectUrl;

    this.mediaSource.addEventListener('sourceopen', () => {
      // Fires once the element has attached; only then can we add a buffer.
      if (!this.mediaSource || this.mediaSource.readyState !== 'open') {
        return;
      }
      try {
        this.sourceBuffer = this.mediaSource.addSourceBuffer(mimeType);
        this.sourceBuffer.addEventListener('updateend', () => this.drain());
        this.drain();
      } catch (error) {
        console.error('Failed to open avatar video buffer:', error);
      }
    }, {once: true});
  }

  playVideo(chunks: Uint8Array[]) {
    if (!chunks.length) {
      return;
    }
    this.pending.push(...chunks);
    this.drain();
  }

  stopVideo(container: ElementRef) {
    this.teardown(container);
  }

  /**
   * Appends one queued chunk. MediaSource rejects overlapping appends, so the
   * rest are picked up by the `updateend` handler.
   */
  private drain() {
    const buffer = this.sourceBuffer;
    if (!buffer || buffer.updating || !this.pending.length) {
      return;
    }
    if (this.mediaSource?.readyState !== 'open') {
      return;
    }

    const chunk = this.pending.shift()!;
    try {
      buffer.appendBuffer(chunk as BufferSource);
    } catch (error) {
      if ((error as DOMException)?.name === 'QuotaExceededError') {
        // Buffer is full: drop what has already played and retry the chunk.
        this.pending.unshift(chunk);
        this.evict(true);
        return;
      }
      console.error('Failed to append avatar video chunk:', error);
      return;
    }
    this.evict(false);
    this.catchUpToLiveEdge();
  }

  private evict(force: boolean) {
    const buffer = this.sourceBuffer;
    const video = this.videoElement;
    if (!buffer || !video || buffer.updating || !buffer.buffered.length) {
      return;
    }
    const start = buffer.buffered.start(0);
    const cutoff = video.currentTime - BUFFER_BEHIND_SECONDS;
    if (force || start < cutoff) {
      const end = force ? Math.max(start, video.currentTime - 1) : cutoff;
      if (end > start) {
        try {
          buffer.remove(start, end);
        } catch (error) {
          console.error('Failed to evict buffered avatar video:', error);
        }
      }
    }
  }

  private catchUpToLiveEdge() {
    const buffer = this.sourceBuffer;
    const video = this.videoElement;
    if (!buffer || !video || !buffer.buffered.length) {
      return;
    }
    const liveEdge = buffer.buffered.end(buffer.buffered.length - 1);
    if (liveEdge - video.currentTime > MAX_LAG_SECONDS) {
      video.currentTime = liveEdge - 0.3;
    }
    if (video.paused) {
      // Autoplay is allowed because a call always starts from a click, but a
      // rejected promise must still be handled.
      video.play().catch(() => {});
    }
  }

  private teardown(container: ElementRef) {
    this.pending = [];
    this.sourceBuffer = undefined;

    if (this.mediaSource?.readyState === 'open') {
      try {
        this.mediaSource.endOfStream();
      } catch {
        // Already torn down by the element; nothing to do.
      }
    }
    this.mediaSource = undefined;

    if (this.objectUrl) {
      URL.revokeObjectURL(this.objectUrl);
      this.objectUrl = undefined;
    }
    if (this.videoElement) {
      this.videoElement.removeAttribute('src');
      this.videoElement.load();
      this.videoElement = undefined;
    }

    const existing = container?.nativeElement?.querySelector('video');
    if (existing) {
      this.renderer.removeChild(container.nativeElement, existing);
    }
  }
}
