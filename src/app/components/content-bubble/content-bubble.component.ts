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

import { Component, EventEmitter, Input, Output, Type, inject, OnChanges, SimpleChanges, ChangeDetectorRef } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import {CommonModule} from '@angular/common';
import {FormsModule} from '@angular/forms';
import {MatIconModule} from '@angular/material/icon';
import {MatTooltipModule} from '@angular/material/tooltip';
import {CustomJsonViewerComponent} from '../custom-json-viewer/custom-json-viewer.component';

import {UiEvent} from '../../core/models/UiEvent';
import {SAFE_VALUES_SERVICE} from '../../core/services/interfaces/safevalues';
import {JsonTooltipDirective} from '../../directives/html-tooltip.directive';
import {A2uiCanvasV09Component} from '../a2ui-canvas/a2ui-canvas-v09.component';
import {A2uiCanvasComponent} from '../a2ui-canvas/a2ui-canvas.component';
import {MediaType} from '../artifact-tab/artifact-tab.component';
import {AudioPlayerComponent} from '../audio-player/audio-player.component';
import {MARKDOWN_COMPONENT, MarkdownComponentInterface} from '../markdown/markdown.component.interface';
import {ChatPanelMessagesInjectionToken} from '../chat-panel/chat-panel.component.i18n';
import { URLUtil } from '../../../utils/url-util';
import { ARTIFACT_SERVICE } from '../../core/services/interfaces/artifact';
import { base64ToArrayBuffer, pcmToWavBlob } from '../../core/utils/audio';

@Component({
  selector: 'app-content-bubble',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    MatIconModule,
    MatTooltipModule,
    CustomJsonViewerComponent,
    A2uiCanvasComponent,
    A2uiCanvasV09Component,
    AudioPlayerComponent,
    JsonTooltipDirective,
  ],
  templateUrl: './content-bubble.component.html',
  styleUrl: './content-bubble.component.scss',
  host: {
    'class': 'content-bubble-host'
  }
})
export class ContentBubbleComponent implements OnChanges {
  @Input({required: true}) uiEvent!: UiEvent;
  @Input() type: 'message' | 'output' | 'transcription' | 'thought' | 'error' = 'message';
  @Input() role: string = 'bot';
  @Input() evalStatus?: number;
  
  @Input() userEditEvalCaseMessage: string = '';

  @Output() readonly userEditEvalCaseMessageChange = new EventEmitter<string>();
  @Output() readonly handleKeydown = new EventEmitter<{event: KeyboardEvent, message: any}>();
  @Output() readonly cancelEditMessage = new EventEmitter<any>();
  @Output() readonly saveEditMessage = new EventEmitter<any>();
  
  @Output() readonly openViewImageDialog = new EventEmitter<string>();
  @Output() readonly openBase64InNewTab = new EventEmitter<{data: string, mimeType: string}>();

  protected readonly i18n = inject(ChatPanelMessagesInjectionToken);
  protected readonly sanitizer = inject(SAFE_VALUES_SERVICE);
  readonly markdownComponent: Type<MarkdownComponentInterface> = inject(MARKDOWN_COMPONENT);

  readonly MediaType = MediaType;

  renderGooglerSearch(content: string) {
    return this.sanitizer.bypassSecurityTrustHtml(content);
  }

  get rawMessageText(): string {
    const parts = this.uiEvent.event?.content?.parts;
    if (parts) {
      return parts
        .filter((part: any) => part.text)
        .map((part: any) => part.text)
        .join('');
    }
    return '';
  }

  get jsonOutputData(): any {
    if (this.uiEvent.event?.nodeInfo?.['messageAsOutput'] === true) {
      const text = this.rawMessageText;
      if (text) {
        try {
          return JSON.parse(text);
        } catch (e) {
          return null;
        }
      }
    }
    return null;
  }

  get hasAudio(): boolean {
    if (this.uiEvent.inlineData?.mediaType === MediaType.AUDIO) {
      return true;
    }
    const parts = this.uiEvent.event?.content?.parts;
    if (parts) {
      return parts.some((part: any) => part.fileData && part.fileData.mimeType && part.fileData.mimeType.startsWith('audio/'));
    }
    return false;
  }

  get noBubble(): boolean {
    // If there is text content, we always want a bubble
    if (this.uiEvent.text || this.rawMessageText) {
      return false;
    }

    if (this.uiEvent.inlineData) {
      const mediaType = this.uiEvent.inlineData.mediaType;
      if (mediaType === MediaType.AUDIO || mediaType === MediaType.IMAGE || mediaType === MediaType.VIDEO || mediaType === MediaType.TEXT) {
        return true;
      }
    }
    
    if (this.uiEvent.inlineData?.mimeType) {
      const mimeType = this.uiEvent.inlineData.mimeType;
      if (mimeType.startsWith('audio/') || mimeType.startsWith('image/') || mimeType.startsWith('video/')) {
        return true;
      }
    }

    const parts = this.uiEvent.event?.content?.parts;
    if (parts) {
      return parts.some((part: any) => 
        (part.fileData && part.fileData.mimeType && 
          (part.fileData.mimeType.startsWith('audio/') || 
           part.fileData.mimeType.startsWith('image/') || 
           part.fileData.mimeType.startsWith('video/')))
      );
    }
    return false;
  }

  protected getTextContent(dataUrl: string): string {
    if (!dataUrl) return '';
    const commaIndex = dataUrl.indexOf(',');
    if (commaIndex === -1) return '';
    const base64 = dataUrl.substring(commaIndex + 1);
    try {
      return atob(base64);
    } catch (e) {
      return 'Failed to decode text content';
    }
  }

  audioUrl: string | null = null;

  ngOnChanges(changes: SimpleChanges) {
    if (changes['uiEvent'] && this.uiEvent) {
      this.checkAndLoadAudio();
    }
  }

  private readonly http = inject(HttpClient);
  private readonly artifactService = inject(ARTIFACT_SERVICE);
  private readonly changeDetectorRef = inject(ChangeDetectorRef);

  checkAndLoadAudio() {
    const parts = this.uiEvent.event?.content?.parts;
    if (parts) {
      const audioPart = parts.find((part: any) => part.fileData && part.fileData.mimeType && part.fileData.mimeType.startsWith('audio/pcm'));
      if (audioPart && audioPart.fileData) {
        this.loadAudio(audioPart.fileData.fileUri);
      }
    }
  }

  loadAudio(uri: string) {
    if (!uri || !uri.startsWith('artifact://')) return;
    const parts = uri.substring('artifact://'.length).split('/');
    const appName = parts[0];
    const userId = parts[1];
    const sessionId = parts[2];
    const rest = parts.slice(3).join('/');
    const hashIndex = rest.indexOf('#');
    const artifactName = hashIndex !== -1 ? rest.substring(0, hashIndex) : rest;
    const versionId = hashIndex !== -1 ? rest.substring(hashIndex + 1) : '0';

    // Strip directory path if present in artifactName
    const lastSlashIndex = artifactName.lastIndexOf('/');
    const finalArtifactName = lastSlashIndex !== -1 ? artifactName.substring(lastSlashIndex + 1) : artifactName;

    this.artifactService.getLatestArtifact(userId, appName, sessionId, finalArtifactName).subscribe((response: any) => {
      let base64Data = '';
      if (response.inlineData && response.inlineData.data) {
        base64Data = response.inlineData.data;
      } else if (response.data) {
        base64Data = response.data;
      }

      if (base64Data) {
        const buffer = base64ToArrayBuffer(base64Data);
        const alignedLength = buffer.byteLength - (buffer.byteLength % 2);
        const slicedBuffer = buffer.slice(0, alignedLength);
        const sampleRate = 24000;

        const wavBlob = pcmToWavBlob(slicedBuffer, sampleRate, 1);

        const reader = new FileReader();
        reader.onloadend = () => {
          this.audioUrl = reader.result as string;
          this.changeDetectorRef.detectChanges();
        };
        reader.readAsDataURL(wavBlob);
      }
    });
  }


}
