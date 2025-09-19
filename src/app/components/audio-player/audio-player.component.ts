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

import {Component, ElementRef, input, OnChanges, SimpleChanges, viewChild} from '@angular/core';

@Component({
    selector: 'app-audio-player',
    templateUrl: './audio-player.component.html',
    styleUrls: ['./audio-player.component.scss'],
})
export class AudioPlayerComponent implements OnChanges {
  base64data = input<string>('');
  audioPlayerRef = viewChild<ElementRef<HTMLAudioElement>>('audioPlayer');

  audioSrc: string = '';

  constructor() {}

  ngOnChanges(changes: SimpleChanges): void {
    if (changes['base64data'] && this.base64data()) {
      this.setAudioSource(this.base64data());
    }
  }

  private setAudioSource(base64: string): void {
    // Check if the base64 data already has the 'data:audio/mpeg;base64,' prefix
    // You might want to adjust the MIME type based on your actual audio data
    // (e.g., audio/wav, audio/ogg)
    if (base64.startsWith('data:')) {
      this.audioSrc = base64;
    } else {
      // Assuming it's MP3 data, adjust if necessary
      this.audioSrc = `data:audio/mpeg;base64,${base64}`;
    }

    // If the audio element is already rendered, load the new source
    if (this.audioPlayerRef() && this.audioPlayerRef()!.nativeElement) {
      this.audioPlayerRef()!.nativeElement.load();  // Reload the audio element
    }
  }

  // Optional: Methods to control playback from parent component (e.g., a play
  // button)
  play(): void {
    if (this.audioPlayerRef() && this.audioPlayerRef()!.nativeElement) {
      this.audioPlayerRef()!.nativeElement.play();
    }
  }

  pause(): void {
    if (this.audioPlayerRef() && this.audioPlayerRef()!.nativeElement) {
      this.audioPlayerRef()!.nativeElement.pause();
    }
  }

  stop(): void {
    if (this.audioPlayerRef() && this.audioPlayerRef()!.nativeElement) {
      this.audioPlayerRef()!.nativeElement.pause();
      this.audioPlayerRef()!.nativeElement.currentTime = 0;
    }
  }
}