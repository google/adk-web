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

import {
  AfterViewInit,
  Component,
  ElementRef,
  EventEmitter,
  Input,
  OnDestroy,
  Output,
  ViewChild,
} from '@angular/core';
import {HighlightStyle, syntaxHighlighting, syntaxTree} from '@codemirror/language';
import {python} from '@codemirror/lang-python';
import {tags} from '@lezer/highlight';
import {Diagnostic, linter, lintGutter} from '@codemirror/lint';
import {EditorState} from '@codemirror/state';
import {EditorView} from '@codemirror/view';
import {basicSetup} from 'codemirror';

/** A dark theme for the Python syntax highlighting. */
const pythonDarkHighlightStyle = HighlightStyle.define([
  {tag: tags.keyword, color: '#c678dd'},
  {tag: [tags.name, tags.deleted, tags.character, tags.propertyName, tags.macroName], color: '#e06c75'},
  {tag: [tags.function(tags.variableName), tags.labelName], color: '#61afef'},
  {tag: [tags.color, tags.constant(tags.name), tags.standard(tags.name)], color: '#d19a66'},
  {tag: [tags.definition(tags.name), tags.separator], color: '#abb2bf'},
  {tag: [tags.typeName, tags.className, tags.number, tags.changed, tags.annotation, tags.modifier, tags.self, tags.namespace], color: '#d19a66'},
  {tag: [tags.operator, tags.operatorKeyword, tags.url, tags.escape, tags.regexp, tags.link, tags.special(tags.string)], color: '#56b6c2'},
  {tag: [tags.meta, tags.comment], color: '#7f848e', fontStyle: 'italic'},
  {tag: tags.strong, fontWeight: 'bold'},
  {tag: tags.emphasis, fontStyle: 'italic'},
  {tag: tags.strikethrough, textDecoration: 'line-through'},
  {tag: tags.link, color: '#7f848e', textDecoration: 'underline'},
  {tag: tags.heading, fontWeight: 'bold', color: '#e06c75'},
  {tag: [tags.atom, tags.bool, tags.special(tags.variableName)], color: '#d19a66' },
  {tag: [tags.processingInstruction, tags.string, tags.inserted], color: '#98c379'},
  {tag: tags.invalid, color: '#ffffff'},
]);

/** A dark theme for the editor chrome (gutters, background, etc.). */
const pythonEditorTheme = EditorView.theme({
  '&': {
    color: '#abb2bf',
    backgroundColor: '#21252b'
  },
  '.cm-content': {caretColor: '#528bff'},
  '&.cm-focused .cm-cursor': {borderLeftColor: '#528bff'},
  '&.cm-focused .cm-selectionBackground, ::selection': {backgroundColor: '#3a3f4b'},
  '.cm-gutters': {backgroundColor: '#21252b', color: '#6a737d', border: 'none'},
  '.cm-activeLineGutter': {backgroundColor: '#2b2b2f'},
  '.cm-activeLine': {backgroundColor: '#2b2b2f'},
}, {dark: true});

const pythonLinter = linter((view) => {
  // Don't show syntax errors for an empty editor.
  if (view.state.doc.length === 0) {
    return [];
  }
  const diagnostics: Diagnostic[] = [];
  syntaxTree(view.state).iterate({
    enter: (node) => {
      if (node.type.isError) {
        diagnostics.push({
          from: node.from,
          to: node.to,
          severity: 'error',
          message: 'Syntax error',
        });
      }
    },
  });
  return diagnostics;
});

@Component({
  selector: 'app-code-editor',
  templateUrl: './code-editor.component.html',
  styleUrls: ['./code-editor.component.scss'],
})
export class CodeEditorComponent implements AfterViewInit, OnDestroy {
  @ViewChild('editor') editorEl!: ElementRef<HTMLDivElement>;
  @Input() code = '';
  @Output() codeChange = new EventEmitter<string>();

  private view?: EditorView;

  ngAfterViewInit() {
    const state = EditorState.create({
      doc: this.code,
      extensions: [
        basicSetup,
        python(),
        lintGutter(),
        pythonLinter,
        pythonEditorTheme,
        syntaxHighlighting(pythonDarkHighlightStyle, {fallback: true}),
        EditorView.updateListener.of((update) => {
          if (update.docChanged) {
            this.code = update.state.doc.toString();
            this.codeChange.emit(this.code);
          }
        }),
      ],
    });

    this.view = new EditorView({
      state,
      parent: this.editorEl.nativeElement,
    });
  }

  ngOnDestroy() {
    this.view?.destroy();
  }
}
