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
import {getShellCommand, getShellResult, stripAnsi, tokenizeShellCommand} from './ShellCommand';

describe('ShellCommand', () => {
  describe('getShellCommand', () => {
    it('reads the command of Execute and execute_bash calls', () => {
      expect(getShellCommand({name: 'Execute', args: {command: 'echo hi'}}))
          .toBe('echo hi');
      expect(getShellCommand({name: 'execute_bash', args: {command: 'ls -la'}}))
          .toBe('ls -la');
    });

    it('reads command_line for Antigravity run_command calls', () => {
      expect(getShellCommand({
        name: 'run_command',
        args: {command_line: 'npm test', working_dir: '/tmp'},
      })).toBe('npm test');
    });

    it('uses the command of run_skill_script calls in an environment', () => {
      expect(getShellCommand({
        name: 'run_skill_script',
        args: {
          skill_name: 'text-skill',
          file_path: 'scripts/format.sh',
          command: 'bash skills/text-skill/scripts/format.sh "hello world"',
        },
      })).toBe('bash skills/text-skill/scripts/format.sh "hello world"');
    });

    it('matches run_skill_script with a tool name prefix', () => {
      expect(getShellCommand({
        name: 'my_run_skill_script',
        args: {skill_name: 's', file_path: 'scripts/a.sh', command: 'bash a.sh'},
      })).toBe('bash a.sh');
    });

    it('builds the command of run_skill_script calls run by a code executor',
       () => {
         expect(getShellCommand({
           name: 'run_skill_script',
           args: {
             skill_name: 'text-skill',
             file_path: 'scripts/format.sh',
             args: ['hello world'],
           },
         })).toBe(`bash scripts/format.sh 'hello world'`);
         expect(getShellCommand({
           name: 'run_skill_script',
           args: {
             skill_name: 'calc-skill',
             file_path: 'scripts/calculate.py',
             args: {op: 'add', a: 10, b: 5},
             short_options: {v: 1},
             positional_args: ['x'],
           },
         }))
             .toBe(
                 'python scripts/calculate.py --op add --a 10 --b 5 -v 1 -- x');
       });

    it('returns null for unsupported skill script types', () => {
      expect(getShellCommand({
        name: 'run_skill_script',
        args: {skill_name: 's', file_path: 'scripts/a.rb'},
      })).toBeNull();
    });

    it('returns null for other tools and missing commands', () => {
      expect(getShellCommand({name: 'get_weather', args: {command: 'ls'}}))
          .toBeNull();
      expect(getShellCommand({name: 'Execute', args: {}})).toBeNull();
      expect(getShellCommand({name: 'Execute', args: {command: '  '}}))
          .toBeNull();
      expect(getShellCommand(undefined)).toBeNull();
    });
  });

  describe('getShellResult', () => {
    it('treats a successful Execute response without exit_code as exit 0', () => {
      expect(getShellResult({
        name: 'Execute',
        response: {status: 'ok', stdout: 'hi\n'},
      })).toEqual({
        stdout: 'hi\n',
        stderr: '',
        exitCode: 0,
        timedOut: false,
        error: '',
      });
    });

    it('reads exit_code and error from a failed Execute response', () => {
      const result = getShellResult({
        name: 'Execute',
        response: {status: 'error', stderr: 'boom', exit_code: 2},
      });
      expect(result?.exitCode).toBe(2);
      expect(result?.stderr).toBe('boom');

      const timeout = getShellResult({
        name: 'Execute',
        response: {status: 'error', error: 'Command timed out after 30s.'},
      });
      expect(timeout?.exitCode).toBeNull();
      expect(timeout?.error).toBe('Command timed out after 30s.');
    });

    it('reads returncode and drops execute_bash placeholders', () => {
      expect(getShellResult({
        name: 'execute_bash',
        response: {
          stdout: 'out',
          stderr: '<no stderr captured>',
          returncode: 1,
        },
      })).toEqual({
        stdout: 'out',
        stderr: '',
        exitCode: 1,
        timedOut: false,
        error: '',
      });
    });

    it('reads timed_out from run_skill_script responses', () => {
      const result = getShellResult({
        name: 'run_skill_script',
        response: {stdout: '', stderr: '', exit_code: -1, timed_out: true},
      });
      expect(result?.timedOut).toBeTrue();
    });

    it('uses result as the output of Antigravity run_command', () => {
      expect(getShellResult({
        name: 'run_command',
        response: {result: 'done'},
      })?.stdout).toBe('done');
    });

    it('returns null for other tools and unrelated payloads', () => {
      expect(getShellResult({name: 'get_weather', response: {stdout: 'x'}}))
          .toBeNull();
      expect(getShellResult({name: 'Execute', response: {foo: 'bar'}}))
          .toBeNull();
      expect(getShellResult(undefined)).toBeNull();
    });
  });

  describe('tokenizeShellCommand', () => {
    it('keeps the original text', () => {
      const command = `FOO=1 grep -rn "a b" src | head -5 && echo 'done' > out.txt 2>&1`;
      expect(tokenizeShellCommand(command).map(t => t.text).join(''))
          .toBe(command);
    });

    it('classifies commands, flags, args, and operators', () => {
      const tokens = tokenizeShellCommand('ls -la src | wc -l && echo "a b"')
                         .filter(t => t.type !== 'space');
      expect(tokens).toEqual([
        {text: 'ls', type: 'command'},
        {text: '-la', type: 'flag'},
        {text: 'src', type: 'arg'},
        {text: '|', type: 'operator'},
        {text: 'wc', type: 'command'},
        {text: '-l', type: 'flag'},
        {text: '&&', type: 'operator'},
        {text: 'echo', type: 'command'},
        {text: '"a b"', type: 'arg'},
      ]);
    });

    it('treats the word after a redirection as a file, not a command', () => {
      const tokens = tokenizeShellCommand('echo hi > out.txt')
                         .filter(t => t.type !== 'space');
      expect(tokens[tokens.length - 1]).toEqual({text: 'out.txt', type: 'arg'});
    });

    it('skips variable assignments when finding the command', () => {
      const tokens =
          tokenizeShellCommand('FOO=1 make').filter(t => t.type !== 'space');
      expect(tokens).toEqual([
        {text: 'FOO=1', type: 'arg'},
        {text: 'make', type: 'command'},
      ]);
    });
  });

  it('stripAnsi removes color codes', () => {
    expect(stripAnsi('\x1b[31merror\x1b[0m ok')).toBe('error ok');
  });
});
