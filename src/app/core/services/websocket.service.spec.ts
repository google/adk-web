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

import {TestBed} from '@angular/core/testing';
// 1p-ONLY-IMPORTS: import {beforeEach, describe, expect, it,}

import {initTestBed} from '../../testing/utils';

import {AUDIO_PLAYING_SERVICE} from './interfaces/audio-playing';
import {MockAudioPlayingService} from './testing/mock-audio-playing.service';
import {MockVideoPlayingService} from './testing/mock-video-playing.service';
import {VIDEO_PLAYING_SERVICE} from './interfaces/video-playing';
import {WebSocketService} from './websocket.service';

describe('WebSocketService', () => {
  let service: WebSocketService;
  let mockAudioPlayingService: MockAudioPlayingService;
  let mockVideoPlayingService: MockVideoPlayingService;

  beforeEach(() => {
    initTestBed();  // required for 1p compat
    mockAudioPlayingService = new MockAudioPlayingService();
    mockVideoPlayingService = new MockVideoPlayingService();

    TestBed.configureTestingModule({
      providers: [
        WebSocketService,
        {provide: AUDIO_PLAYING_SERVICE, useValue: mockAudioPlayingService},
        {provide: VIDEO_PLAYING_SERVICE, useValue: mockVideoPlayingService}
      ],
    });
    service = TestBed.inject(WebSocketService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });

  describe('urlSafeBase64ToBase64', () => {
    it('should replace _ with / and - with +', () => {
      expect(service.urlSafeBase64ToBase64('a-b_c')).toContain('a+b/c');
    });

    it('should add padding', () => {
      expect(service.urlSafeBase64ToBase64('abc')).toEqual('abc=');
      expect(service.urlSafeBase64ToBase64('abcd')).toEqual('abcd');
    });
  });

  describe('connection restart', () => {
    it('should reset the audio buffer when reconnecting', () => {
      service.connect('ws://test1');
      (service as any).audioBuffer = [new Uint8Array([1, 2, 3])];

      service.connect('ws://test2');

      expect((service as any).audioBuffer).toEqual([]);
    });

    it('should close the previous connection when reconnecting', () => {
      service.connect('ws://test1');
      const firstSocket = (service as any).socket$;
      spyOn(firstSocket, 'complete').and.callThrough();

      service.connect('ws://test2');

      expect(firstSocket.complete).toHaveBeenCalled();
    });

    it('should clear the audio interval when closing the connection', () => {
      service.connect('ws://test');
      expect((service as any).audioIntervalId).not.toBeNull();

      service.closeConnection();

      expect((service as any).audioIntervalId).toBeNull();
    });
  });
});
