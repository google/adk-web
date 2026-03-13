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
import {Component, input, ElementRef, ViewChild} from '@angular/core';
import {MarkdownModule, provideMarkdown, MarkdownService} from 'ngx-markdown';
import { MatIconModule } from '@angular/material/icon';
import { MatTooltipModule } from '@angular/material/tooltip';
import { MatSnackBar } from '@angular/material/snack-bar';
// 1. Add Spinner Module
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import jsPDF from 'jspdf';
import html2canvas from 'html2canvas';

/**
 * Renders markdown text.
 */
@Component({
  selector: 'app-markdown',
  templateUrl: './markdown.component.html',
  standalone: true,
  imports: [
    CommonModule,
    MarkdownModule,
    MatIconModule,
    MatTooltipModule,
    MatProgressSpinnerModule // 2. Add to imports
  ],
  providers: [
    provideMarkdown(),
  ],
})
export class MarkdownComponent {
  text = input('');
  thought = input(false);

  @ViewChild('markdownContent', { static: false, read: ElementRef }) markdownElement!: ElementRef;

  // 3. Add state trackers
  pdfState: 'idle' | 'loading' | 'success' = 'idle';
  copyState: 'idle' | 'success' = 'idle';

  constructor(
    private snackBar: MatSnackBar,
    private markdownService: MarkdownService
  ) {}

  copyToClipboard() {
    const content = this.text();
    navigator.clipboard.writeText(content).then(() => {
      
      // 4. Update UI state to Success
      this.copyState = 'success';
      
      this.snackBar.open('Copied raw Markdown to clipboard', 'Close', {
        duration: 3000,
        horizontalPosition: 'center',
        verticalPosition: 'bottom'
      });

      // Reset back to normal after 2 seconds
      setTimeout(() => {
        this.copyState = 'idle';
      }, 2000);

    }).catch(err => {
      console.error('Failed to copy:', err);
    });
  }

  // FIXED: Added 'async' keyword
  // 3. Updated Download PDF function
  async downloadPdf() {
    // 5. Start Loading
    this.pdfState = 'loading';

    const content = this.text();
    
    // A. Convert Markdown -> HTML
    const rawHtml = await this.markdownService.parse(content);

    // B. Create a temporary container
    const tempDiv = document.createElement('div');
    tempDiv.innerHTML = rawHtml;
    
    // C. Apply CSS for PDF rendering
    // CRITICAL FIX: Use fixed position + z-index instead of top: -9999px
    tempDiv.style.position = 'fixed';
    tempDiv.style.top = '0';
    tempDiv.style.left = '0';
    tempDiv.style.zIndex = '-9999'; 
    
    tempDiv.style.width = '750px'; 
    tempDiv.style.padding = '20px';
    tempDiv.style.backgroundColor = '#ffffff'; 
    tempDiv.style.color = '#000000'; 
    tempDiv.style.fontFamily = 'Arial, sans-serif';
    tempDiv.style.fontSize = '12px';
    
    document.body.appendChild(tempDiv);

    // D. Generate PDF
    const doc = new jsPDF('p', 'pt', 'a4');
    
    doc.html(tempDiv, {
      callback: (pdf) => {
        pdf.save('response.pdf');
        document.body.removeChild(tempDiv);
        
        // 6. Update UI state to Success
        this.pdfState = 'success';
        
        this.snackBar.open('PDF Downloaded!', 'Close', { duration: 3000 });

        // Reset back to normal after 2 seconds
        setTimeout(() => {
          this.pdfState = 'idle';
        }, 2000);
      },
      x: 10,
      y: 10,
      width: 550, 
      windowWidth: 800 
    });
  }
}