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

import {ElementRef, signal} from '@angular/core';
import {ComponentFixture, TestBed} from '@angular/core/testing';


import {AudioPlayerComponent} from './audio-player.component';

// Mock the HTMLAudioElement for testing purposes
// This prevents actual audio playback during tests and allows spying on
// methods.
class MockHTMLAudioElement {
  src: string = '';
  currentTime: number = 0;

  // Spies will be attached to these methods
  play = jasmine.createSpy('play').and.returnValue(Promise.resolve());
  pause = jasmine.createSpy('pause');
  load = jasmine.createSpy('load');
}

describe('AudioPlayerComponent', () => {
  let component: AudioPlayerComponent;
  let fixture: ComponentFixture<AudioPlayerComponent>;
  let mockAudioElement: MockHTMLAudioElement;

  beforeEach(async () => {
    // Create an instance of our mock audio element
    mockAudioElement = new MockHTMLAudioElement();

    await TestBed.configureTestingModule({
    imports: [AudioPlayerComponent],
}).compileComponents();
  });

  beforeEach(() => {
    fixture = TestBed.createComponent(AudioPlayerComponent);
    component = fixture.componentInstance;
    // Manually assign the mock element to the component's audioPlayerRef after
    // initialization.
    (component as any).audioPlayerRef = signal(new ElementRef(mockAudioElement as any));
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  // Test case 1: Input without 'data:' prefix
  it('should prepend "data:audio/mpeg;base64," prefix if missing', () => {
    const rawBase64 = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
    fixture.componentRef.setInput('base64data', rawBase64);
    fixture.detectChanges();

    expect(component.audioSrc).toBe(
      'data:audio/mpeg;base64,ABCDEFGHIJKLMNOPQRSTUVWXYZ'
    );
    expect(mockAudioElement.load).toHaveBeenCalled(); // Ensure load is called on source change
  });

  // Test case 2: Input with 'data:' prefix
  it('should use base64 data as-is if "data:" prefix is present', () => {
    const prefixedBase64 = 'data:audio/wav;base64,1234567890';
    fixture.componentRef.setInput('base64data', prefixedBase64);
    fixture.detectChanges();

    expect(component.audioSrc).toBe(prefixedBase64);
    expect(mockAudioElement.load).toHaveBeenCalled(); // Ensure load is called on source change
  });

  // Test case 3: Input is empty or null initially
  it('should not set audioSrc if base64data is empty', () => {
    fixture.componentRef.setInput('base64data', ''); // Ensure it's empty
    fixture.detectChanges();

    expect(component.audioSrc).toBe('');
    expect(mockAudioElement.load).not.toHaveBeenCalled(); // load should not be called if no data
  });

  // Test case 4: Play method
  it('should call play() on the native audio element when play() is invoked', () => {
    fixture.componentRef.setInput('base64data', 'test_base64');
    fixture.detectChanges(); // Update audioSrc and load
    mockAudioElement.load.calls.reset(); // Reset load spy for this test to focus on play

    component.play();
    expect(mockAudioElement.play).toHaveBeenCalled();
  });

  // Test case 5: Pause method
  it('should call pause() on the native audio element when pause() is invoked', () => {
    fixture.componentRef.setInput('base64data', 'test_base64');
    fixture.detectChanges();
    mockAudioElement.load.calls.reset();

    component.pause();
    expect(mockAudioElement.pause).toHaveBeenCalled();
  });

  // Test case 6: Stop method
  it('should call pause() and reset currentTime to 0 on the native audio element when stop() is invoked', () => {
    fixture.componentRef.setInput('base64data', 'test_base64');
    fixture.detectChanges();
    mockAudioElement.load.calls.reset();

    mockAudioElement.currentTime = 30; // Simulate audio playing for 30 seconds
    component.stop();

    expect(mockAudioElement.pause).toHaveBeenCalled();
    expect(mockAudioElement.currentTime).toBe(0); // Ensure currentTime is reset
  });

  // Test case 7: ensure audioPlayerRef is accessible after init
  it('should have audioPlayerRef defined after initialization', () => {
    expect(component.audioPlayerRef()).toBeDefined();
    expect(component.audioPlayerRef()!.nativeElement).toBe(mockAudioElement as any);
  });
});
