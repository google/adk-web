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

import {ElementRef, InjectionToken} from '@angular/core';
import {Observable} from 'rxjs';

export const STREAM_CHAT_SERVICE =
  new InjectionToken<StreamChatService>('StreamChatService');

/**
 * Service for supporting live streaming with audio/video.
 */
export declare abstract class StreamChatService {
  abstract startAudioChat(options: {
    appName: string;
    userId: string;
    sessionId: string;
  }): Promise<void>;
  abstract stopAudioChat(): void;
  abstract startVideoChat(options: {
    appName: string;
    userId: string;
    sessionId: string;
    videoContainer: ElementRef;
  }): Promise<void>;
  abstract stopVideoChat(videoContainer: ElementRef): void;
  abstract onStreamClose(): Observable<string>;
  abstract closeStream(): void;
}
