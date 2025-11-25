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

import {ElementRef, Renderer2, RendererFactory2} from '@angular/core';
import {TestBed} from '@angular/core/testing';
// 1p-ONLY-IMPORTS: import {beforeEach, describe, expect, flush, it, tick,}

import {fakeAsync, initTestBed,} from '../../testing/utils';

import {MockWebSocketService} from './testing/mock-websocket.service';
import {VideoService} from './video.service';
import {WEBSOCKET_SERVICE, WebSocketService} from './interfaces/websocket';

const WIDTH = '400';
const HEIGHT = '300';
const AUTOPLAY = 'true';
const MUTED = 'true';
const VIDEO_TAG = 'video';

describe('VideoService', () => {
  let service: VideoService;
  let webSocketServiceSpy: MockWebSocketService;
  let rendererSpy: jasmine.SpyObj<Renderer2>;
  let rendererFactorySpy: jasmine.SpyObj<RendererFactory2>;
  let mockStream: jasmine.SpyObj<MediaStream>;
  let mockTrack: jasmine.SpyObj<MediaStreamTrack>;
  let mockMediaRecorder: jasmine.SpyObj<MediaRecorder>;
  let mockVideoElement: jasmine.SpyObj<HTMLVideoElement>;
  let container: ElementRef;

  beforeEach(() => {
    initTestBed();  // required for 1p compat
    webSocketServiceSpy = new MockWebSocketService();
    rendererSpy = jasmine.createSpyObj('Renderer2', [
      'createElement',
      'setAttribute',
      'appendChild',
      'removeChild',
    ]);
    rendererFactorySpy = jasmine.createSpyObj('RendererFactory2', [
      'createRenderer',
    ]);
    rendererFactorySpy.createRenderer.and.returnValue(rendererSpy);

    mockTrack = jasmine.createSpyObj('MediaStreamTrack', ['stop']);
    mockStream = jasmine.createSpyObj('MediaStream', ['getTracks']);
    mockStream.getTracks.and.returnValue([mockTrack]);

    mockMediaRecorder =
        jasmine.createSpyObj('MediaRecorder', ['start', 'stop']);
    mockVideoElement = document.createElement('video') as any;
    // Mock srcObject to avoid errors in tests when a stream is assigned.
    Object.defineProperty(mockVideoElement, 'srcObject', {
      writable: true,
      value: null,
    });
    // Mock video dimensions to ensure canvas can be drawn on.
    Object.defineProperty(mockVideoElement, 'videoWidth', {
      writable: true,
      value: 400,
    });
    Object.defineProperty(mockVideoElement, 'videoHeight', {
      writable: true,
      value: 300,
    });

    rendererSpy.createElement.and.callFake((name: string) => {
      if (name === VIDEO_TAG) {
        return mockVideoElement;
      }
      return null;
    });

    if (!navigator.mediaDevices) {
      (navigator as any).mediaDevices = {};
    }
    navigator.mediaDevices.getUserMedia =
        jasmine.createSpy('getUserMedia')
            .and.returnValue(Promise.resolve(mockStream));
    spyOn(window, 'MediaRecorder').and.returnValue(mockMediaRecorder);

    container = new ElementRef(document.createElement('div'));

    TestBed.configureTestingModule({
      providers: [
        VideoService,
        {provide: WEBSOCKET_SERVICE, useValue: webSocketServiceSpy},
        {provide: RendererFactory2, useValue: rendererFactorySpy},
      ],
    });
    service = TestBed.inject(VideoService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });

  describe('createVideoElement', () => {
    it('should create a video element with attributes', () => {
      service.createVideoElement(container);
      expect(rendererSpy.createElement).toHaveBeenCalledWith(VIDEO_TAG);
      expect(rendererSpy.setAttribute)
          .toHaveBeenCalledWith(
              mockVideoElement,
              'width',
              WIDTH,
          );
      expect(rendererSpy.setAttribute)
          .toHaveBeenCalledWith(
              mockVideoElement,
              'height',
              HEIGHT,
          );
      expect(rendererSpy.setAttribute)
          .toHaveBeenCalledWith(
              mockVideoElement,
              'autoplay',
              AUTOPLAY,
          );
      expect(rendererSpy.setAttribute)
          .toHaveBeenCalledWith(
              mockVideoElement,
              'muted',
              MUTED,
          );
    });

    it('should append video element to container', () => {
      service.createVideoElement(container);
      expect(rendererSpy.appendChild)
          .toHaveBeenCalledWith(
              container.nativeElement,
              mockVideoElement,
          );
    });

    it('should clear existing video element if any', () => {
      const existingVideo = document.createElement(VIDEO_TAG);
      container.nativeElement.appendChild(existingVideo);
      spyOn(container.nativeElement, 'querySelector')
          .and.returnValue(
              existingVideo,
          );
      service.createVideoElement(container);
      expect(rendererSpy.removeChild)
          .toHaveBeenCalledWith(
              container.nativeElement,
              existingVideo,
          );
    });
  });

  describe('startRecording', () => {
    it('should call createVideoElement', async () => {
      spyOn(service, 'createVideoElement');
      await service.startRecording(container);
      expect(service.createVideoElement).toHaveBeenCalledWith(container);
    });

    it('should request video media', async () => {
      await service.startRecording(container);
      expect(navigator.mediaDevices.getUserMedia).toHaveBeenCalledWith({
        video: true,
      });
    });

    it('should create and start MediaRecorder', async () => {
      await service.startRecording(container);
      expect(window.MediaRecorder).toHaveBeenCalled();
      expect(mockMediaRecorder.start).toHaveBeenCalledWith(1000);
    });
  });

  describe('stopRecording', () => {
    it('should stop media recorder', async () => {
      await service.startRecording(container);
      service.stopRecording(container);
      expect(mockMediaRecorder.stop).toHaveBeenCalled();
    });

    it('should stop media stream tracks', async () => {
      await service.startRecording(container);
      service.stopRecording(container);
      expect(mockTrack.stop).toHaveBeenCalled();
    });

    it('should clear video element', async () => {
      await service.startRecording(container);
      spyOn(container.nativeElement, 'querySelector')
          .and.returnValue(
              mockVideoElement,
          );
      service.stopRecording(container);
      expect(rendererSpy.removeChild)
          .toHaveBeenCalledWith(
              container.nativeElement,
              mockVideoElement,
          );
    });
  });
});
