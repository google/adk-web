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
import {ChangeDetectionStrategy, Component, input, ElementRef, effect, OnInit, Optional} from '@angular/core';
import {ChatPanelComponent} from '../chat-panel/chat-panel.component';
import {MarkdownModule, provideMarkdown} from 'ngx-markdown';
import mermaid from 'mermaid';

import 'prismjs';
import 'prismjs/components/prism-javascript';
import 'prismjs/components/prism-typescript';
import 'prismjs/components/prism-css';
import 'prismjs/components/prism-json';
import 'prismjs/components/prism-bash';
import 'prismjs/components/prism-python';
import 'prismjs/components/prism-yaml';


/**
 * Renders markdown text.
 */
@Component({
  changeDetection: ChangeDetectionStrategy.Default,
  selector: 'app-markdown',
  templateUrl: './markdown.component.html',
  standalone: true,
  imports: [
    CommonModule,
    MarkdownModule,
  ],
  providers: [
    provideMarkdown(),
  ],
  styles: [`
    .mermaid-container {
      display: flex;
      justify-content: center;
      margin: 16px 0;
    }
    .mermaid {
      font-size: 12px !important;
    }
    .mermaid svg {
      max-width: 100%;
      height: auto;
    }
    ::ng-deep .copy-code-button {
      position: absolute;
      top: 4px;
      right: 4px;
      z-index: 10;
      display: flex;
      align-items: center;
      justify-content: center;
      width: 28px;
      height: 28px;
      padding: 0;
      border-radius: 4px;
      background-color: var(--mat-sys-surface-container-high) !important;
      color: var(--mat-sys-on-surface-variant);
      border: none;
      cursor: pointer;
      opacity: 0;
      transition: opacity 0.2s ease-in-out, background-color 0.2s ease-in-out, color 0.2s ease-in-out;
    }
    ::ng-deep pre:hover .copy-code-button {
      opacity: 1;
    }
    ::ng-deep .copy-code-button:hover {
      background-color: var(--mat-sys-secondary-container) !important;
      color: var(--mat-sys-on-secondary-container) !important;
    }
    ::ng-deep .copy-code-button:active {
      transform: scale(0.95);
    }
    ::ng-deep .copy-code-button.copied {
      color: #81c784 !important;
      background-color: rgba(76, 175, 80, 0.15) !important;
      opacity: 1;
    }
    ::ng-deep pre:not(:hover) .copy-code-button.copied,
    ::ng-deep code:not(pre code):not(:hover) .copy-code-button.copied {
      opacity: 0 !important;
      transition: none !important;
    }
    ::ng-deep .copy-code-button svg {
      width: 16px;
      height: 16px;
    }
    ::ng-deep .run-code-button {
      position: absolute;
      top: 4px;
      right: 4px;
      z-index: 10;
      display: flex;
      align-items: center;
      justify-content: center;
      width: 28px;
      height: 28px;
      padding: 0;
      border-radius: 4px;
      background-color: var(--mat-sys-surface-container-high) !important;
      color: var(--mat-sys-on-surface-variant);
      border: none;
      cursor: pointer;
      opacity: 0;
      transition: opacity 0.2s ease-in-out, background-color 0.2s ease-in-out, color 0.2s ease-in-out;
    }
    ::ng-deep .run-code-button:hover {
      background-color: var(--mat-sys-primary-container) !important;
      color: var(--mat-sys-on-primary-container) !important;
    }
    ::ng-deep .run-code-button:active {
      transform: scale(0.95);
    }
    ::ng-deep .run-code-button svg {
      width: 16px;
      height: 16px;
    }
    ::ng-deep code:not(pre code) {
      display: inline-block;
      position: relative;
      padding: 0 4px;
      background-color: var(--mat-sys-surface-container-high);
      vertical-align: top;
    }
    ::ng-deep code:not(pre code).runnable:hover {
      padding-right: 68px !important;
    }
    ::ng-deep code:not(pre code) .copy-code-button {
      position: absolute;
      top: 50%;
      right: 2px;
      transform: translateY(-50%);
      width: 28px;
      height: 28px;
      opacity: 0;
      transition: none !important;
    }
    ::ng-deep code:not(pre code):hover .copy-code-button {
      opacity: 1;
    }
    ::ng-deep code:not(pre code).runnable:hover .copy-code-button {
      right: 32px !important;
    }
    ::ng-deep code:not(pre code) .copy-code-button:active {
      transform: translateY(-50%) !important;
    }
    ::ng-deep code:not(pre code) .run-code-button {
      position: absolute;
      top: 50%;
      right: 2px;
      transform: translateY(-50%);
      width: 28px;
      height: 28px;
      opacity: 0;
      transition: none !important;
    }
    ::ng-deep code:not(pre code).runnable:hover .run-code-button {
      opacity: 1;
    }
    ::ng-deep code:not(pre code) .run-code-button:active {
      transform: translateY(-50%) !important;
    }
  `]
})
export class MarkdownComponent implements OnInit {
  text = input('');
  thought = input(false);
  isReadme = input(false);

  constructor(
    private elementRef: ElementRef,
    @Optional() private chatPanel: ChatPanelComponent
  ) {
    effect(() => {
      const _ = this.text();
      setTimeout(() => {
        this.renderMermaid();
        this.addCopyButtons();
      }, 100);
    });
  }

  ngOnInit() {
    mermaid.initialize({
      startOnLoad: false,
      flowchart: {
        useMaxWidth: true,
        htmlLabels: true,
        curve: 'basis',
      },
      theme: 'neutral',
      themeVariables: {
        fontSize: '12px',
        primaryColor: '#e8f0fe',
        primaryTextColor: '#1a73e8',
        primaryBorderColor: '#1a73e8',
        lineColor: '#5f6368',
        secondaryColor: '#f1f3f4',
        tertiaryColor: '#ffffff',
      }
    });
  }

  openExternalLinksInNewTab() {
    // Run after each sanitized render, including streamed message updates.
    const container: HTMLElement = this.elementRef.nativeElement;
    container.querySelectorAll<HTMLAnchorElement>('a[href]').forEach((link) => {
      if (/^https?:\/\//i.test(link.getAttribute('href') || '')) {
        link.target = '_blank';
        link.relList.add('noopener', 'noreferrer');
      }
    });
  }

  private renderMermaid() {
    const container = this.elementRef.nativeElement;
    const codeElements = container.querySelectorAll('pre code.language-mermaid');
    
    let needsRun = false;
    codeElements.forEach((codeEl: HTMLElement) => {
      const preEl = codeEl.parentElement;
      if (preEl) {
        const graphDefinition = codeEl.textContent || '';
        const div = document.createElement('div');
        div.classList.add('mermaid');
        div.textContent = graphDefinition.trim();
        
        const wrapper = document.createElement('div');
        wrapper.classList.add('mermaid-container');
        wrapper.appendChild(div);
        
        preEl.parentNode?.replaceChild(wrapper, preEl);
        needsRun = true;
      }
    });
    
    if (needsRun) {
      mermaid.run();
    }
  }

  private addCopyButtons() {
    const container = this.elementRef.nativeElement;
    
    // Handle block pre elements
    const preElements = container.querySelectorAll('pre');
    preElements.forEach((preEl: HTMLElement) => {
      if (preEl.querySelector('.copy-code-button') || preEl.closest('.mermaid-container')) {
        return;
      }
      
      preEl.style.position = 'relative';
      this.createCopyButton(preEl, preEl.querySelector('code') || preEl);
    });

    // Handle inline code elements or headings to track section context
    let currentHeading = '';
    const allElements = container.querySelectorAll('*');
    allElements.forEach((el: HTMLElement) => {
      if (/^H[1-6]$/.test(el.tagName)) {
        currentHeading = el.textContent || '';
      } else if (el.tagName === 'CODE') {
        const codeEl = el;
        // Skip if it is inside a pre tag or has a copy button already or is mermaid
        if (codeEl.closest('pre') || codeEl.querySelector('.copy-code-button') || codeEl.closest('.mermaid-container')) {
          return;
        }
        
        // If it is the readme.md showing in the chat and under 'Sample Inputs' section, show copy and run buttons
        if (this.isReadme() && currentHeading.toLowerCase().includes('sample inputs')) {
          codeEl.style.position = 'relative';
          this.createCopyButton(codeEl, codeEl);
          codeEl.classList.add('runnable');
          this.createRunButton(codeEl, codeEl);
        }
      }
    });
  }

  private createCopyButton(parentEl: HTMLElement, textEl: HTMLElement) {
    const button = document.createElement('button');
    button.className = 'copy-code-button';
    button.setAttribute('aria-label', 'Copy code');
    button.type = 'button';
    
    const copyIcon = `
      <svg xmlns="http://www.w3.org/2000/svg" height="18px" viewBox="0 -960 960 960" width="18px" fill="currentColor">
        <path d="M360-240q-33 0-56.5-23.5T280-320v-480q0-33 23.5-56.5T360-880h360q33 0 56.5 23.5T800-800v480q0-33-23.5-56.5T720-240H360Zm0-80h360v-480H360v480ZM200-80q-33 0-56.5-23.5T120-160v-560h80v560h440v80H200Zm160-240v-480 480Z"/>
      </svg>
    `;
    
    const checkIcon = `
      <svg xmlns="http://www.w3.org/2000/svg" height="18px" viewBox="0 -960 960 960" width="18px" fill="currentColor">
        <path d="M382-240 154-468l57-57 171 171 367-367 57 57-424 424Z"/>
      </svg>
    `;
    
    button.innerHTML = copyIcon;
    
    button.addEventListener('click', (e) => {
      e.stopPropagation();
      const textToCopy = (textEl.textContent || '').trim();
      
      navigator.clipboard.writeText(textToCopy).then(() => {
        button.innerHTML = checkIcon;
        button.classList.add('copied');
        
        setTimeout(() => {
          button.innerHTML = copyIcon;
          button.classList.remove('copied');
        }, 2000);
      }).catch(err => {
        console.error('Failed to copy text: ', err);
      });
    });
    
    parentEl.appendChild(button);
  }

  private createRunButton(parentEl: HTMLElement, textEl: HTMLElement) {
    if (parentEl.querySelector('.run-code-button')) {
      return;
    }

    const button = document.createElement('button');
    button.className = 'run-code-button';
    button.setAttribute('aria-label', 'Run sample input');
    button.type = 'button';
    
    const runIcon = `
      <svg xmlns="http://www.w3.org/2000/svg" height="18px" viewBox="0 -960 960 960" width="18px" fill="currentColor">
        <path d="M320-203v-554l440 277-440 277Z"/>
      </svg>
    `;
    
    button.innerHTML = runIcon;
    
    button.addEventListener('click', (e) => {
      e.stopPropagation();
      const codeText = (textEl.textContent || '').trim();
      
      // Run the sample input
      if (this.chatPanel) {
        this.chatPanel.userInput = codeText;
        this.chatPanel.userInputChange.emit(codeText);
        setTimeout(() => {
          this.chatPanel.sendMessage.emit(new Event('submit'));
        }, 50);
      }
    });
    
    parentEl.appendChild(button);
  }
}
