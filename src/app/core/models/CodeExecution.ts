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

import {CodeExecutionResult, ExecutableCode, Part} from './types';

/**
 * One piece of an event that contains code execution, in the order the parts
 * arrived. Built-in (model-side) code execution returns text, code, and results
 * interleaved in a single event, so they are kept in order rather than merged.
 */
export type CodeExecutionSegment =
    {kind: 'text'; text: string; thought: boolean}|
    {kind: 'code'; executableCode: ExecutableCode}|
    {kind: 'result'; codeExecutionResult: CodeExecutionResult};

/**
 * What an event with code execution displays: text, or one code run. A run has
 * its code, its result, or both when the result directly follows the code.
 */
export type CodeExecutionItem = {kind: 'text'; text: string; thought: boolean}|{
  kind: 'run';
  executableCode?: ExecutableCode;
  codeExecutionResult?: CodeExecutionResult;
};

/** Display name and markdown fence language of the code in an `ExecutableCode`. */
export interface CodeLanguage {
  label: string;
  /** Language tag for the markdown code fence, or '' for no highlighting. */
  fence: string;
}

/** Outcome of a code execution, normalized across ADK implementations. */
export type CodeExecutionStatus = 'ok'|'failed'|'timeout'|'unknown';

/** What a code execution result shows: its output text and outcome. */
export interface CodeExecutionOutput {
  output: string;
  status: CodeExecutionStatus;
}

/**
 * Languages the genai `Language` enum can report. Add an entry here when an
 * executor starts reporting another language.
 */
const CODE_LANGUAGES: Record<string, CodeLanguage> = {
  'PYTHON': {label: 'Python', fence: 'python'},
};

const UNKNOWN_LANGUAGE: CodeLanguage = {label: 'Code', fence: ''};

/** Prefix ADK code executors put in front of a successful run's stdout. */
const RESULT_PREFIX = /^Code execution result:\n?/;

/**
 * Appends an event's parts to its ordered code execution segments.
 *
 * Returns undefined while neither the existing segments nor the new parts
 * contain code execution, so other events keep their usual rendering.
 *
 * @param segments Segments already built for the event, if any.
 * @param parts The parts to append.
 * @param priorText Text already shown for the event. When a streamed event's
 *     first code part arrives after some text, this text becomes the first
 *     segments.
 * @param formatText Applied to each text part before it is stored.
 */
export function appendCodeExecutionSegments(
    segments: readonly CodeExecutionSegment[]|undefined,
    parts: readonly Part[]|undefined,
    priorText: ReadonlyArray<{text: string, thought?: boolean}> = [],
    formatText: (text: string, thought: boolean) => string = (text) => text,
    ): CodeExecutionSegment[]|undefined {
  const hasCodeExecution =
      parts?.some(part => part.executableCode || part.codeExecutionResult);
  if (!segments && !hasCodeExecution) return undefined;

  // Copies, so appending text to the last segment never mutates the input.
  const result: CodeExecutionSegment[] = segments ?
      segments.map(segment => ({...segment})) :
      priorText.filter(part => part.text)
          .map(part => ({
                 kind: 'text' as const,
                 text: part.text,
                 thought: !!part.thought,
               }));

  for (const part of parts ?? []) {
    if (part.executableCode) {
      result.push({kind: 'code', executableCode: part.executableCode});
    } else if (part.codeExecutionResult) {
      result.push(
          {kind: 'result', codeExecutionResult: part.codeExecutionResult});
    } else if (part.text) {
      const thought = !!part.thought;
      const text = formatText(part.text, thought);
      const last = result[result.length - 1];
      if (last?.kind === 'text' && last.thought === thought) {
        last.text += text;
      } else {
        result.push({kind: 'text', text, thought});
      }
    }
  }
  return result;
}

/**
 * Pairs each code segment with the result right after it, so a run renders as
 * one editor with its output attached. Built-in code execution sends both in
 * one event; client-side executors send them in separate events, which stay
 * separate runs.
 */
export function groupCodeExecutionRuns(
    segments: readonly CodeExecutionSegment[]): CodeExecutionItem[] {
  const items: CodeExecutionItem[] = [];
  for (const segment of segments) {
    const last = items[items.length - 1];
    if (segment.kind === 'text') {
      items.push(segment);
    } else if (segment.kind === 'code') {
      items.push({kind: 'run', executableCode: segment.executableCode});
    } else if (
        last?.kind === 'run' && last.executableCode &&
        !last.codeExecutionResult) {
      last.codeExecutionResult = segment.codeExecutionResult;
    } else {
      items.push(
          {kind: 'run', codeExecutionResult: segment.codeExecutionResult});
    }
  }
  return items;
}

/**
 * Returns the results of an event that holds only code execution results, with
 * no text or code. Client-side executors send each result in its own event,
 * which shows the result under the event's chips rather than as a message.
 */
export function getStandaloneCodeResults(uiEvent: {
  codeExecutionSegments?: readonly CodeExecutionSegment[];
  executableCode?: ExecutableCode;
  codeExecutionResult?: CodeExecutionResult;
  text?: string;
}): CodeExecutionResult[] {
  const segments = uiEvent.codeExecutionSegments;
  if (segments) {
    const results = segments.flatMap(
        segment => segment.kind === 'result' ? [segment.codeExecutionResult] :
                                               []);
    return results.length === segments.length ? results : [];
  }
  return uiEvent.codeExecutionResult && !uiEvent.executableCode &&
          !uiEvent.text ?
      [uiEvent.codeExecutionResult] :
      [];
}

/** Returns the display name and highlighting language for executable code. */
export function getCodeLanguage(language: string|undefined): CodeLanguage {
  return (language && CODE_LANGUAGES[language]) || UNKNOWN_LANGUAGE;
}

/**
 * Wraps code in a markdown code fence. The fence is longer than any run of
 * backticks in the code, so the code cannot close it early.
 */
export function toMarkdownCodeBlock(code: string, fence: string): string {
  const longestRun =
      Math.max(0, ...(code.match(/`+/g) ?? []).map(run => run.length));
  const ticks = '`'.repeat(Math.max(3, longestRun + 1));
  return `${ticks}${fence}\n${code.replace(/\n+$/, '')}\n${ticks}`;
}

/** Normalizes an outcome with or without the `OUTCOME_` prefix. */
export function normalizeOutcome(outcome: string|undefined):
    CodeExecutionStatus {
  switch ((outcome ?? '').toUpperCase().replace(/^OUTCOME_/, '')) {
    case 'OK':
      return 'ok';
    case 'FAILED':
      return 'failed';
    case 'DEADLINE_EXCEEDED':
      return 'timeout';
    default:
      return 'unknown';
  }
}

/** Returns the output text and outcome of a code execution result. */
export function getCodeExecutionOutput(result: CodeExecutionResult|undefined):
    CodeExecutionOutput|null {
  if (!result) return null;
  return {
    output: (result.output ?? '').replace(RESULT_PREFIX, ''),
    status: normalizeOutcome(result.outcome),
  };
}
