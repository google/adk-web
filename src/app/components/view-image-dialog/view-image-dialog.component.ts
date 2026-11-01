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

import {SAFE_VALUES_SERVICE} from '../../core/services/interfaces/safevalues';
import {Component, inject, OnInit, ChangeDetectionStrategy, HostListener} from '@angular/core';
import {MAT_DIALOG_DATA, MatDialogRef} from '@angular/material/dialog';
import {SafeUrl} from '@angular/platform-browser';
import { NgStyle } from '@angular/common';

export interface ViewImageDialogData {
  imageData: string|null;
  images?: string[];
  currentIndex?: number;
  urls?: string[];
  coordinates?: ({x: number, y: number} | null)[];
}

@Component({
    standalone: true,
    changeDetection: ChangeDetectionStrategy.Default,
    selector: 'app-view-image-dialog',
    templateUrl: './view-image-dialog.component.html',
    styleUrls: ['./view-image-dialog.component.scss'],
    imports: [NgStyle]
})
export class ViewImageDialogComponent implements OnInit {
  // Property to hold the image URL, including SVG rendered as a data: URL.
  displayContent: SafeUrl|null = null;
  // Flag to determine if the content is SVG
  isSvgContent: boolean = false;
  
  images: string[] = [];
  currentIndex: number = 0;
  currentUrl: string | null = null;
  urls: string[] = [];
  coordinates: ({x: number, y: number} | null)[] = [];

  // Zoom and pan state
  scale = 1;
  translateX = 0;
  translateY = 0;
  isDragging = false;
  startX = 0;
  startY = 0;

  readonly dialogRef = inject(MatDialogRef<ViewImageDialogComponent>);
  readonly data = inject<ViewImageDialogData>(MAT_DIALOG_DATA);
  private readonly safeValuesService = inject(SAFE_VALUES_SERVICE);

  ngOnInit(): void {
    this.images = this.data.images || [];
    this.currentIndex = this.data.currentIndex || 0;
    this.urls = this.data.urls || [];
    this.coordinates = this.data.coordinates || [];
    this.updateImage();
  }

  /**
   * Updates the displayed image based on currentIndex.
   */
  updateImage(): void {
    this.scale = 1;
    this.translateX = 0;
    this.translateY = 0;
    
    let imageData = this.data.imageData;
    let url = '';
    if (this.images.length > 0) {
      imageData = this.images[this.currentIndex];
      url = this.urls[this.currentIndex] || '';
    }
    this.currentUrl = url;
    this.processImageData(imageData);
  }

  getHighlightStyle(): {[key: string]: string} {
    const coord = this.coordinates[this.currentIndex];
    if (!coord) return {};
    return {
      left: `${(coord.x / 1000) * 100}%`,
      top: `${(coord.y / 1000) * 100}%`,
    };
  }

  shouldShowHighlight(): boolean {
    return !!this.coordinates[this.currentIndex];
  }

  /**
   * Processes the input imageData into a URL that can be rendered by an <img>
   * element.
   *
   * Artifact and tool-response payloads are untrusted, so SVG markup is turned
   * into an `image/svg+xml` URL rather than injected into the page as HTML.
   * Browsers do not run scripts, event handlers or `<foreignObject>` content
   * for an SVG loaded through <img>, so a hostile artifact cannot execute in
   * the dev UI's origin.
   */
  private processImageData(imageData: string | null): void {
    if (!imageData) {
      this.displayContent = null;
      this.isSvgContent = false;
      return;
    }

    // Check if the data looks like SVG
    if (imageData.trim().includes('<svg')) {
      this.isSvgContent = true;
      // Percent-encode rather than base64 so that non-ASCII markup survives.
      this.displayContent = this.safeValuesService.bypassSecurityTrustUrl(
          `data:image/svg+xml;charset=utf-8,${encodeURIComponent(imageData)}`);
    } else {
      // Assume it's base64 data if not SVG.
      // Ensure it has the correct data URI prefix.
      const prefix =
          imageData.startsWith('data:image/') ? '' : 'data:image/png;base64,';
      this.isSvgContent = false;
      this.displayContent =
          this.safeValuesService.bypassSecurityTrustUrl(prefix + imageData);
    }
  }

  nextImage(): void {
    if (this.currentIndex < this.images.length - 1) {
      this.currentIndex++;
      this.updateImage();
    }
  }

  prevImage(): void {
    if (this.currentIndex > 0) {
      this.currentIndex--;
      this.updateImage();
    }
  }

  // Zoom and pan methods
  onWheel(event: WheelEvent): void {
    event.preventDefault();
    const zoomFactor = 0.1;
    if (event.deltaY < 0) {
      this.scale += zoomFactor;
    } else {
      this.scale = Math.max(0.5, this.scale - zoomFactor);
    }
  }

  onMouseDown(event: MouseEvent): void {
    this.isDragging = true;
    this.startX = event.clientX - this.translateX;
    this.startY = event.clientY - this.translateY;
    event.preventDefault();
  }

  onMouseMove(event: MouseEvent): void {
    if (this.isDragging) {
      this.translateX = event.clientX - this.startX;
      this.translateY = event.clientY - this.startY;
    }
  }

  onMouseUp(): void {
    this.isDragging = false;
  }

  getTransformStyle(): {[key: string]: string} {
    return {
      transform: `translate(${this.translateX}px, ${this.translateY}px) scale(${this.scale})`,
      transformOrigin: 'center',
      cursor: this.isDragging ? 'grabbing' : 'grab',
      transition: this.isDragging ? 'none' : 'transform 0.1s ease'
    };
  }

  @HostListener('window:keydown', ['$event'])
  handleKeyDown(event: KeyboardEvent) {
    if (event.key === 'ArrowLeft') {
      this.prevImage();
    } else if (event.key === 'ArrowRight') {
      this.nextImage();
    }
  }

  /**
   * Closes the dialog.
   */
  close(): void {
    this.dialogRef.close();
  }
}
