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

// 1p-ONLY-IMPORTS: import {beforeEach, describe, expect, it}
import {initTestBed} from '../../../testing/utils';
import {
  CompletionDetailsLogValidator,
  GEN_AI_COMPLETION_DETAILS_EVENT,
  InputMessageValidator,
  InputMessagesAttrValidator,
  OutputMessageValidator,
  OutputMessagesAttrValidator,
  PartValidator,
  SystemInstructionsAttrValidator,
  ToolDefinitionValidator,
  ToolDefinitionsAttrValidator,
} from './ExperimentalSemconv';

describe('ExperimentalSemconv', () => {
  describe('PartValidator (discriminated on `type`)', () => {
    it('accepts a text part', () => {
      const result = PartValidator.safeParse({
        type: 'text',
        content: 'hello',
      });
      expect(result.success).toBeTrue();
    });

    it('accepts a blob part with arbitrary `data`', () => {
      const result = PartValidator.safeParse({
        type: 'blob',
        mime_type: 'image/png',
        data: 'base64stuff',
      });
      expect(result.success).toBeTrue();
    });

    it('accepts a file_data part', () => {
      const result = PartValidator.safeParse({
        type: 'file_data',
        mime_type: 'application/pdf',
        uri: 'gs://bucket/file.pdf',
      });
      expect(result.success).toBeTrue();
    });

    it('accepts a tool_call part with arguments', () => {
      const result = PartValidator.safeParse({
        type: 'tool_call',
        id: 'call_123',
        name: 'get_weather',
        arguments: { location: 'London' },
      });
      expect(result.success).toBeTrue();
    });

    it('accepts a tool_call part with null id and arguments', () => {
      const result = PartValidator.safeParse({
        type: 'tool_call',
        id: null,
        name: 'get_weather',
        arguments: null,
      });
      expect(result.success).toBeTrue();
    });

    it('accepts a tool_call_response part', () => {
      const result = PartValidator.safeParse({
        type: 'tool_call_response',
        id: 'call_123',
        response: { weather: 'sunny' },
      });
      expect(result.success).toBeTrue();
    });

    it('rejects a part with an unknown discriminator value', () => {
      const result = PartValidator.safeParse({
        type: 'something_else',
        content: 'hi',
      });
      expect(result.success).toBeFalse();
    });

    it('rejects a text part missing content', () => {
      const result = PartValidator.safeParse({ type: 'text' });
      expect(result.success).toBeFalse();
    });

    it('rejects a tool_call missing name', () => {
      const result = PartValidator.safeParse({
        type: 'tool_call',
        id: 'x',
        arguments: {},
      });
      expect(result.success).toBeFalse();
    });

    it('is lenient about extra unknown keys', () => {
      const result = PartValidator.safeParse({
        type: 'text',
        content: 'hi',
        unknownExtraField: 42,
      });
      expect(result.success).toBeTrue();
    });
  });

  describe('InputMessageValidator', () => {
    it('accepts a message with mixed parts', () => {
      const result = InputMessageValidator.safeParse({
        role: 'user',
        parts: [
          { type: 'text', content: 'hi' },
          {
            type: 'tool_call',
            id: 'call_1',
            name: 'fn',
            arguments: { a: 1 },
          },
        ],
      });
      expect(result.success).toBeTrue();
    });

    it('rejects a message missing role', () => {
      const result = InputMessageValidator.safeParse({
        parts: [{ type: 'text', content: 'hi' }],
      });
      expect(result.success).toBeFalse();
    });

    it('rejects a message with an invalid part shape', () => {
      const result = InputMessageValidator.safeParse({
        role: 'user',
        parts: [{ type: 'text' /* missing content */ }],
      });
      expect(result.success).toBeFalse();
    });
  });

  describe('OutputMessageValidator', () => {
    it('accepts a message with finish_reason', () => {
      const result = OutputMessageValidator.safeParse({
        role: 'assistant',
        parts: [{ type: 'text', content: 'done' }],
        finish_reason: 'stop',
      });
      expect(result.success).toBeTrue();
    });

    it('rejects a message missing finish_reason', () => {
      const result = OutputMessageValidator.safeParse({
        role: 'assistant',
        parts: [{ type: 'text', content: 'done' }],
      });
      expect(result.success).toBeFalse();
    });
  });

  describe('ToolDefinitionValidator', () => {
    it('accepts a function tool definition', () => {
      const result = ToolDefinitionValidator.safeParse({
        type: 'function',
        name: 'get_weather',
        description: 'Returns the weather',
        parameters: { type: 'object', properties: {} },
      });
      expect(result.success).toBeTrue();
    });

    it('accepts a function tool definition with null description/parameters',
       () => {
         const result = ToolDefinitionValidator.safeParse({
           type: 'function',
           name: 'fn',
           description: null,
           parameters: null,
         });
         expect(result.success).toBeTrue();
       });

    it('accepts a generic tool definition', () => {
      const result = ToolDefinitionValidator.safeParse({
        name: 'google_search',
        type: 'google_search',
      });
      expect(result.success).toBeTrue();
    });

    it('rejects a definition missing name', () => {
      const result = ToolDefinitionValidator.safeParse({ type: 'function' });
      expect(result.success).toBeFalse();
    });
  });

  describe('attribute-level validators (accept JSON string or array)', () => {
    const inputs = [{ role: 'user', parts: [{ type: 'text', content: 'hi' }] }];

    it('InputMessagesAttrValidator accepts the parsed array form', () => {
      const result = InputMessagesAttrValidator.safeParse(inputs);
      expect(result.success).toBeTrue();
    });

    it('InputMessagesAttrValidator accepts the JSON-string form', () => {
      const result =
          InputMessagesAttrValidator.safeParse(JSON.stringify(inputs));
      expect(result.success).toBeTrue();
    });

    it('InputMessagesAttrValidator rejects malformed JSON-string', () => {
      const result = InputMessagesAttrValidator.safeParse('{ broken');
      expect(result.success).toBeFalse();
    });

    it('OutputMessagesAttrValidator accepts a valid array', () => {
      const result = OutputMessagesAttrValidator.safeParse([
        {
          role: 'assistant',
          parts: [{ type: 'text', content: 'ok' }],
          finish_reason: 'stop',
        },
      ]);
      expect(result.success).toBeTrue();
    });

    it('SystemInstructionsAttrValidator accepts a valid Part array', () => {
      const result = SystemInstructionsAttrValidator.safeParse([
        { type: 'text', content: 'You are helpful.' },
      ]);
      expect(result.success).toBeTrue();
    });

    it('ToolDefinitionsAttrValidator accepts mixed function/generic tools',
       () => {
         const result = ToolDefinitionsAttrValidator.safeParse([
           {
             type: 'function',
             name: 'fn',
             description: 'd',
             parameters: { type: 'object' },
           },
           { name: 'google_search', type: 'google_search' },
         ]);
         expect(result.success).toBeTrue();
       });
  });

  describe('CompletionDetailsLogValidator', () => {
    it('accepts the completion-details event with full payload attributes',
       () => {
         const result = CompletionDetailsLogValidator.safeParse({
           event_name: GEN_AI_COMPLETION_DETAILS_EVENT,
           attributes: {
             'gen_ai.input.messages': [
               { role: 'user', parts: [{ type: 'text', content: 'hi' }] },
             ],
             'gen_ai.output.messages': [
               {
                 role: 'assistant',
                 parts: [{ type: 'text', content: 'reply' }],
                 finish_reason: 'stop',
               },
             ],
             'gen_ai.system_instructions': [
               { type: 'text', content: 'sys' },
             ],
             'gen_ai.tool.definitions': [],
             'gen_ai.response.finish_reasons': ['stop'],
             'gen_ai.usage.input_tokens': 7,
             'gen_ai.usage.output_tokens': 11,
           },
         });
         expect(result.success).toBeTrue();
       });

    it('accepts attributes encoded as JSON strings', () => {
      // Mirrors the wire format produced when the experimental exporter
      // serializes via `_safe_json_serialize_no_whitespaces` (see
      // ``_experimental_semconv.py``).
      const result = CompletionDetailsLogValidator.safeParse({
        event_name: GEN_AI_COMPLETION_DETAILS_EVENT,
        attributes: {
          'gen_ai.input.messages':
              '[{"role":"user","parts":[{"type":"text","content":"hi"}]}]',
        },
      });
      expect(result.success).toBeTrue();
    });

    it('passes through unknown common attributes (e.g. event_id)', () => {
      const result = CompletionDetailsLogValidator.safeParse({
        event_name: GEN_AI_COMPLETION_DETAILS_EVENT,
        attributes: {
          'gen_ai.agent.name': 'root_agent',
          'gen_ai.conversation.id': 'sess-1',
          'gcp.vertex.agent.event_id': 'evt-1',
          'gcp.vertex.agent.invocation_id': 'inv-1',
          'user.id': 'someone',
        },
      });
      expect(result.success).toBeTrue();
    });

    it('accepts a record with no attributes (initial export, response not set yet)',
       () => {
         const result = CompletionDetailsLogValidator.safeParse({
           event_name: GEN_AI_COMPLETION_DETAILS_EVENT,
         });
         expect(result.success).toBeTrue();
       });

    it('rejects a record with an unrelated event_name', () => {
      const result = CompletionDetailsLogValidator.safeParse({
        event_name: 'some.other.event',
      });
      expect(result.success).toBeFalse();
    });
  });
});
