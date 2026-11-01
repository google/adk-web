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

import {FunctionCall, FunctionResponse, GroundingMetadata} from './types';

/** `load_web_page`: fetches a URL and returns the page's text. */
export const LOAD_WEB_PAGE_TOOL = 'load_web_page';

/** What `load_web_page` returns instead of the text when the fetch fails. */
const FETCH_FAILED_PREFIX = 'Failed to fetch url:';

/** A page or document a grounded response cites. */
export interface GroundingSource {
  title: string;
  uri: string;
  /** Site the source is on, when it differs from the title. */
  domain: string;
}

/** The searches and sources behind a grounded response. */
export interface GroundingSummary {
  queries: string[];
  sources: GroundingSource[];
}

/** The outcome of a `load_web_page` call. */
export type WebPageResult = {kind: 'page'; text: string}|{kind: 'error'; error: string};

function hostnameOf(uri: string): string {
  try {
    return new URL(uri).hostname;
  } catch {
    return '';
  }
}

/**
 * Returns the queries and sources of a grounded response, or null when the
 * response has neither. Google Search sources link through a redirect URL and
 * use the site as their title, so the domain is only kept when it adds
 * something.
 */
export function getGroundingSummary(metadata: GroundingMetadata|undefined):
    GroundingSummary|null {
  const queries = [
    ...(metadata?.webSearchQueries ?? []),
    ...(metadata?.retrievalQueries ?? []),
  ].filter(query => query);

  const sources: GroundingSource[] = [];
  const seen = new Set<string>();
  for (const chunk of metadata?.groundingChunks ?? []) {
    const source = chunk.web ?? chunk.retrievedContext;
    const uri = source?.uri ?? '';
    if (!uri || seen.has(uri)) continue;
    seen.add(uri);
    const domain = chunk.web?.domain || hostnameOf(uri);
    const title = source?.title || domain || uri;
    sources.push({title, uri, domain: domain === title ? '' : domain});
  }

  return queries.length || sources.length ? {queries, sources} : null;
}

/** Returns the URL a `load_web_page` call fetches, or null for other calls. */
export function getWebPageUrl(fc: FunctionCall|undefined): string|null {
  if (fc?.name !== LOAD_WEB_PAGE_TOOL) return null;
  const url = fc.args?.['url'];
  return typeof url === 'string' ? url : null;
}

/**
 * Returns the page text or the failure of a `load_web_page` response, or null
 * for other responses. The tool reports a failed fetch as text, not as an
 * error field, so the failure is recognized by its message.
 */
export function getWebPageResult(fr: FunctionResponse|undefined): WebPageResult|
    null {
  if (fr?.name !== LOAD_WEB_PAGE_TOOL) return null;
  const result = fr.response?.['result'];
  const error = fr.response?.['error'];
  if (typeof error === 'string' && error) return {kind: 'error', error};
  if (typeof result !== 'string') return null;
  return result.startsWith(FETCH_FAILED_PREFIX) ? {kind: 'error', error: result} :
                                                  {kind: 'page', text: result};
}
