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

import {AudioPlayingService} from './audio-playing.service';

describe('AudioPlayingService', () => {
  let service: AudioPlayingService;
  let mockAudioContext: any;

  beforeEach(() => {
    initTestBed();  // required for 1p compat
    mockAudioContext = {
      destination: {},
      createBuffer: jasmine.createSpy('createBuffer').and.returnValue({
        copyToChannel: jasmine.createSpy('copyToChannel'),
        duration: 1,
      }),
      createBufferSource:
          jasmine.createSpy('createBufferSource').and.returnValue({
            connect: jasmine.createSpy('connect'),
            start: jasmine.createSpy('start'),
            buffer: null,
          }),
      currentTime: 0,
    };
    spyOn(window, 'AudioContext').and.returnValue(mockAudioContext);

    TestBed.configureTestingModule({
      providers: [AudioPlayingService],
    });
    service = TestBed.inject(AudioPlayingService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });

  describe('playAudio', () => {
    it('should not play audio if the buffer is empty', () => {
      spyOn<any>(service, 'playPCM').and.callThrough();
      service.playAudio([]);
      expect((service as any).playPCM).not.toHaveBeenCalled();
    });

    it('should play audio if the buffer is not empty', () => {
      spyOn<any>(service, 'playPCM').and.callThrough();
      const buffer = [new Uint8Array([1, 2]), new Uint8Array([3, 4])];
      service.playAudio(buffer);
      expect((service as any).playPCM).toHaveBeenCalled();
    });

    it('should combine the buffers and play the combined audio', () => {
      spyOn<any>(service, 'playPCM').and.callThrough();
      const buffer = [new Uint8Array([1, 2]), new Uint8Array([3, 4])];
      const combinedBuffer = new Uint8Array([1, 2, 3, 4]);
      service.playAudio(buffer);
      expect((service as any).playPCM).toHaveBeenCalledWith(combinedBuffer);
    });
  });
});
