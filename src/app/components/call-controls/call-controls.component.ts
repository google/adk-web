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

import {Component, EventEmitter, HostBinding, Input, Output, inject} from '@angular/core';
import {CommonModule} from '@angular/common';
import {MatButtonModule} from '@angular/material/button';
import {MatIconModule} from '@angular/material/icon';
import {MatTooltipModule} from '@angular/material/tooltip';
import {ChatPanelMessagesInjectionToken} from '../chat-panel/chat-panel.component.i18n';

@Component({
  selector: 'app-call-controls',
  standalone: true,
  imports: [CommonModule, MatButtonModule, MatIconModule, MatTooltipModule],
  templateUrl: './call-controls.component.html',
  styleUrl: './call-controls.component.scss',
})
export class CallControlsComponent {
  @HostBinding('class.in-call') get inCall() {
    return this.isAudioRecording;
  }

  @Input() isAudioRecording = false;
  @Input() isVideoRecording = false;
  @Input() micVolume = 0;
  @Input() isBidiStreamingEnabled: boolean | null = false;
  @Input() disabled = false;

  @Output() readonly toggleAudioRecording = new EventEmitter<void>();
  @Output() readonly toggleVideoRecording = new EventEmitter<void>();

  protected readonly i18n = inject(ChatPanelMessagesInjectionToken);

  onCallClick() {
    this.toggleAudioRecording.emit();
  }
}
