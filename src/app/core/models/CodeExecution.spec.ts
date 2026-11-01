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

// 1p-ONLY-IMPORTS: import {describe, expect, it}
import {appendCodeExecutionSegments, CodeExecutionSegment, getCodeExecutionOutput, getCodeLanguage, getStandaloneCodeResults, groupCodeExecutionRuns, normalizeOutcome, toMarkdownCodeBlock} from './CodeExecution';
import {CodeExecutionResult, ExecutableCode, Part} from './types';

describe('CodeExecution', () => {
  describe('appendCodeExecutionSegments', () => {
    it('returns undefined for parts without code execution', () => {
      expect(appendCodeExecutionSegments(undefined, [{text: 'hello'}]))
          .toBeUndefined();
      expect(appendCodeExecutionSegments(undefined, undefined)).toBeUndefined();
    });

    it('keeps interleaved text, code, and results in order', () => {
      const parts: Part[] = [
        {text: 'I will compute both values.'},
        {executableCode: {code: 'print(1)', language: 'PYTHON'}},
        {codeExecutionResult: {outcome: 'OUTCOME_OK', output: '1\n'}},
        {executableCode: {code: 'print(2)', language: 'PYTHON'}},
        {codeExecutionResult: {outcome: 'OUTCOME_OK', output: '2\n'}},
        {text: 'Done.'},
      ];
      expect(appendCodeExecutionSegments(undefined, parts)).toEqual([
        {kind: 'text', text: 'I will compute both values.', thought: false},
        {kind: 'code', executableCode: {code: 'print(1)', language: 'PYTHON'}},
        {
          kind: 'result',
          codeExecutionResult: {outcome: 'OUTCOME_OK', output: '1\n'},
        },
        {kind: 'code', executableCode: {code: 'print(2)', language: 'PYTHON'}},
        {
          kind: 'result',
          codeExecutionResult: {outcome: 'OUTCOME_OK', output: '2\n'},
        },
        {kind: 'text', text: 'Done.', thought: false},
      ]);
    });

    it('merges consecutive text with the same thought flag', () => {
      const segments = appendCodeExecutionSegments(undefined, [
        {text: 'Let me '},
        {text: 'think', thought: true},
        {executableCode: {code: 'x = 1'}},
      ]);
      expect(segments?.map(s => s.kind)).toEqual(['text', 'text', 'code']);
    });

    it('starts from earlier text when a streamed chunk brings the first code',
       () => {
         const segments = appendCodeExecutionSegments(
             undefined, [{text: 'run'}, {executableCode: {code: 'x = 1'}}],
             [{text: 'Let me '}]);
         expect(segments?.[0]).toEqual(
             {kind: 'text', text: 'Let me run', thought: false});
         expect(segments?.[1].kind).toBe('code');
       });

    it('appends streamed chunks without changing the earlier segments', () => {
      const first = appendCodeExecutionSegments(undefined, [
        {executableCode: {code: 'x = 1'}},
        {text: 'The answer'},
      ])!;
      const second = appendCodeExecutionSegments(first, [{text: ' is 1.'}]);
      expect(second?.[1]).toEqual(
          {kind: 'text', text: 'The answer is 1.', thought: false});
      expect((first[1] as {text: string}).text).toBe('The answer');
    });

    it('applies formatText to text parts', () => {
      const segments = appendCodeExecutionSegments(
          undefined,
          [{text: '/*PLANNING*/plan', thought: true}, {executableCode: {code: ''}}],
          [], (text, thought) => thought ? text.replace('/*PLANNING*/', '') : text);
      expect(segments?.[0]).toEqual({kind: 'text', text: 'plan', thought: true});
    });

    it('ignores parts that are rendered elsewhere', () => {
      const segments: CodeExecutionSegment[]|undefined =
          appendCodeExecutionSegments(undefined, [
            {inlineData: {mimeType: 'image/png', data: 'abc'}},
            {codeExecutionResult: {outcome: 'OUTCOME_OK', output: ''}},
          ]);
      expect(segments?.length).toBe(1);
    });
  });

  describe('groupCodeExecutionRuns', () => {
    const code: ExecutableCode = {code: 'print(1)', language: 'PYTHON'};
    const result: CodeExecutionResult = {outcome: 'OUTCOME_OK', output: '1\n'};

    it('pairs code with the result right after it', () => {
      expect(groupCodeExecutionRuns([
        {kind: 'text', text: 'Computing.', thought: false},
        {kind: 'code', executableCode: code},
        {kind: 'result', codeExecutionResult: result},
      ])).toEqual([
        {kind: 'text', text: 'Computing.', thought: false},
        {kind: 'run', executableCode: code, codeExecutionResult: result},
      ]);
    });

    it('keeps a result without code before it as its own run', () => {
      expect(groupCodeExecutionRuns([
        {kind: 'result', codeExecutionResult: result},
      ])).toEqual([{kind: 'run', codeExecutionResult: result}]);
    });

    it('does not pair a result that follows text', () => {
      expect(groupCodeExecutionRuns([
        {kind: 'code', executableCode: code},
        {kind: 'text', text: 'Running.', thought: false},
        {kind: 'result', codeExecutionResult: result},
      ])).toEqual([
        {kind: 'run', executableCode: code},
        {kind: 'text', text: 'Running.', thought: false},
        {kind: 'run', codeExecutionResult: result},
      ]);
    });

    it('keeps consecutive code segments as separate runs', () => {
      expect(groupCodeExecutionRuns([
        {kind: 'code', executableCode: code},
        {kind: 'code', executableCode: code},
        {kind: 'result', codeExecutionResult: result},
      ])).toEqual([
        {kind: 'run', executableCode: code},
        {kind: 'run', executableCode: code, codeExecutionResult: result},
      ]);
    });
  });

  describe('getStandaloneCodeResults', () => {
    const result: CodeExecutionResult = {outcome: 'OUTCOME_OK', output: '1\n'};

    it('returns the results of an event with only results', () => {
      expect(getStandaloneCodeResults({
        codeExecutionResult: result,
        codeExecutionSegments: [{kind: 'result', codeExecutionResult: result}],
      })).toEqual([result]);
      expect(getStandaloneCodeResults({codeExecutionResult: result}))
          .toEqual([result]);
    });

    it('returns nothing when the event also has text or code', () => {
      expect(getStandaloneCodeResults({
        codeExecutionSegments: [
          {kind: 'code', executableCode: {code: 'print(1)'}},
          {kind: 'result', codeExecutionResult: result},
        ],
      })).toEqual([]);
      expect(getStandaloneCodeResults({
        codeExecutionSegments: [
          {kind: 'text', text: 'Done.', thought: false},
          {kind: 'result', codeExecutionResult: result},
        ],
      })).toEqual([]);
      expect(getStandaloneCodeResults({codeExecutionResult: result, text: 'hi'}))
          .toEqual([]);
      expect(getStandaloneCodeResults({})).toEqual([]);
    });
  });

  describe('getCodeLanguage', () => {
    it('highlights Python', () => {
      expect(getCodeLanguage('PYTHON')).toEqual({label: 'Python', fence: 'python'});
    });

    it('falls back to plain code when the language is missing or unknown', () => {
      const plain = {label: 'Code', fence: ''};
      expect(getCodeLanguage(undefined)).toEqual(plain);
      expect(getCodeLanguage('LANGUAGE_UNSPECIFIED')).toEqual(plain);
      expect(getCodeLanguage('COBOL')).toEqual(plain);
    });
  });

  describe('toMarkdownCodeBlock', () => {
    it('wraps code in a fence with the language tag', () => {
      expect(toMarkdownCodeBlock('print(1)\n', 'python'))
          .toBe('```python\nprint(1)\n```');
    });

    it('uses a fence longer than any backtick run in the code', () => {
      expect(toMarkdownCodeBlock('s = """```"""', ''))
          .toBe('````\ns = """```"""\n````');
    });
  });

  describe('normalizeOutcome', () => {
    it('accepts outcomes with and without the OUTCOME_ prefix', () => {
      expect(normalizeOutcome('OUTCOME_OK')).toBe('ok');
      expect(normalizeOutcome('OK')).toBe('ok');
      expect(normalizeOutcome('OUTCOME_FAILED')).toBe('failed');
      expect(normalizeOutcome('FAILED')).toBe('failed');
      expect(normalizeOutcome('OUTCOME_DEADLINE_EXCEEDED')).toBe('timeout');
      expect(normalizeOutcome('DEADLINE_EXCEEDED')).toBe('timeout');
    });

    it('returns unknown for anything else', () => {
      expect(normalizeOutcome('OUTCOME_UNSPECIFIED')).toBe('unknown');
      expect(normalizeOutcome(undefined)).toBe('unknown');
    });
  });

  describe('getCodeExecutionOutput', () => {
    it('drops the prefix ADK executors add to stdout', () => {
      expect(getCodeExecutionOutput({
        outcome: 'OUTCOME_OK',
        output: 'Code execution result:\nprimes: [2, 3]\n',
      })).toEqual({output: 'primes: [2, 3]\n', status: 'ok'});
    });

    it('keeps the saved artifacts line', () => {
      expect(getCodeExecutionOutput({
        outcome: 'OK',
        output: 'Code execution result:\n\n\n\nSaved artifacts:\n`plot.png`',
      })?.output).toContain('Saved artifacts:\n`plot.png`');
    });

    it('returns null without a result', () => {
      expect(getCodeExecutionOutput(undefined)).toBeNull();
    });
  });
});
