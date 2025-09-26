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
  startingCursorX: number;
  startingWidth: number;
}

@Directive({ selector: '[appResizableDrawer]', })
export class ResizableDrawerDirective implements AfterViewInit {
  private readonly sideDrawerMinWidth = 310;
  private sideDrawerMaxWidth = window.innerWidth / 2;
  private resizeHandle: HTMLElement|null = null;

  private resizingEvent: ResizingEvent = {
    isResizing: false,
    startingCursorX: 0,
    startingWidth: 0,
  };

  constructor(private el: ElementRef, private renderer: Renderer2) {}

  ngAfterViewInit() {
    this.sideDrawerMaxWidth = window.innerWidth / 2;
    this.resizeHandle =
        document.getElementsByClassName('resize-handler')[0] as HTMLElement;
    if (this.resizeHandle) {
      this.renderer.listen(
          this.resizeHandle, 'mousedown',
          (event) => this.onResizeHandleMouseDown(event));
    }
    document.documentElement.style.setProperty('--side-drawer-width', '570px');

    this.renderer.setStyle(
        this.el.nativeElement, 'width', 'var(--side-drawer-width)');
  }

  private onResizeHandleMouseDown(event: MouseEvent): void {
    this.resizingEvent = {
      isResizing: true,
      startingCursorX: event.clientX,
      startingWidth: this.sideDrawerWidth,
    };
    event.preventDefault();
  }

  @HostListener('document:mousemove', ['$event'])
  onMouseMove(event: MouseEvent) {
    if (!this.resizingEvent.isResizing) {
      return;
    }

    const cursorDeltaX = event.clientX - this.resizingEvent.startingCursorX;
    const newWidth = this.resizingEvent.startingWidth + cursorDeltaX;
    this.sideDrawerWidth = newWidth;
    this.renderer.addClass(document.body, 'resizing');
  }

  @HostListener('document:mouseup')
  onMouseUp() {
    this.resizingEvent.isResizing = false;
    this.renderer.removeClass(document.body, 'resizing');
  }

  @HostListener('window:resize')
  onResize() {
    this.sideDrawerMaxWidth = window.innerWidth / 2;
    this.sideDrawerWidth = this.sideDrawerWidth;
  }

  private set sideDrawerWidth(width: number) {
    const clampedWidth = Math.min(
        Math.max(width, this.sideDrawerMinWidth), this.sideDrawerMaxWidth);
    document.documentElement.style.setProperty(
        '--side-drawer-width', `${clampedWidth}px`);
  }

  private get sideDrawerWidth(): number {
    const widthString = getComputedStyle(document.documentElement)
                            .getPropertyValue('--side-drawer-width');
    const parsedWidth = parseFloat(widthString);

    return isNaN(parsedWidth) ? 500 : parsedWidth;
  }
}
