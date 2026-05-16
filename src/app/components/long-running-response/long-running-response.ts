/**
 * @license
 * Copyright 2026 Google LLC
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

import {ChangeDetectionStrategy, ChangeDetectorRef, Component, EventEmitter, inject, Input, OnChanges, Output, SimpleChanges} from '@angular/core';
import {FormsModule} from '@angular/forms';
import {NgxJsonViewerModule} from 'ngx-json-viewer';
import {MatButton, MatIconButton} from '@angular/material/button';
import {MatIcon} from '@angular/material/icon';



    import {AgentRunRequest} from '../../core/models/AgentRunRequest';
    import {MarkdownComponent} from '../markdown/markdown.component';



@Component({
  changeDetection: ChangeDetectionStrategy.Default,
  selector: 'app-long-running-response',
  templateUrl: './long-running-response.html',
  styleUrl: './long-running-response.scss',
  imports: [
    FormsModule,
    MatIconButton,
    MatButton,
    MatIcon,
    NgxJsonViewerModule,
    MarkdownComponent,
  ],
})
export class LongRunningResponseComponent implements OnChanges {
  @Input() functionCall: any;
  @Input() appName!: string;
  @Input() userId!: string;
  @Input() sessionId!: string;

  @Output() responseComplete = new EventEmitter<any>();

  formModel: any = {};
  formFields: any[] = [];
  activeTab: string = 'form';
  formModelJson: string = '';

  confirmationModel = {
    confirmed: false,
    payload: ''
  };

  get isConfirmationRequest(): boolean {
    return this.functionCall?.name === 'adk_request_confirmation';
  }

  private readonly cdr = inject(ChangeDetectorRef);

  ngOnChanges(changes: SimpleChanges) {
    if (changes['functionCall']) {
      this.initForm();
    }
  }

  initForm() {
    this.formModel = {};
    this.formFields = [];
    
    if (this.isConfirmationRequest) {
      this.confirmationModel.confirmed = this.functionCall.args?.toolConfirmation?.confirmed || false;
      this.confirmationModel.payload = JSON.stringify(this.functionCall.args?.originalFunctionCall?.args || {}, null, 2);
      return;
    }

    const schema = this.functionCall?.args?.response_schema;
    if (schema && schema.type === 'object' && schema.properties) {
      for (const key of Object.keys(schema.properties)) {
        const prop = schema.properties[key];
        let type = prop.type;
        
        if (!type && prop.anyOf) {
          // Find the first non-null type
          const nonNullType = prop.anyOf.find((t: any) => t.type !== 'null');
          if (nonNullType) {
            type = nonNullType.type;
          }
        }

        this.formFields.push({
          key: key,
          type: type,
          title: prop.title || key,
          description: prop.description || '',
          required: schema.required?.includes(key) || false
        });
        // Initialize model
        if (type === 'boolean') {
          this.formModel[key] = false;
        } else if (type === 'number' || type === 'integer') {
          this.formModel[key] = null;
        } else {
          this.formModel[key] = '';
        }
      }
    }
  }

  getCleanedFormModel(): any {
    const schema = this.functionCall?.args?.response_schema;
    if (!schema || schema.type !== 'object' || !schema.properties) {
      return this.formModel;
    }
    const cleaned = {...this.formModel};
    for (const key of Object.keys(schema.properties)) {
      const prop = schema.properties[key];
      const value = cleaned[key];
      if (value !== null && value !== undefined && value !== '') {
        let type = prop.type;
        if (!type && prop.anyOf) {
          const nonNullType = prop.anyOf.find((t: any) => t.type !== 'null');
          if (nonNullType) {
            type = nonNullType.type;
          }
        }
        
        if (type === 'integer') {
          cleaned[key] = parseInt(value, 10);
        } else if (type === 'number') {
          cleaned[key] = parseFloat(value);
        }
      } else {
        cleaned[key] = null;
      }
    }
    return cleaned;
  }

  updateFormModelJson() {
    this.formModelJson = JSON.stringify(this.getCleanedFormModel(), null, 2);
  }

  onJsonInputChange(newValue: string) {
    try {
      const parsed = JSON.parse(newValue);
      this.formModel = parsed;
    } catch (e) {
      // Ignore invalid JSON
    }
  }

  setActiveTab(tab: string) {
    this.activeTab = tab;
    if (tab === 'json') {
      this.updateFormModelJson();
    }
  }

  hasMessage(): boolean {
    return !!(this.functionCall.args?.prompt || this.functionCall.args?.message);
  }

  getPromptText(): string {
    return this.functionCall.args?.prompt || this.functionCall.args?.message || 'Please provide your response';
  }

  hasPayload(): boolean {
    return this.functionCall.args?.payload !== undefined &&
           this.functionCall.args?.payload !== null;
  }

  getPayloadJson(): string {
    try {
      return JSON.stringify(this.functionCall.args?.payload || {}, null, 2);
    } catch (e) {
      return '';
    }
  }

  hasResponseSchema(): boolean {
    return !!this.functionCall.args?.response_schema;
  }

  getResponseSchemaJson(): string {
    try {
      return JSON.stringify(this.functionCall.args?.response_schema || {}, null, 2);
    } catch (e) {
      return '';
    }
  }

  onSend() {
    if (this.isConfirmationRequest) {
      let payloadObj: any = {};
      try {
        payloadObj = JSON.parse(this.confirmationModel.payload);
      } catch (e) {
        payloadObj = this.functionCall.args?.originalFunctionCall?.args || {};
      }
      
      const responseValue = {
        confirmed: this.confirmationModel.confirmed,
        payload: payloadObj
      };
      
      this.functionCall.responseStatus = 'sent';
      this.cdr.detectChanges();

      const content = {
          role: 'user',
          parts: [{
            functionResponse: {
              id: this.functionCall.id,
              name: this.functionCall.name,
              response: responseValue,
            },
          }],
          functionCallEventId: this.functionCall.functionCallEventId
      };

      this.responseComplete.emit(content);
      return;
    }

    let responseValue: any;
    const schema = this.functionCall?.args?.response_schema;
    const hasSchema = schema && schema.type === 'object' && schema.properties;

    if (hasSchema && this.formFields.length > 0) {
      const cleanedModel = this.getCleanedFormModel();
      responseValue = cleanedModel;
      this.functionCall.userResponse = JSON.stringify(cleanedModel);
      this.functionCall.sentUserResponse = this.functionCall.userResponse;
    } else {
      if (!this.functionCall.userResponse ||
          !this.functionCall.userResponse.trim()) {
        return;
      }

      // Store the user response before sending
      this.functionCall.sentUserResponse = this.functionCall.userResponse;

      try {
        const parsed = JSON.parse(this.functionCall.userResponse);
        if (typeof parsed === 'object' && parsed !== null) {
          responseValue = parsed;
        } else {
          responseValue = { 'result': this.functionCall.userResponse };
        }
      } catch (e) {
        responseValue = { 'result': this.functionCall.userResponse };
      }
    }

    // Update status to sent
    this.functionCall.responseStatus = 'sent';
    this.cdr.detectChanges();

    const content = {
        role: 'user',
        parts: [{
          functionResponse: {
            id: this.functionCall.id,
            name: this.functionCall.name,
            response: responseValue,
          },
        }],
        functionCallEventId: this.functionCall.functionCallEventId
    };

    this.responseComplete.emit(content);
  }
}
