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

import {fakeAsync, TestBed, tick} from '@angular/core/testing';

import {AudioService} from './audio.service';
import {MockWebSocketService} from './testing/mock-websocket.service';
import {WebSocketService} from './websocket.service';

const AUDIO_PROCESSOR_PATH = './assets/audio-processor.js';
const AUDIO_PROCESSOR_NAME = 'audio-processor';

describe('AudioService', () => {
  let service: AudioService;
  let webSocketServiceSpy: MockWebSocketService;
  let mockStream: jasmine.SpyObj<MediaStream>;
  let mockTrack: jasmine.SpyObj<MediaStreamTrack>;
  let mockSource: any;
  let mockWorkletNode: any;
  let mockAudioContext: any;

  beforeEach(() => {
    webSocketServiceSpy = new MockWebSocketService();
    mockTrack = jasmine.createSpyObj('MediaStreamTrack', ['stop']);
    mockStream = jasmine.createSpyObj('MediaStream', ['getTracks']);
    mockStream.getTracks.and.returnValue([mockTrack]);

    mockSource = jasmine.createSpyObj('MediaStreamAudioSourceNode', [
      'connect',
      'disconnect',
    ]);
    mockWorkletNode = {
      port: {onmessage: undefined as any},
      connect: jasmine.createSpy('connect'),
      disconnect: jasmine.createSpy('disconnect'),
    };
    mockAudioContext = {
      destination: {},
      audioWorklet: {
        addModule: jasmine.createSpy('addModule').and.resolveTo(undefined),
      },
      createMediaStreamSource: jasmine.createSpy('createMediaStreamSource')
                                   .and.returnValue(mockSource),
      close: jasmine.createSpy('close'),
    };

    if (!navigator.mediaDevices) {
      (navigator as any).mediaDevices = {};
    }
    spyOn(navigator.mediaDevices, 'getUserMedia').and.resolveTo(mockStream);
    spyOn(window, 'AudioContext').and.returnValue(mockAudioContext);
    spyOn(window, 'AudioWorkletNode').and.returnValue(mockWorkletNode);
    mockAudioContext.audioWorklet.addModule.and.resolveTo();

    TestBed.configureTestingModule({
      providers: [
        AudioService,
        {provide: WebSocketService, useValue: webSocketServiceSpy},
      ],
    });
    service = TestBed.inject(AudioService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });

  describe('startRecording', () => {
    it('should request user media', async () => {
      await service.startRecording();
      expect(navigator.mediaDevices.getUserMedia).toHaveBeenCalledWith({
        audio: true,
      });
    });

    it('should create AudioContext', async () => {
      await service.startRecording();
      expect(window.AudioContext).toHaveBeenCalled();
    });

    it('should add audio worklet module', async () => {
      await service.startRecording();
      expect(mockAudioContext.audioWorklet.addModule)
          .toHaveBeenCalledWith(
              AUDIO_PROCESSOR_PATH,
          );
    });

    it('should create media stream source', async () => {
      await service.startRecording();
      expect(mockAudioContext.createMediaStreamSource)
          .toHaveBeenCalledWith(
              mockStream,
          );
    });

    it('should create AudioWorkletNode', async () => {
      await service.startRecording();
      expect(window.AudioWorkletNode)
          .toHaveBeenCalledWith(
              mockAudioContext,
              AUDIO_PROCESSOR_NAME,
          );
    });

    it('should connect audio nodes', async () => {
      await service.startRecording();
      expect(mockSource.connect).toHaveBeenCalledWith(mockWorkletNode);
      expect(mockWorkletNode.connect)
          .toHaveBeenCalledWith(
              mockAudioContext.destination,
          );
    });

    it('should set an interval to send buffered audio', fakeAsync(async () => {
         await service.startRecording();
         // Manually trigger onmessage to add data to buffer
         const audioData = new Float32Array([0.1, 0.2]);
         mockWorkletNode.port.onmessage({data: audioData});
         tick(250);
         expect(webSocketServiceSpy.sendMessage).toHaveBeenCalled();
         service.stopRecording();
       }));
  });

  describe('stopRecording', () => {
    it('should stop media stream tracks', async () => {
      await service.startRecording();
      service.stopRecording();
      expect(mockTrack.stop).toHaveBeenCalled();
    });

    it('should disconnect audio source', async () => {
      await service.startRecording();
      service.stopRecording();
      expect(mockSource.disconnect).toHaveBeenCalled();
    });

    it('should close audio context', async () => {
      await service.startRecording();
      service.stopRecording();
      expect(mockAudioContext.close).toHaveBeenCalled();
    });

    it('should clear interval', fakeAsync(async () => {
         await service.startRecording();
         const audioData = new Float32Array([0.1, 0.2]);
         mockWorkletNode.port.onmessage({data: audioData});
         tick(250);
         expect(webSocketServiceSpy.sendMessage).toHaveBeenCalledTimes(1);
         service.stopRecording();
         tick(250);
         expect(webSocketServiceSpy.sendMessage).toHaveBeenCalledTimes(1);
       }));
  });
});
