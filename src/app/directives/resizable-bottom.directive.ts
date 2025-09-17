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

import {AfterViewInit, Directive, ElementRef, HostListener, Renderer2} from '@angular/core';

interface ResizingEvent {
  isResizing: boolean;
  startingCursorY: number;
  startingHeight: number;
}

@Directive({ selector: '[appResizableBottomPanel]', })
export class ResizableBottomDirective implements AfterViewInit {
  private readonly bottomMinHeight = 310;
  private bottomMaxHeight;
  private resizeHandle: HTMLElement|null = null;

  private resizingEvent: ResizingEvent = {
    isResizing: false,
    startingCursorY: 0,
    startingHeight: 0,
  };

  constructor(private el: ElementRef, private renderer: Renderer2) {
    this.bottomMaxHeight = window.innerHeight;
  }

  ngAfterViewInit() {
    this.resizeHandle =
        document.getElementsByClassName('bottom-resize-handler')[0] as HTMLElement;
    this.renderer.listen(
        this.resizeHandle, 'mousedown',
        (event) => this.onResizeHandleMouseDown(event));
    document.documentElement.style.setProperty('--bottom-panel-height', '310px');

    this.renderer.setStyle(
        this.el.nativeElement, 'height', 'var(--bottom-panel-height)');
  }

  private onResizeHandleMouseDown(event: MouseEvent): void {
    this.resizingEvent = {
      isResizing: true,
      startingCursorY: event.clientY,
      startingHeight: this.bottomPanelHeight,
    };
    event.preventDefault();
  }

  @HostListener('document:mousemove', ['$event'])
  onMouseMove(event: MouseEvent) {
    if (!this.resizingEvent.isResizing) {
      return;
    }
    const cursorDeltaY = this.resizingEvent.startingCursorY - event.clientY;
    const newHeight = this.resizingEvent.startingHeight + cursorDeltaY;
    this.bottomPanelHeight = newHeight;
    this.renderer.addClass(document.body, 'resizing');
  }

  @HostListener('document:mouseup')
  onMouseUp() {
    this.resizingEvent.isResizing = false;
    this.renderer.removeClass(document.body, 'resizing');
  }

  @HostListener('window:resize')
  onResize() {
    this.bottomMaxHeight = window.innerHeight / 2;
    this.bottomPanelHeight = this.bottomPanelHeight;
  }

  private set bottomPanelHeight(height: number) {
    const clampedHeight = Math.min(
        Math.max(height, this.bottomMinHeight), this.bottomMaxHeight);
    document.body.style.setProperty('--bottom-panel-height', `${clampedHeight}px`);
  }

  private get bottomPanelHeight(): number {
    const heightString =
        getComputedStyle(document.body).getPropertyValue('--bottom-panel-height');
    const parsedHeight = parseInt(heightString, 10);

    return isNaN(parsedHeight) ? 500 : parsedHeight;
  }
}
