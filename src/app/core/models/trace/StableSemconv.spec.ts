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
  GEN_AI_CHOICE_EVENT,
  GEN_AI_SYSTEM_MESSAGE_EVENT,
  GEN_AI_USER_MESSAGE_EVENT,
  isChoiceLog,
  isSystemMessageLog,
  isUserMessageLog,
  LogValidator,
  PromptResponseLogValidator,
  SystemMessageLogValidator,
} from './StableSemconv';

describe('StableSemconv', () => {
  describe('SystemMessageLogValidator', () => {
    it('accepts a valid system message body', () => {
      const result = SystemMessageLogValidator.safeParse({
        event_name: GEN_AI_SYSTEM_MESSAGE_EVENT,
        body: { content: 'You are a helpful assistant.' },
      });
      expect(result.success).toBeTrue();
    });

    it('rejects when body.content is missing', () => {
      const result = SystemMessageLogValidator.safeParse({
        event_name: GEN_AI_SYSTEM_MESSAGE_EVENT,
        body: {},
      });
      expect(result.success).toBeFalse();
    });

    it('rejects when event_name is wrong', () => {
      const result = SystemMessageLogValidator.safeParse({
        event_name: GEN_AI_USER_MESSAGE_EVENT,
        body: { content: 'hi' },
      });
      expect(result.success).toBeFalse();
    });
  });

  describe('PromptResponseLogValidator', () => {
    it('accepts a user message with text part', () => {
      const result = PromptResponseLogValidator.safeParse({
        event_name: GEN_AI_USER_MESSAGE_EVENT,
        body: {
          role: 'user',
          content: { parts: [{ text: 'Hello' }] },
        },
      });
      expect(result.success).toBeTrue();
    });

    it('accepts a choice with function_call part', () => {
      const result = PromptResponseLogValidator.safeParse({
        event_name: GEN_AI_CHOICE_EVENT,
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
      });
      expect(result.success).toBeTrue();
    });

    it('accepts a function_response part', () => {
      const result = PromptResponseLogValidator.safeParse({
        event_name: GEN_AI_USER_MESSAGE_EVENT,
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
      });
      expect(result.success).toBeTrue();
    });

    it('accepts a JSON-string body', () => {
      const result = PromptResponseLogValidator.safeParse({
        event_name: GEN_AI_USER_MESSAGE_EVENT,
        body: JSON.stringify({
          role: 'user',
          content: { parts: [{ text: 'Hello from JSON' }] },
        }),
      });
      expect(result.success).toBeTrue();
    });

    it('rejects an invalid JSON-string body', () => {
      const result = PromptResponseLogValidator.safeParse({
        event_name: GEN_AI_USER_MESSAGE_EVENT,
        body: '{ this is not valid json }',
      });
      expect(result.success).toBeFalse();
    });

    it('rejects a function_call missing the name field', () => {
      const result = PromptResponseLogValidator.safeParse({
        event_name: GEN_AI_USER_MESSAGE_EVENT,
        body: {
          role: 'user',
          content: {
            parts: [{
              function_call: { args: { location: 'London' } },
            }],
          },
        },
      });
      expect(result.success).toBeFalse();
    });

    it('rejects when content has no role at all', () => {
      const result = PromptResponseLogValidator.safeParse({
        event_name: GEN_AI_CHOICE_EVENT,
        body: {
          content: { parts: [{ text: 'I have no role' }] },
        },
      });
      expect(result.success).toBeFalse();
    });

    it('lifts top-level role onto content.role', () => {
      const result = PromptResponseLogValidator.safeParse({
        event_name: GEN_AI_USER_MESSAGE_EVENT,
        body: {
          role: 'user',
          content: { parts: [{ text: 'Hi' }] },
        },
      });
      expect(result.success).toBeTrue();
      if (result.success) {
        expect(result.data.body.content.role).toBe('user');
      }
    });
  });

  describe('LogValidator union', () => {
    it('accepts both system and prompt/response shapes', () => {
      const sys = LogValidator.safeParse({
        event_name: GEN_AI_SYSTEM_MESSAGE_EVENT,
        body: { content: 'sys' },
      });
      const user = LogValidator.safeParse({
        event_name: GEN_AI_USER_MESSAGE_EVENT,
        body: { role: 'user', content: { parts: [{ text: 'hi' }] } },
      });
      expect(sys.success).toBeTrue();
      expect(user.success).toBeTrue();
    });
  });

  describe('type guards', () => {
    it('isUserMessageLog narrows on event_name', () => {
      const log = {
        event_name: GEN_AI_USER_MESSAGE_EVENT,
        body: { content: { parts: [], role: 'user' } },
      } as const;
      expect(isUserMessageLog(log as any)).toBeTrue();
      expect(isSystemMessageLog(log as any)).toBeFalse();
      expect(isChoiceLog(log as any)).toBeFalse();
    });

    it('isSystemMessageLog narrows on event_name', () => {
      const log = {
        event_name: GEN_AI_SYSTEM_MESSAGE_EVENT,
        body: { content: 'sys' },
      } as const;
      expect(isSystemMessageLog(log as any)).toBeTrue();
      expect(isUserMessageLog(log as any)).toBeFalse();
      expect(isChoiceLog(log as any)).toBeFalse();
    });

    it('isChoiceLog narrows on event_name', () => {
      const log = {
        event_name: GEN_AI_CHOICE_EVENT,
        body: { content: { parts: [], role: 'model' } },
      } as const;
      expect(isChoiceLog(log as any)).toBeTrue();
      expect(isUserMessageLog(log as any)).toBeFalse();
      expect(isSystemMessageLog(log as any)).toBeFalse();
    });
  });
});
