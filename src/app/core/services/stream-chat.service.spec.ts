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

import {ElementRef} from '@angular/core';
import {TestBed} from '@angular/core/testing';
// 1p-ONLY-IMPORTS: import {beforeEach, describe, expect, it,}

import {URLUtil} from '../../../utils/url-util';
import {fakeAsync,
        initTestBed,
        tick} from '../../testing/utils';

import {AUDIO_RECORDING_SERVICE} from './interfaces/audio-recording';
import {StreamChatService} from './stream-chat.service';
import {MockAudioRecordingService} from './testing/mock-audio-recording.service';
import {MockVideoService} from './testing/mock-video.service';
import {MockWebSocketService} from './testing/mock-websocket.service';
import {VIDEO_SERVICE} from './interfaces/video';
import {WEBSOCKET_SERVICE} from './interfaces/websocket';

describe('StreamChatService', () => {
  let service: StreamChatService;
  let mockWebSocketService: MockWebSocketService;
  let mockAudioRecordingService: MockAudioRecordingService;
  let mockVideoService: MockVideoService;
  let videoContainer: ElementRef;


  beforeEach(() => {
    initTestBed();  // required for 1p compat
    spyOn(URLUtil, 'getWSServerUrl').and.returnValue('localhost:9876');
    mockWebSocketService = new MockWebSocketService();
    mockAudioRecordingService = new MockAudioRecordingService();
    mockVideoService = new MockVideoService();
    videoContainer = new ElementRef(document.createElement('div'));

    TestBed.configureTestingModule({
      providers: [
        StreamChatService,
        {provide: WEBSOCKET_SERVICE, useValue: mockWebSocketService},
        {provide: AUDIO_RECORDING_SERVICE, useValue: mockAudioRecordingService},
        {provide: VIDEO_SERVICE, useValue: mockVideoService}
      ],
    });

    service = TestBed.inject(StreamChatService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });

  describe('startAudioChat', () => {
    it('should connect to the WebSocket server', async () => {
      await service.startAudioChat({
        appName: 'fake-app-name',
        userId: 'fake-user-id',
        sessionId: 'fake-session-id'
      });

      expect(mockWebSocketService.connect)
          .toHaveBeenCalledWith(
              'ws://localhost:9876/run_live?app_name=fake-app-name&user_id=fake-user-id&session_id=fake-session-id');
    });

    it('should start audio recording', async () => {
      await service.startAudioChat({
        appName: 'fake-app-name',
        userId: 'fake-user-id',
        sessionId: 'fake-session-id'
      });

      expect(mockAudioRecordingService.startRecording).toHaveBeenCalled();
    });

    it('should start to send buffered audio periodically', fakeAsync(() => {
         mockAudioRecordingService.getCombinedAudioBuffer.and.returnValue(
             Uint8Array.of());

         service.startAudioChat({
           appName: 'fake-app-name',
           userId: 'fake-user-id',
           sessionId: 'fake-session-id'
         });
         tick(1000);

         expect(mockWebSocketService.sendMessage).toHaveBeenCalledTimes(4);
       }));
  });

  describe('stopAudioChat', () => {
    it('should stop audio recording', () => {
      service.stopAudioChat();

      expect(mockAudioRecordingService.stopRecording).toHaveBeenCalled();
    });

    it('should close WebSocket connection', () => {
      service.stopAudioChat();

      expect(mockWebSocketService.closeConnection).toHaveBeenCalled();
    });

    it('should clear the stream to send buffered audio periodically',
       fakeAsync(() => {
         mockAudioRecordingService.getCombinedAudioBuffer.and.returnValue(
             Uint8Array.of());
         service.startAudioChat({
           appName: 'fake-app-name',
           userId: 'fake-user-id',
           sessionId: 'fake-session-id'
         });
         // This should trigger the WebScoket to send messages four times.
         tick(1000);

         service.stopAudioChat();
         // This should NOT trigger the WebScoket as the timer has already been
         // cleared.
         tick(1000);

         expect(mockWebSocketService.sendMessage).toHaveBeenCalledTimes(4);
       }));
  });

  describe('startVideoChat', () => {
    it('should connect to the WebSocket server', async () => {
      await service.startVideoChat({
        appName: 'fake-app-name',
        userId: 'fake-user-id',
        sessionId: 'fake-session-id',
        videoContainer
      });

      expect(mockWebSocketService.connect)
          .toHaveBeenCalledWith(
              'ws://localhost:9876/run_live?app_name=fake-app-name&user_id=fake-user-id&session_id=fake-session-id');
    });

    it('should start audio recording', async () => {
      await service.startVideoChat({
        appName: 'fake-app-name',
        userId: 'fake-user-id',
        sessionId: 'fake-session-id',
        videoContainer
      });

      expect(mockAudioRecordingService.startRecording).toHaveBeenCalled();
    });

    it('should start video recording', async () => {
      await service.startVideoChat({
        appName: 'fake-app-name',
        userId: 'fake-user-id',
        sessionId: 'fake-session-id',
        videoContainer
      });

      expect(mockVideoService.startRecording)
          .toHaveBeenCalledWith(videoContainer);
    });

    it('should start to send buffered audio periodically', fakeAsync(() => {
         mockAudioRecordingService.getCombinedAudioBuffer.and.returnValue(
             Uint8Array.of());

         service.startVideoChat({
           appName: 'fake-app-name',
           userId: 'fake-user-id',
           sessionId: 'fake-session-id',
           videoContainer
         });
         tick(1000);

         expect(mockWebSocketService.sendMessage).toHaveBeenCalledTimes(4);
       }));

    it('should start to send video frame periodically', fakeAsync(() => {
         mockVideoService.getCapturedFrame.and.resolveTo(Uint8Array.of());

         service.startVideoChat({
           appName: 'fake-app-name',
           userId: 'fake-user-id',
           sessionId: 'fake-session-id',
           videoContainer
         });
         tick(2000);

         expect(mockWebSocketService.sendMessage).toHaveBeenCalledTimes(2);
       }));
  });

  describe('stopVideoChat', () => {
    it('should stop audio recording', () => {
      service.stopVideoChat(videoContainer);

      expect(mockAudioRecordingService.stopRecording).toHaveBeenCalled();
    });

    it('should stop video recording', () => {
      service.stopVideoChat(videoContainer);

      expect(mockVideoService.stopRecording).toHaveBeenCalled();
    });

    it('should close WebSocket connection', () => {
      service.stopVideoChat(videoContainer);

      expect(mockWebSocketService.closeConnection).toHaveBeenCalled();
    });

    it('should clear the stream to send buffered audio periodically',
       fakeAsync(() => {
         mockAudioRecordingService.getCombinedAudioBuffer.and.returnValue(
             Uint8Array.of());
         service.startVideoChat({
           appName: 'fake-app-name',
           userId: 'fake-user-id',
           sessionId: 'fake-session-id',
           videoContainer
         });
         // This should trigger the WebScoket to send messages four times.
         tick(1000);

         service.stopVideoChat(videoContainer);
         // This should NOT trigger the WebScoket as the timer has already been
         // cleared.
         tick(1000);

         expect(mockWebSocketService.sendMessage).toHaveBeenCalledTimes(4);
       }));

    it('should clear the stream to send video frame periodically',
       fakeAsync(() => {
         mockVideoService.getCapturedFrame.and.resolveTo(Uint8Array.of());
         service.startVideoChat({
           appName: 'fake-app-name',
           userId: 'fake-user-id',
           sessionId: 'fake-session-id',
           videoContainer
         });
         // This should trigger the WebScoket to send messages twice.
         tick(2000);

         service.stopVideoChat(videoContainer);
         // This should NOT trigger the WebScoket as the timer has already been
         // cleared.
         tick(2000);

         expect(mockWebSocketService.sendMessage).toHaveBeenCalledTimes(2);
       }));
  });
});
