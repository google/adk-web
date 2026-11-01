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

import {FunctionCall, FunctionResponse} from './types';

/**
 * Tools that run shell commands or scripts:
 *  - `Execute`: EnvironmentToolset (local, E2B, Daytona environments).
 *  - `execute_bash`: ExecuteBashTool.
 *  - `run_command`: Antigravity built-in tool.
 *  - `run_skill_script`: SkillToolset, optionally with a `tool_name_prefix`.
 */
export enum ShellTool {
  EXECUTE = 'Execute',
  EXECUTE_BASH = 'execute_bash',
  RUN_COMMAND = 'run_command',
  RUN_SKILL_SCRIPT = 'run_skill_script',
}

/** Placeholders `execute_bash` returns in place of an empty stream. */
const EMPTY_STREAM_PLACEHOLDERS = new Set([
  '<no stdout captured>',
  '<no stderr captured>',
]);

/** Keys that at least one shell tool puts in its response. */
const SHELL_RESPONSE_KEYS = [
  'status',
  'stdout',
  'stderr',
  'exit_code',
  'returncode',
  'timed_out',
  'result',
  'error',
];

// Matches ANSI escape sequences (colors, cursor movement) in command output.
const ANSI_ESCAPE_PATTERN = /\x1b\[[0-9;?]*[ -/]*[@-~]|\x1b\][^\x07]*\x07/g;

/** Output of a shell tool, normalized across the tools' response shapes. */
export interface ShellResult {
  stdout: string;
  stderr: string;
  /** Exit code of the command, or null when the tool did not report one. */
  exitCode: number|null;
  timedOut: boolean;
  /** Error reported by the tool itself, as opposed to the command's stderr. */
  error: string;
}

/** Syntax category of a shell token, used to pick its color. */
export type ShellTokenType = 'command'|'arg'|'flag'|'operator'|'space';

/** A piece of a shell command, as produced by `tokenizeShellCommand`. */
export interface ShellToken {
  text: string;
  type: ShellTokenType;
}

function isSkillScriptTool(name: string): boolean {
  return name.endsWith(ShellTool.RUN_SKILL_SCRIPT);
}

function isShellToolName(name: string|undefined): boolean {
  if (!name) return false;
  return name === ShellTool.EXECUTE || name === ShellTool.EXECUTE_BASH ||
      name === ShellTool.RUN_COMMAND || isSkillScriptTool(name);
}

function nonEmptyString(value: unknown): string|null {
  return typeof value === 'string' && value.trim() ? value : null;
}

/** Quotes a single argument the way a user would type it in a shell. */
function quoteShellArg(arg: string): string {
  if (/^[\w@%+=:,./-]+$/.test(arg)) return arg;
  return `'${arg.replace(/'/g, `'\\''`)}'`;
}

function stringifyArg(value: unknown): string {
  return typeof value === 'object' && value !== null ? JSON.stringify(value) :
                                                       String(value);
}

/**
 * Rebuilds the command a skill script runs when SkillToolset uses a code
 * executor, mirroring how ADK assembles the script's argv.
 */
function buildSkillScriptCommand(args: Record<string, unknown>): string|null {
  const filePath = nonEmptyString(args['file_path']);
  if (!filePath) return null;

  const extension = filePath.includes('.') ?
      filePath.slice(filePath.lastIndexOf('.') + 1).toLowerCase() :
      '';
  let interpreter: string;
  if (extension === 'py') {
    interpreter = 'python';
  } else if (extension === 'sh' || extension === 'bash') {
    interpreter = 'bash';
  } else {
    return null;
  }

  const argv = [interpreter, filePath];
  const scriptArgs = args['args'];
  if (Array.isArray(scriptArgs)) {
    argv.push(...scriptArgs.map(stringifyArg));
  } else {
    if (scriptArgs && typeof scriptArgs === 'object') {
      for (const [key, value] of Object.entries(scriptArgs)) {
        argv.push(`--${key}`, stringifyArg(value));
      }
    }
    const shortOptions = args['short_options'];
    if (shortOptions && typeof shortOptions === 'object') {
      for (const [key, value] of Object.entries(shortOptions)) {
        argv.push(`-${key}`, stringifyArg(value));
      }
    }
    const positionalArgs = args['positional_args'];
    if (Array.isArray(positionalArgs) && positionalArgs.length > 0) {
      argv.push('--', ...positionalArgs.map(stringifyArg));
    }
  }
  return argv.map(quoteShellArg).join(' ');
}

/**
 * Returns the shell command a function call runs, or null when the call is not
 * a shell command.
 */
export function getShellCommand(fc: FunctionCall|undefined): string|null {
  if (!fc || !isShellToolName(fc.name)) return null;
  const args = fc.args ?? {};

  if (fc.name === ShellTool.RUN_COMMAND) {
    return nonEmptyString(args['command_line']);
  }
  if (isSkillScriptTool(fc.name)) {
    // With an environment the model passes the full command; with a code
    // executor ADK builds it from the script path and arguments.
    return nonEmptyString(args['command']) ?? buildSkillScriptCommand(args);
  }
  return nonEmptyString(args['command']);
}

/** Whether a function call runs a shell command or script. */
export function isShellCommandCall(fc: FunctionCall|undefined): boolean {
  return getShellCommand(fc) !== null;
}

function cleanStream(value: unknown): string {
  if (value === undefined || value === null) return '';
  const text = typeof value === 'string' ? value : stringifyArg(value);
  return EMPTY_STREAM_PLACEHOLDERS.has(text.trim()) ? '' : text;
}

/**
 * Returns the normalized output of a shell tool's function response, or null
 * when the response does not come from a shell tool.
 */
export function getShellResult(fr: FunctionResponse|undefined): ShellResult|
    null {
  if (!fr || !isShellToolName(fr.name)) return null;
  const response = fr.response;
  if (!response || typeof response !== 'object' ||
      !SHELL_RESPONSE_KEYS.some(key => key in response)) {
    return null;
  }

  let exitCode: number|null = null;
  if (typeof response['exit_code'] === 'number') {
    exitCode = response['exit_code'];
  } else if (typeof response['returncode'] === 'number') {
    exitCode = response['returncode'];
  } else if (fr.name === ShellTool.EXECUTE && response['status'] === 'ok') {
    // `Execute` only includes `exit_code` when it is non-zero.
    exitCode = 0;
  }

  return {
    // Antigravity's `run_command` returns its combined output as `result`.
    stdout: cleanStream(response['stdout'] ?? response['result']),
    stderr: cleanStream(response['stderr']),
    exitCode,
    timedOut: response['timed_out'] === true || response['timeout'] === true,
    error: typeof response['error'] === 'string' ? response['error'] : '',
  };
}

/** Whether a function response carries the result of a shell tool. */
export function isShellCommandResponse(fr: FunctionResponse|undefined):
    boolean {
  return getShellResult(fr) !== null;
}

/** Removes ANSI escape sequences so terminal output renders as plain text. */
export function stripAnsi(text: string): string {
  return text.replace(ANSI_ESCAPE_PATTERN, '');
}

const OPERATOR_PATTERN = /^(\d*>>|\d*>&\d*|\d*>|<<<|<<|<|&&|\|\||\||;|&|\n)/;

/**
 * Splits a command into tokens for syntax coloring. Whitespace is kept as
 * tokens, so joining every token's text gives back the original command.
 */
export function tokenizeShellCommand(command: string): ShellToken[] {
  const tokens: ShellToken[] = [];
  let expectCommand = true;
  let i = 0;

  while (i < command.length) {
    const rest = command.slice(i);

    const space = /^[ \t]+|^\\\n/.exec(rest);
    if (space) {
      tokens.push({text: space[0], type: 'space'});
      i += space[0].length;
      continue;
    }

    const operator = OPERATOR_PATTERN.exec(rest);
    if (operator) {
      tokens.push({text: operator[0], type: 'operator'});
      // Redirections take a file name next; the other operators start a new
      // command.
      expectCommand = !/[<>]/.test(operator[0]);
      i += operator[0].length;
      continue;
    }

    // A word runs until unquoted whitespace or an operator character.
    let end = i;
    while (end < command.length && !/[\s|&;<>]/.test(command[end])) {
      const char = command[end];
      if (char === '\\') {
        end += 2;
      } else if (char === '\'' || char === '"') {
        const close = command.indexOf(char, end + 1);
        end = close === -1 ? command.length : close + 1;
      } else {
        end++;
      }
    }
    end = Math.min(Math.max(end, i + 1), command.length);
    const word = command.slice(i, end);
    const isAssignment = /^[A-Za-z_][A-Za-z0-9_]*=/.test(word);

    let type: ShellTokenType;
    if (expectCommand && !isAssignment) {
      type = 'command';
      expectCommand = false;
    } else if (word.startsWith('-')) {
      type = 'flag';
    } else {
      type = 'arg';
    }
    tokens.push({text: word, type});
    i = end;
  }
  return tokens;
}
