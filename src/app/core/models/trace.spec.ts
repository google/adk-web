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
import {initTestBed} from '../../testing/utils';
import {
  FallbackSpan,
  GenerateContentSpan,
  InvokeAgentSpan,
  OPERATION_GENERATE_CONTENT,
  OPERATION_INVOKE_AGENT,
  SpanValidator,
  ValidatedSpan,
  extractSystemInstruction,
} from './Trace';

// ---------------------------------------------------------------------------
// Compile-time regression checks.
//
// These never run, but if `SpanValidator.safeParse(...).data` ever stops
// inferring as a 3-branch union, `tsc` (and therefore `npm run build`) will
// fail at the assignments below.
// ---------------------------------------------------------------------------

type IsExactly<A, B> = [A] extends [B] ? ([B] extends [A] ? true : false) : false;
type Assert<T extends true> = T;

// Narrow the SpanValidator output type — what callers actually see.
type InferredSpan = Extract<
    ReturnType<typeof SpanValidator.safeParse>,
    { success: true }
>['data'];

// 1) The inferred type must be exactly the 3-branch ValidatedSpan union.
type _SpanInferenceCheck = Assert<IsExactly<InferredSpan, ValidatedSpan>>;

// 2) Each branch must independently survive — i.e. be assignable from a
//    distinct member of the union (not merged into a supertype).
const _invokeAgentBranch: InvokeAgentSpan = {} as Extract<
    InferredSpan,
    { attrOperationName: typeof OPERATION_INVOKE_AGENT }
>;
const _generateContentBranch: GenerateContentSpan = {} as Extract<
    InferredSpan,
    { attrOperationName: typeof OPERATION_GENERATE_CONTENT }
>;
const _fallbackBranch: FallbackSpan = {} as Extract<
    InferredSpan,
    { attrOperationName?: undefined }
>;

// 3) After narrowing, the per-branch tightenings must be required (not
//    optional). If we ever regress to optional we'd be able to assign
//    `string | undefined` to these variables.
function _narrowingChecks(span: ValidatedSpan): void {
  if (span.attrOperationName === OPERATION_INVOKE_AGENT) {
    const _conv: string = span.attrConversationId;     // required
    // `logs` is dropped from every branch — Stage 2 validates them then
    // discards them; the only meaningful payload (LLM IO) is surfaced
    // through `io` on the IO-bearing branches.
    // @ts-expect-error logs are not exposed on validated spans.
    const _logs = span.logs;
    // `io` is declared as the literal `undefined` on the InvokeAgent
    // branch. Reading it is fine; assigning anything else would fail.
    const _ioMustBeUndefined: undefined = span.io;
  } else if (span.attrOperationName === OPERATION_GENERATE_CONTENT) {
    const _eid: string = span.attrEventId;             // required
    const _inv: string = span.attrInvocationId;        // required
    // @ts-expect-error logs are not exposed on validated spans.
    const _logs = span.logs;
    // `io` is the unified Stage-3 LLM IO projection (optional).
    const _io: typeof span.io = span.io;
  } else {
    // Fallback branch — discriminator is the literal `undefined`.
    const _op: undefined = span.attrOperationName;
    // Promoted attributes are still surfaced (all optional).
    const _eid: string | undefined = span.attrEventId;
    const _conv: string | undefined = span.attrConversationId;
    // @ts-expect-error logs are not exposed on validated spans.
    const _logs = span.logs;
    const _io: typeof span.io = span.io;
  }
}
void _narrowingChecks;

// ---------------------------------------------------------------------------
// Runtime tests.
// ---------------------------------------------------------------------------

describe('Trace Validation', () => {
  function validate(json: any): string | undefined {
    const result = SpanValidator.safeParse(json);
    if (!result.success) {
      return result.error.issues
          .map(e => `${e.path.join('.')}: ${e.message}`)
          .join(', ');
    }
    return undefined;
  }

  function parse(json: any) {
    const result = SpanValidator.safeParse(json);
    if (!result.success) {
      throw new Error(
          result.error.issues
              .map(e => `${e.path.join('.')}: ${e.message}`)
              .join(', '));
    }
    return result.data;
  }

  function createBaseSpan(extras: any = {}) {
    return {
      name: 'test-span',
      start_time: 1000,
      end_time: 2000,
      trace_id: 'trace-1',
      span_id: 'span-1',
      ...extras,
    };
  }

  describe('Stage 1: envelope shape', () => {
    it('accepts a minimal envelope (no operation_name)', () => {
      expect(validate(createBaseSpan())).toBeUndefined();
    });

    it('rejects when start_time is missing', () => {
      const span = createBaseSpan();
      delete span.start_time;
      expect(validate(span)).toBeDefined();
    });

    it('rejects when span_id is missing', () => {
      const span = createBaseSpan();
      delete span.span_id;
      expect(validate(span)).toBeDefined();
    });
  });

  describe('Fallback branch (no/unknown operation_name)', () => {
    it('accepts a span with no operation_name', () => {
      const parsed = parse(createBaseSpan({
        attributes: { 'gcp.vertex.agent.event_id': 'evt-1' },
      }));
      // Discriminator must be exactly `undefined`, not the unknown name.
      expect(parsed.attrOperationName).toBeUndefined();
      // Promoted attribute is surfaced (optional on the union).
      expect(parsed.attrEventId).toBe('evt-1');
      // The raw `attributes` bag is intentionally dropped after Stage 2.
      expect((parsed as any).attributes).toBeUndefined();
    });

    it('does NOT promote unknown operation names into attrOperationName',
       () => {
         // Per the design, fallback spans must keep `attrOperationName`
         // undefined so that literal narrowing on the other branches works.
         const parsed = parse(createBaseSpan({
           attributes: { 'gen_ai.operation.name': 'execute_tool' },
         }));
         expect(parsed.attrOperationName).toBeUndefined();
         // The original value is no longer reachable — there is no
         // `attributes` escape hatch on the validated span.
         expect((parsed as any).attributes).toBeUndefined();
       });

    it('legacy `call_llm` span (no operation_name) flows through fallback',
       () => {
         const parsed = parse(createBaseSpan({
           name: 'call_llm',
           attributes: {
             'gcp.vertex.agent.event_id': 'evt-1',
             'gcp.vertex.agent.llm_request': '{"req": 1}',
             'gcp.vertex.agent.llm_response': '{"res": 1}',
           },
         }));
         expect(parsed.attrOperationName).toBeUndefined();
         // Non-IO promoted fields are still available — no need for raw
         // `attributes` lookups in callers.
         expect(parsed.attrEventId).toBe('evt-1');
         // The legacy llm_{request,response} strings are surfaced via
         // the unified Stage-3 `io` projection (kind: 'legacy'), with
         // the JSON strings parsed into structured payloads.
         expect(parsed.io?.kind).toBe('legacy');
         expect(parsed.io?.inputs).toEqual({ req: 1 });
         expect(parsed.io?.outputs).toEqual({ res: 1 });
       });

    it('still validates the shape of attributes when present', () => {
      // `gen_ai.usage.input_tokens` must be a number even on a fallback
      // span, because the promotion mixin runs unconditionally.
      const span = createBaseSpan({
        attributes: { 'gen_ai.usage.input_tokens': 'not-a-number' },
      });
      expect(validate(span)).toBeDefined();
    });
  });

  describe('invoke_agent branch', () => {
    function invokeAgentSpan(extras: any = {}) {
      return createBaseSpan({
        name: 'invoke_agent root_agent',
        attributes: {
          'gen_ai.operation.name': OPERATION_INVOKE_AGENT,
          'gen_ai.conversation.id': 'session-1',
          ...(extras.attributes ?? {}),
        },
        ...Object.fromEntries(
            Object.entries(extras).filter(([k]) => k !== 'attributes')),
      });
    }

    it('promotes required attrs into typed fields', () => {
      const parsed = parse(invokeAgentSpan({
        attributes: {
          'gcp.vertex.agent.associated_event_ids': ['evt-1', 'evt-2'],
          'gen_ai.agent.name': 'root_agent',
          'gen_ai.agent.description': 'The root agent',
        },
      }));
      expect(parsed.attrOperationName).toBe(OPERATION_INVOKE_AGENT);
      if (parsed.attrOperationName === OPERATION_INVOKE_AGENT) {
        expect(parsed.attrConversationId).toBe('session-1');
        expect(parsed.attrAssociatedEventIds).toEqual(['evt-1', 'evt-2']);
        expect(parsed.attrAgentName).toBe('root_agent');
        expect(parsed.attrAgentDescription).toBe('The root agent');
      }
    });

    it('rejects when conversation.id is missing', () => {
      const span = invokeAgentSpan();
      delete (span.attributes as any)['gen_ai.conversation.id'];
      expect(validate(span)).toBeDefined();
    });

    it('does not require invocation_id on this branch', () => {
      // invocation_id is required on `generate_content` spans, not on
      // `invoke_agent` spans.
      const span = invokeAgentSpan();
      expect(validate(span)).toBeUndefined();
    });

    it('drops logs from the parsed output (typed away)', () => {
      const span = invokeAgentSpan({
        logs: [{
          event_name: 'gen_ai.system.message',
          body: { content: 'sys' },
        }],
      });
      const parsed = parse(span);
      expect((parsed as any).logs).toBeUndefined();
    });

    it('is lenient about extra unknown attribute keys (they are dropped)',
       () => {
         // Unknown attributes neither cause validation errors nor leak
         // into the parsed output — promoted attrs are the single access
         // path.
         const span = invokeAgentSpan({
           attributes: { 'some.unknown.key': 'value' },
         });
         const parsed = parse(span);
         expect((parsed as any).attributes).toBeUndefined();
         expect((parsed as any)['some.unknown.key']).toBeUndefined();
       });
  });

  describe('generate_content branch', () => {
    function generateContentSpan(extras: any = {}) {
      return createBaseSpan({
        name: 'generate_content gemini-2.0',
        attributes: {
          'gen_ai.operation.name': OPERATION_GENERATE_CONTENT,
          'gcp.vertex.agent.event_id': 'evt-default',
          'gcp.vertex.agent.invocation_id': 'inv-default',
          ...(extras.attributes ?? {}),
        },
        ...Object.fromEntries(
            Object.entries(extras).filter(([k]) => k !== 'attributes')),
      });
    }

    it('rejects when event_id is missing (now required on this branch)',
       () => {
         const span = generateContentSpan();
         delete (span.attributes as any)['gcp.vertex.agent.event_id'];
         expect(validate(span)).toBeDefined();
       });

    it('rejects when invocation_id is missing (required on this branch)',
       () => {
         const span = generateContentSpan();
         delete (span.attributes as any)['gcp.vertex.agent.invocation_id'];
         expect(validate(span)).toBeDefined();
       });

    it('accepts a minimal generate_content span (only required attrs)',
       () => {
         const parsed = parse(generateContentSpan());
         expect(parsed.attrOperationName).toBe(OPERATION_GENERATE_CONTENT);
         if (parsed.attrOperationName === OPERATION_GENERATE_CONTENT) {
           expect(parsed.attrEventId).toBe('evt-default');
           expect(parsed.attrInvocationId).toBe('inv-default');
           // No IO sources present → no `io` projection.
           expect(parsed.io).toBeUndefined();
         }
       });

    it('surfaces legacy llm_request/response via Stage-3 `io`', () => {
      const parsed = parse(generateContentSpan({
        attributes: {
          'gcp.vertex.agent.llm_request': '{"req": true}',
          'gcp.vertex.agent.llm_response': '{"res": true}',
        },
      }));
      if (parsed.attrOperationName === OPERATION_GENERATE_CONTENT) {
        expect(parsed.io?.kind).toBe('legacy');
        expect(parsed.io?.inputs).toEqual({ req: true });
        expect(parsed.io?.outputs).toEqual({ res: true });
      }
    });

    it('still validates the shape of experimental attrs even though they ' +
           'are not promoted (Stage-1 LogValidator rejects malformed bodies)',
       () => {
         // Experimental input/output/system/tool attributes are no longer
         // promoted to top-level fields, but they remain validated when
         // they appear inside the Stage-1 completion-details log
         // attributes — see the next two tests.
         const parsed = parse(generateContentSpan({
           attributes: {
             'gen_ai.response.finish_reasons': ['stop'],
             'gen_ai.usage.input_tokens': 10,
             'gen_ai.usage.output_tokens': 20,
           },
         }));
         if (parsed.attrOperationName === OPERATION_GENERATE_CONTENT) {
           expect(parsed.attrResponseFinishReasons).toEqual(['stop']);
           expect(parsed.attrUsageInputTokens).toBe(10);
           expect(parsed.attrUsageOutputTokens).toBe(20);
         }
       });

    it('rejects malformed gen_ai.input.messages part shape on the ' +
           'completion-details log',
       () => {
         // Even though `gen_ai.input.messages` is no longer promoted as a
         // top-level attr, Stage 1's CompletionDetailsLogValidator still
         // validates its shape when it appears as a log attribute.
         const span = generateContentSpan({
           logs: [
             {
               event_name: 'gen_ai.client.inference.operation.details',
               attributes: {
                 'gen_ai.input.messages': [
                   {
                     role: 'user',
                     parts: [{ type: 'text' /* missing content */ }],
                   },
                 ],
               },
             },
           ],
         });
         expect(validate(span)).toBeDefined();
       });

    it('rejects unknown part type discriminator on the completion-details ' +
           'log',
       () => {
         const span = generateContentSpan({
           logs: [
             {
               event_name: 'gen_ai.client.inference.operation.details',
               attributes: {
                 'gen_ai.input.messages': [
                   {
                     role: 'user',
                     parts: [{ type: 'mystery', content: 'x' }],
                   },
                 ],
               },
             },
           ],
         });
         expect(validate(span)).toBeDefined();
       });

    it('drops logs from the parsed output (validated then dropped)', () => {
      // Logs are validated at Stage 1 (so malformed shapes are still
      // rejected) but dropped from the validated output — their only
      // meaningful payload (the LLM IO) is surfaced via `io`.
      const parsed = parse(generateContentSpan({
        logs: [
          {
            event_name: 'gen_ai.system.message',
            body: { content: 'sys' },
          },
        ],
      }));
      expect((parsed as any).logs).toBeUndefined();
    });

    it('coerces stable child logs into Stage-3 `io` (kind: stable)', () => {
      const parsed = parse(generateContentSpan({
        logs: [
          {
            event_name: 'gen_ai.system.message',
            body: { content: 'sys' },
          },
          {
            event_name: 'gen_ai.user.message',
            body: { role: 'user', content: { parts: [{ text: 'hi' }] } },
          },
          {
            event_name: 'gen_ai.user.message',
            body: { role: 'user', content: { parts: [{ text: 'again' }] } },
          },
          {
            event_name: 'gen_ai.choice',
            body: { content: { role: 'model', parts: [{ text: 'ok' }] } },
          },
        ],
      }));
      if (parsed.attrOperationName === OPERATION_GENERATE_CONTENT) {
        expect(parsed.io?.kind).toBe('stable');
        if (parsed.io?.kind === 'stable') {
          expect(parsed.io.inputs.system_instruction).toEqual({
            content: 'sys',
          });
          expect(parsed.io.inputs.user_messages.length).toBe(2);
          expect(parsed.io.outputs).toEqual({
            content: { role: 'model', parts: [{ text: 'ok' }] },
          });
        }
      }
    });

    it('coerces the experimental completion-details log into Stage-3 ' +
           '`io` (kind: experimental)',
       () => {
         const parsed = parse(generateContentSpan({
           logs: [
             {
               event_name: 'gen_ai.client.inference.operation.details',
               attributes: {
                 'gen_ai.input.messages': [
                   {
                     role: 'user',
                     parts: [{ type: 'text', content: 'hi' }],
                   },
                 ],
                 'gen_ai.output.messages': [
                   {
                     role: 'assistant',
                     parts: [{ type: 'text', content: 'reply' }],
                     finish_reason: 'stop',
                   },
                 ],
                 'gen_ai.system_instructions': [
                   { type: 'text', content: 'you are a helper' },
                 ],
                 'gen_ai.tool.definitions': [
                   { type: 'function', name: 'fn' },
                 ],
                 'gen_ai.usage.input_tokens': 7,
                 'gen_ai.usage.output_tokens': 11,
               },
             },
           ],
         }));
         if (parsed.attrOperationName === OPERATION_GENERATE_CONTENT) {
           expect(parsed.io?.kind).toBe('experimental');
           if (parsed.io?.kind === 'experimental') {
             expect((parsed.io.inputs.user_messages as any)?.length).toBe(1);
             expect((parsed.io.inputs.tool_definitions as any)?.length)
                 .toBe(1);
             expect((parsed.io.outputs as any)?.length).toBe(1);
           }
         }
       });

    it('is lenient about extra unknown attribute keys (they are dropped)',
       () => {
         // Unknown attributes neither cause validation errors nor leak
         // into the parsed output.
         const parsed = parse(generateContentSpan({
           attributes: { 'some.unknown.key': 'value' },
         }));
         expect((parsed as any).attributes).toBeUndefined();
         expect((parsed as any)['some.unknown.key']).toBeUndefined();
       });
  });

  describe('legacy log-validation tests (preserved from prior version)', () => {
    function genCSpanWithLogs(logs: any[]) {
      return createBaseSpan({
        name: 'generate_content x',
        attributes: {
          'gen_ai.operation.name': OPERATION_GENERATE_CONTENT,
          'gcp.vertex.agent.event_id': 'evt-1',
          'gcp.vertex.agent.invocation_id': 'inv-1',
        },
        logs,
      });
    }

    it('valid system message log', () => {
      expect(validate(genCSpanWithLogs([
        { event_name: 'gen_ai.system.message', body: { content: 'sys' } },
      ]))).toBeUndefined();
    });

    it('valid user message log with text', () => {
      expect(validate(genCSpanWithLogs([{
        event_name: 'gen_ai.user.message',
        body: { role: 'user', content: { parts: [{ text: 'hi' }] } },
      }]))).toBeUndefined();
    });

    it('valid choice with function_call', () => {
      expect(validate(genCSpanWithLogs([{
        event_name: 'gen_ai.choice',
        body: {
          content: {
            role: 'model',
            parts: [{
              function_call: {
                name: 'get_weather',
                args: { location: 'London' },
              },
            }],
          },
        },
      }]))).toBeUndefined();
    });

    it('user message with function_response', () => {
      expect(validate(genCSpanWithLogs([{
        event_name: 'gen_ai.user.message',
        body: {
          role: 'user',
          content: {
            parts: [{
              function_response: {
                name: 'get_weather',
                response: { weather: 'sunny' },
              },
            }],
          },
        },
      }]))).toBeUndefined();
    });

    it('user message body as a JSON string', () => {
      expect(validate(genCSpanWithLogs([{
        event_name: 'gen_ai.user.message',
        body: JSON.stringify({
          role: 'user',
          content: { parts: [{ text: 'Hello from JSON string' }] },
        }),
      }]))).toBeUndefined();
    });

    it('rejects system message missing content', () => {
      expect(validate(genCSpanWithLogs([
        { event_name: 'gen_ai.system.message', body: {} },
      ]))).toBeDefined();
    });

    it('rejects function_call missing name', () => {
      expect(validate(genCSpanWithLogs([{
        event_name: 'gen_ai.user.message',
        body: {
          role: 'user',
          content: {
            parts: [{ function_call: { args: { location: 'London' } } }],
          },
        },
      }]))).toBeDefined();
    });

    it('rejects choice with no role', () => {
      expect(validate(genCSpanWithLogs([{
        event_name: 'gen_ai.choice',
        body: { content: { parts: [{ text: 'no role' }] } },
      }]))).toBeDefined();
    });

    it('rejects invalid JSON-string body', () => {
      expect(validate(genCSpanWithLogs([{
        event_name: 'gen_ai.user.message',
        body: '{ invalid json }',
      }]))).toBeDefined();
    });
  });

  describe('extractSystemInstruction helper', () => {
    it('returns undefined for empty/missing/non-string inputs', () => {
      expect(extractSystemInstruction(undefined)).toBeUndefined();
      expect(extractSystemInstruction(null)).toBeUndefined();
      expect(extractSystemInstruction({})).toBeUndefined();
      expect(extractSystemInstruction({ system_instruction: 123 })).toBeUndefined();
      expect(extractSystemInstruction({ system_instruction: ['not', 'string'] })).toBeUndefined();
    });

    it('extracts simple string instruction', () => {
      expect(extractSystemInstruction({ system_instruction: ' hello  ' })).toBe(' hello  ');
      expect(extractSystemInstruction({ systemInstruction: 'world' })).toBe('world');
    });

    it('extracts instruction from legacy config structure', () => {
      expect(extractSystemInstruction({
        config: {
          system_instruction: ' legacy vertex  '
        }
      })).toBe(' legacy vertex  ');
    });
  });
});
