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

import {AfterViewInit, Component, ElementRef, Input} from '@angular/core';
import {createJSONEditor, Mode} from 'vanilla-jsoneditor';

@Component({
    selector: 'app-json-editor',
    templateUrl: './json-editor.component.html',
    styleUrls: ['./json-editor.component.scss'],
})
export class JsonEditorComponent implements AfterViewInit {
  @Input({ required: true }) jsonString: any;

  private editor: any = null;

  constructor(private el: ElementRef) {}

  ngAfterViewInit(): void {
    let content = {
      text: this.jsonString,
    };
    setTimeout(() => {
      this.editor = createJSONEditor({
        target: document.getElementById('json-editor') as Element,
        props: {
          content,
          mode: Mode.text,
          mainMenuBar: false,
          statusBar: false,
        },
      });
    })
  }

  getJsonString(): string {
    return this.editor?.get().text;
  }
}
