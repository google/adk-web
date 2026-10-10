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
import {getGroundingSummary, getWebPageResult, getWebPageUrl} from './WebTool';

describe('WebTool', () => {
  describe('getGroundingSummary', () => {
    it('reads the queries and web sources of a grounded response', () => {
      expect(getGroundingSummary({
        webSearchQueries: ['what is ADK'],
        groundingChunks: [
          {web: {uri: 'https://google.github.io/adk-docs/', title: 'ADK docs', domain: 'google.github.io'}},
        ],
      })).toEqual({
        queries: ['what is ADK'],
        sources: [{title: 'ADK docs', uri: 'https://google.github.io/adk-docs/', domain: 'google.github.io'}],
      });
    });

    it('drops the domain when Google Search already uses it as the title', () => {
      const redirect = 'https://vertexaisearch.cloud.google.com/grounding-api-redirect/abc';
      expect(getGroundingSummary({
        groundingChunks: [{web: {uri: redirect, title: 'example.com', domain: 'example.com'}}],
      })?.sources).toEqual([{title: 'example.com', uri: redirect, domain: ''}]);
    });

    it('reads retrieved documents and skips repeated sources', () => {
      expect(getGroundingSummary({
        retrievalQueries: ['refund policy'],
        groundingChunks: [
          {retrievedContext: {uri: 'https://docs.example.com/policy.pdf', title: 'Refund policy'}},
          {retrievedContext: {uri: 'https://docs.example.com/policy.pdf', title: 'Refund policy'}},
          {retrievedContext: {title: 'No link'}},
        ],
      })).toEqual({
        queries: ['refund policy'],
        sources: [{title: 'Refund policy', uri: 'https://docs.example.com/policy.pdf', domain: 'docs.example.com'}],
      });
    });

    it('returns null without queries or sources', () => {
      expect(getGroundingSummary({searchEntryPoint: {renderedContent: '<div></div>'}}))
          .toBeNull();
      expect(getGroundingSummary(undefined)).toBeNull();
    });
  });

  describe('load_web_page', () => {
    it('reads the URL of a call', () => {
      expect(getWebPageUrl({name: 'load_web_page', args: {url: 'https://example.com'}}))
          .toBe('https://example.com');
      expect(getWebPageUrl({name: 'get_weather', args: {url: 'x'}})).toBeNull();
    });

    it('reads the page text of a response', () => {
      expect(getWebPageResult({name: 'load_web_page', response: {result: 'Example text.'}}))
          .toEqual({kind: 'page', text: 'Example text.'});
    });

    it('recognizes a failed fetch by its message', () => {
      expect(getWebPageResult({
        name: 'load_web_page',
        response: {result: 'Failed to fetch url: http://localhost:9'},
      })).toEqual({kind: 'error', error: 'Failed to fetch url: http://localhost:9'});
      expect(getWebPageResult({name: 'load_web_page', response: {error: 'boom'}}))
          .toEqual({kind: 'error', error: 'boom'});
    });

    it('returns null for other tools', () => {
      expect(getWebPageResult({name: 'get_weather', response: {result: 'sunny'}}))
          .toBeNull();
    });
  });
});
