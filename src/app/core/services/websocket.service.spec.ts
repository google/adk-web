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

import {WebSocketService} from './websocket.service';

describe('WebSocketService', () => {
  let service: WebSocketService;
  let mockAudioContext: any;

  beforeEach(() => {
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
      state: 'running',
      close: jasmine.createSpy('close').and.callFake(function(this: any) {
        this.state = 'closed';
      }),
    };
    spyOn(window, 'AudioContext').and.returnValue(mockAudioContext);

    TestBed.configureTestingModule({
      providers: [WebSocketService],
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
    it('should close audio context when closing connection', () => {
      service.closeConnection();
      expect(mockAudioContext.close).toHaveBeenCalled();
      expect(mockAudioContext.state).toBe('closed');
    });

    it('should create new audio context when reconnecting after close', () => {
      service.closeConnection();
      expect(mockAudioContext.state).toBe('closed');

      const audioContextCallCount = (window.AudioContext as any).calls.count();
      service.connect('ws://test');
      expect((window.AudioContext as any).calls.count()).toBe(audioContextCallCount + 1);
    });

    it('should reset audio buffer when reconnecting', () => {
      service.connect('ws://test1');

      (service as any).audioBuffer = [new Uint8Array([1, 2, 3])];

      service.connect('ws://test2');
      expect((service as any).audioBuffer).toEqual([]);
    });

    it('should reset lastAudioTime when reconnecting', () => {
      service.connect('ws://test1');
      (service as any).lastAudioTime = 5.5;
      service.connect('ws://test2');
      expect((service as any).lastAudioTime).toBe(0);
    });
  });
});
