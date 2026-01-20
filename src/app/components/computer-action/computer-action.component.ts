
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
import {CommonModule} from '@angular/common';
import {Component, EventEmitter, Input, Output} from '@angular/core';
import {MatIconModule} from '@angular/material/icon';
import {MatTooltipModule} from '@angular/material/tooltip';
import {ComputerAction, ComputerTool, ComputerUseClickCall, ComputerUsePayload, isVisibleComputerUseClick, isComputerUseResponse} from '../../core/models/ComputerUse';
import {FunctionCall, FunctionResponse} from '../../core/models/types';
@Component({
  selector: 'app-computer-action',
  templateUrl: './computer-action.component.html',
  styleUrl: './computer-action.component.scss',
  standalone: true,
  imports: [
    CommonModule,
    MatIconModule,
    MatTooltipModule,
  ],
})
export class ComputerActionComponent {
  @Input() message: {functionCall?: FunctionCall; functionResponse?: FunctionResponse} = {};
  @Input() allMessages: Array<{functionCall?: FunctionCall; functionResponse?: FunctionResponse}> = [];
  @Input() index: number = 0;
  @Output() readonly clickEvent = new EventEmitter<number>();
  imageDimensions = new Map<number, {width: number; height: number}>();
  // ADK Computer uses a 1000x1000 virtual coordinate space.
  private readonly VIRTUAL_WIDTH = 1000;
  private readonly VIRTUAL_HEIGHT = 1000;

  isComputerUseResponse(): this is {message: {functionResponse: FunctionResponse & {response: ComputerUsePayload}}} {
    return isComputerUseResponse(this.message);
  }

  isComputerUseClick(): this is {message: {functionCall: ComputerUseClickCall}} {
    return isVisibleComputerUseClick(this.message);
  }

  getComputerUseScreenshot(): string {
    return this.getScreenshotFromPayload(this.message.functionResponse?.response as ComputerUsePayload);
  }

  getComputerUseUrl(): string {
    if (!this.isComputerUseResponse()) return '';
    const response = this.message.functionResponse.response;
    return response.url || '';
  }

  getPreviousComputerUseScreenshot(): string {
    for (let i = this.index - 1; i >= 0; i--) {
      const msg = this.allMessages[i];
      if (this.isMsgComputerUseResponse(msg)) {
        return this.getMsgComputerUseScreenshot(msg);
      }
    }
    return '';
  }

  getClickCoordinates(): {x: number; y: number}|null {
    if (!this.isComputerUseClick()) return null;
    const args = this.message.functionCall.args;
    if (args.coordinate) {
      return {
        x: Number(args.coordinate[0]),
        y: Number(args.coordinate[1]),
      };
    }
    if (args.x != null && args.y != null) {
      return {x: Number(args.x), y: Number(args.y)};
    }
    return null;
  }

  getActualPixelCoordinates(): {x: number; y: number; isVirtual: boolean}|null {
    const coords = this.getClickCoordinates();
    if (!coords) return null;
    const dims = this.imageDimensions.get(this.index);
    if (!dims) {
      return {...coords, isVirtual: true};
    }
    return {
      x: Math.round((coords.x / this.VIRTUAL_WIDTH) * dims.width),
      y: Math.round((coords.y / this.VIRTUAL_HEIGHT) * dims.height),
      isVirtual: false,
    };
  }

  getClickBoxStyle(): {[key: string]: string} {
    const coords = this.getClickCoordinates();
    if (!coords) {
      return {display: 'none'};
    }
    const leftPercent = (coords.x / this.VIRTUAL_WIDTH) * 100;
    const topPercent = (coords.y / this.VIRTUAL_HEIGHT) * 100;
    return {
      left: `${leftPercent}%`,
      top: `${topPercent}%`,
    };
  }

  onImageLoad(event: Event) {
    const img = event.target as HTMLImageElement;
    if (img.naturalWidth && img.naturalHeight) {
      this.imageDimensions.set(this.index, {
        width: img.naturalWidth,
        height: img.naturalHeight,
      });
    }
  }

  private isMsgComputerUseResponse(message: {functionResponse?: FunctionResponse}): message is {functionResponse: FunctionResponse & {response: ComputerUsePayload}} {
    return isComputerUseResponse(message);
  }

  private getMsgComputerUseScreenshot(message: {functionResponse: {response: ComputerUsePayload}}): string {
    return this.getScreenshotFromPayload(message.functionResponse.response);
  }

  private getScreenshotFromPayload(payload: ComputerUsePayload | undefined): string {
    const imageInfo = payload?.image;
    if (!imageInfo?.data) return '';
    const screenshot = imageInfo.data;
    if (screenshot.startsWith('data:')) return screenshot;
    const mimeType = imageInfo.mimetype || 'image/png';
    return `data:${mimeType};base64,${screenshot}`;
  }
}
