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

import {ElementRef} from '@angular/core';
import {TestBed} from '@angular/core/testing';
// 1p-ONLY-IMPORTS: import {beforeEach, describe, expect, it,}

import {initTestBed} from '../../testing/utils';

import {VideoPlayingService} from './video-playing.service';

describe('VideoPlayingService', () => {
  let service: VideoPlayingService;
  let container: ElementRef;
  let sourceBuffer: any;
  let mediaSource: any;

  /** Runs the `sourceopen` listener the service registers. */
  function openSource() {
    mediaSource.readyState = 'open';
    for (const listener of mediaSource.listeners['sourceopen'] ?? []) {
      listener();
    }
  }

  /** Fires `updateend`, which is how the service drains its queue. */
  function finishAppend() {
    sourceBuffer.updating = false;
    for (const listener of sourceBuffer.listeners['updateend'] ?? []) {
      listener();
    }
  }

  beforeEach(() => {
    initTestBed();  // required for 1p compat
    container = new ElementRef(document.createElement('div'));

    sourceBuffer = jasmine.createSpyObj(
        'SourceBuffer', ['appendBuffer', 'remove', 'addEventListener']);
    sourceBuffer.updating = false;
    sourceBuffer.listeners = {} as Record<string, Function[]>;
    sourceBuffer.buffered = {length: 0};
    sourceBuffer.addEventListener.and.callFake((type: string, fn: Function) => {
      (sourceBuffer.listeners[type] ??= []).push(fn);
    });

    mediaSource = {
      readyState: 'closed',
      listeners: {} as Record<string, Function[]>,
      addSourceBuffer: jasmine.createSpy('addSourceBuffer')
                           .and.returnValue(sourceBuffer),
      endOfStream: jasmine.createSpy('endOfStream'),
      addEventListener: (type: string, fn: any) => {
        (mediaSource.listeners[type] ??= []).push(fn);
      },
    };

    spyOn(MediaSource, 'isTypeSupported').and.returnValue(true);
    spyOn(window, 'MediaSource').and.returnValue(mediaSource);
    spyOn(URL, 'createObjectURL').and.returnValue('blob:avatar');
    spyOn(URL, 'revokeObjectURL');

    TestBed.configureTestingModule({providers: [VideoPlayingService]});
    service = TestBed.inject(VideoPlayingService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });

  it('adds a video element to the container on startPlayback', () => {
    service.startPlayback(container);

    expect(container.nativeElement.querySelector('video')).toBeTruthy();
  });

  it('holds chunks until the media source opens', () => {
    service.startPlayback(container);
    service.playVideo([Uint8Array.of(1)]);

    expect(sourceBuffer.appendBuffer).not.toHaveBeenCalled();

    openSource();

    expect(sourceBuffer.appendBuffer).toHaveBeenCalledTimes(1);
  });

  it('appends queued chunks one at a time, in order', () => {
    service.startPlayback(container);
    openSource();

    service.playVideo([Uint8Array.of(1), Uint8Array.of(2)]);

    // MediaSource rejects overlapping appends, so only the first goes out.
    expect(sourceBuffer.appendBuffer).toHaveBeenCalledTimes(1);
    expect(sourceBuffer.appendBuffer)
        .toHaveBeenCalledWith(Uint8Array.of(1) as any);

    finishAppend();

    expect(sourceBuffer.appendBuffer).toHaveBeenCalledTimes(2);
    expect(sourceBuffer.appendBuffer)
        .toHaveBeenCalledWith(Uint8Array.of(2) as any);
  });

  it('ignores an empty batch', () => {
    service.startPlayback(container);
    openSource();

    service.playVideo([]);

    expect(sourceBuffer.appendBuffer).not.toHaveBeenCalled();
  });

  it('removes the video element and drops queued chunks on stopVideo', () => {
    service.startPlayback(container);
    openSource();
    service.playVideo([Uint8Array.of(1), Uint8Array.of(2)]);

    service.stopVideo(container);

    expect(container.nativeElement.querySelector('video')).toBeNull();
    expect(URL.revokeObjectURL).toHaveBeenCalledWith('blob:avatar');

    // Queue was dropped, so a late updateend must not append anything more.
    const appendsBeforeTeardown = sourceBuffer.appendBuffer.calls.count();
    finishAppend();
    expect(sourceBuffer.appendBuffer.calls.count())
        .toBe(appendsBeforeTeardown);
  });
});
