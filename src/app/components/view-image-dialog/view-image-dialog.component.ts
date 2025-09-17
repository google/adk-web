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


import {Component, Inject, OnInit} from '@angular/core';
import {MAT_DIALOG_DATA, MatDialogRef} from '@angular/material/dialog';
import {DomSanitizer, SafeHtml, SafeUrl} from '@angular/platform-browser';

export interface ViewImageDialogData {
  imageData: string|null;
}

@Component({
    selector: 'app-view-image-dialog',
    templateUrl: './view-image-dialog.component.html',
    styleUrls: ['./view-image-dialog.component.scss'],
})
export class ViewImageDialogComponent implements OnInit {
  // Property to hold the sanitized image URL or SVG HTML
  displayContent: SafeUrl|SafeHtml|null = null;
  // Flag to determine if the content is SVG
  isSvgContent: boolean = false;

  constructor(
      public dialogRef: MatDialogRef<ViewImageDialogComponent>,
      @Inject(MAT_DIALOG_DATA) public data: ViewImageDialogData,
      private sanitizer: DomSanitizer) {}

  /**
   * Lifecycle hook to initialize the component.
   * This is used to process the image data when the dialog opens.
   */
  ngOnInit(): void {
    this.processImageData();
  }

  /**
   * Processes the input imageData to determine if it's base64 or SVG
   * and sanitizes it for display.
   */
  private processImageData(): void {
    const imageData = this.data.imageData;

    if (!imageData) {
      this.displayContent = null;
      this.isSvgContent = false;
      return;
    }

    // Check if the data looks like SVG
    if (imageData.trim().includes('<svg')) {
      this.isSvgContent = true;
      this.displayContent = this.sanitizer.bypassSecurityTrustHtml(imageData);
    } else {
      // Assume it's base64 data if not SVG.
      // Ensure it has the correct data URI prefix.
      const prefix =
          imageData.startsWith('data:image/') ? '' : 'data:image/png;base64,';
      this.isSvgContent = false;
      this.displayContent =
          this.sanitizer.bypassSecurityTrustUrl(prefix + imageData);
    }
  }

  /**
   * Closes the dialog.
   */
  close(): void {
    this.dialogRef.close();
  }
}