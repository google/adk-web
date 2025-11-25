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

import {AudioRecordingService} from './audio-recording.service';
import {AUDIO_WORKLET_MODULE_PATH} from './interfaces/audio-recording';
import {WEBSOCKET_SERVICE} from './interfaces/websocket';
import {MockWebSocketService} from './testing/mock-websocket.service';

const AUDIO_PROCESSOR_PATH = './assets/audio-processor.js';
const AUDIO_PROCESSOR_NAME = 'audio-processor';

describe('AudioRecordingService', () => {
  let service: AudioRecordingService;
  let webSocketServiceSpy: MockWebSocketService;
  let mockStream: jasmine.SpyObj<MediaStream>;
  let mockTrack: jasmine.SpyObj<MediaStreamTrack>;
  let mockSource: any;
  let mockWorkletNode: any;
  let mockAudioContext: any;

  beforeEach(() => {
    initTestBed();  // required for 1p compat
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
    navigator.mediaDevices.getUserMedia =
        jasmine.createSpy('getUserMedia').and.resolveTo(mockStream);
    spyOn(window, 'AudioContext').and.returnValue(mockAudioContext);
    spyOn(window, 'AudioWorkletNode').and.returnValue(mockWorkletNode);
    mockAudioContext.audioWorklet.addModule.and.resolveTo();

    TestBed.configureTestingModule({
      providers: [
        AudioRecordingService,
        {provide: WEBSOCKET_SERVICE, useValue: webSocketServiceSpy},
        {provide: AUDIO_WORKLET_MODULE_PATH, useValue: AUDIO_PROCESSOR_PATH},
      ],
    });
    service = TestBed.inject(AudioRecordingService);
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
  });
});
