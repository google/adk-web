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

import {FunctionResponse} from './types';

/**
 * SkillToolset tools, by the name they have without a `tool_name_prefix`.
 * `run_skill_script` is left out: it renders as a shell command.
 */
const SKILL_TOOLS = {
  'list_skills': 'list',
  'search_skills': 'search',
  'load_skill': 'load',
  'unload_skill': 'unload',
  'load_skill_resource': 'resource',
} as const;

/** What a skill tool does. */
export type SkillToolKind = (typeof SKILL_TOOLS)[keyof typeof SKILL_TOOLS];

/** A skill as listed by `list_skills` or `search_skills`. */
export interface SkillSummary {
  name: string;
  description: string;
}

/** What a skill tool response shows, by the tool that sent it. */
export type SkillResult =
    {kind: 'error'; error: string}|
    {kind: 'list'|'search'; skills: SkillSummary[]}|
    {kind: 'load'; skillName: string; description: string; instructions: string}|
    {kind: 'resource'; skillName: string; filePath: string; content: string|null}|
    {kind: 'unload'; skillName: string; activeSkills: string[]};

/** Markdown fence languages for resource files, by extension. */
const RESOURCE_LANGUAGES: Record<string, string> = {
  'bash': 'bash',
  'js': 'javascript',
  'json': 'json',
  'md': 'markdown',
  'py': 'python',
  'sh': 'bash',
  'ts': 'typescript',
  'yaml': 'yaml',
  'yml': 'yaml',
};

const SKILL_XML_PATTERN =
    /<skill>\s*<name>\s*([\s\S]*?)\s*<\/name>\s*<description>\s*([\s\S]*?)\s*<\/description>\s*<\/skill>/g;

/** Returns which skill tool a tool name refers to, allowing for a prefix. */
export function getSkillToolKind(name: string|undefined): SkillToolKind|null {
  if (!name) return null;
  for (const [toolName, kind] of Object.entries(SKILL_TOOLS)) {
    if (name === toolName || name.endsWith(`_${toolName}`)) return kind;
  }
  return null;
}

function asString(value: unknown): string {
  return typeof value === 'string' ? value : '';
}

/** Reverses the escaping Python's `html.escape` applies. */
function unescapeXml(text: string): string {
  return text.replace(/&lt;/g, '<')
      .replace(/&gt;/g, '>')
      .replace(/&quot;/g, '"')
      .replace(/&#x27;/g, '\'')
      .replace(/&amp;/g, '&');
}

/** Parses the `<available_skills>` XML that `list_skills` returns. */
export function parseSkillsXml(xml: string): SkillSummary[] {
  return Array.from(xml.matchAll(SKILL_XML_PATTERN), match => ({
                                                       name: unescapeXml(match[1]),
                                                       description: unescapeXml(match[2]),
                                                     }));
}

function toSkillSummaries(items: unknown): SkillSummary[] {
  if (!Array.isArray(items)) return [];
  return items.flatMap(item => {
    const name = asString(item?.['name']);
    return name ? [{name, description: asString(item['description'])}] : [];
  });
}

/**
 * Returns what a skill tool response shows, or null when the response is not
 * from a skill tool or has an unexpected shape.
 */
export function getSkillResult(fr: FunctionResponse|undefined): SkillResult|
    null {
  const kind = getSkillToolKind(fr?.name);
  const response = fr?.response;
  if (!kind || !response || typeof response !== 'object') return null;

  const error = asString(response['error']);
  if (error) return {kind: 'error', error};

  switch (kind) {
    case 'list':
      return typeof response['result'] === 'string' ?
          {kind, skills: parseSkillsXml(response['result'])} :
          null;
    case 'search':
      return Array.isArray(response['result']) ?
          {kind, skills: toSkillSummaries(response['result'])} :
          null;
    case 'load':
      if (typeof response['instructions'] !== 'string') return null;
      return {
        kind,
        skillName: asString(response['skill_name']),
        description: asString(response['frontmatter']?.['description']),
        instructions: response['instructions'],
      };
    case 'resource':
      if (typeof response['file_path'] !== 'string') return null;
      return {
        kind,
        skillName: asString(response['skill_name']),
        filePath: response['file_path'],
        // Binary files come back with a status message instead of content.
        content: typeof response['content'] === 'string' ? response['content'] :
                                                           null,
      };
    case 'unload':
      if (!response['unloaded']) return null;
      return {
        kind,
        skillName: asString(response['skill_name']),
        activeSkills: Array.isArray(response['active_skills']) ?
            response['active_skills'].filter(
                (name: unknown): name is string => typeof name === 'string') :
            [],
      };
    default:
      return null;
  }
}

/** Whether a function response comes from a skill tool this UI can show. */
export function isSkillToolResponse(fr: FunctionResponse|undefined): boolean {
  return getSkillResult(fr) !== null;
}

/** Returns the markdown fence language for a skill resource file. */
export function getResourceLanguage(filePath: string): string {
  const name = filePath.slice(filePath.lastIndexOf('/') + 1);
  const extension =
      name.includes('.') ? name.slice(name.lastIndexOf('.') + 1).toLowerCase() : '';
  return RESOURCE_LANGUAGES[extension] ?? '';
}
