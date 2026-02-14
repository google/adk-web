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

import {Component, Input} from '@angular/core';
import {DomSanitizer, SafeHtml} from '@angular/platform-browser';

@Component({
  selector: 'app-json-tooltip',
  template: `<div [innerHTML]="formattedJson"></div>`,
  styles: [`
    :host {
      display: block;
      font-family: 'Courier New', monospace;
      font-size: 12px;
      line-height: 1.4;
      white-space: pre-wrap;
      max-width: 800px;
    }
  `],
  standalone: true,
})
export class JsonTooltipComponent {
  @Input() set json(value: string) {
    this.formattedJson = this.syntaxHighlight(value);
  }

  formattedJson: SafeHtml = '';

  constructor(private sanitizer: DomSanitizer) {}

  private syntaxHighlight(json: string): SafeHtml {
    if (!json) return '';

    try {
      // Parse and re-stringify to ensure valid JSON
      const obj = JSON.parse(json);
      json = JSON.stringify(obj, null, 0);
    } catch (e) {
      // If not valid JSON, just return the string
      return this.sanitizer.bypassSecurityTrustHtml(this.escapeHtml(json));
    }

    // Syntax highlight the JSON
    json = json.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
    json = json.replace(
      /("(\\u[a-zA-Z0-9]{4}|\\[^u]|[^\\"])*"(\s*:)?|\b(true|false|null)\b|-?\d+(?:\.\d*)?(?:[eE][+\-]?\d+)?)/g,
      (match) => {
        let cls = 'json-number';
        if (/^"/.test(match)) {
          if (/:$/.test(match)) {
            cls = 'json-key';
          } else {
            cls = 'json-string';
          }
        } else if (/true|false/.test(match)) {
          cls = 'json-boolean';
        } else if (/null/.test(match)) {
          cls = 'json-null';
        }
        return '<span class="' + cls + '">' + match + '</span>';
      }
    );

    return this.sanitizer.bypassSecurityTrustHtml(json);
  }

  private escapeHtml(text: string): string {
    return text
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#039;');
  }
}
