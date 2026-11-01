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
import {getResourceLanguage, getSkillResult, getSkillToolKind, isSkillToolResponse, parseSkillsXml} from './SkillTool';

const SKILLS_XML = [
  '<available_skills>',
  '<skill>', '<name>', 'calc-skill', '</name>',
  '<description>', 'Does math &amp; more.', '</description>', '</skill>',
  '<skill>', '<name>', 'text-skill', '</name>',
  '<description>', 'Formats &lt;text&gt;.', '</description>', '</skill>',
  '</available_skills>',
].join('\n');

describe('SkillTool', () => {
  describe('getSkillToolKind', () => {
    it('recognizes skill tools with and without a prefix', () => {
      expect(getSkillToolKind('load_skill')).toBe('load');
      expect(getSkillToolKind('exec_load_skill')).toBe('load');
      expect(getSkillToolKind('unload_skill')).toBe('unload');
      expect(getSkillToolKind('load_skill_resource')).toBe('resource');
      expect(getSkillToolKind('list_skills')).toBe('list');
      expect(getSkillToolKind('search_skills')).toBe('search');
    });

    it('ignores other tools, including run_skill_script', () => {
      expect(getSkillToolKind('run_skill_script')).toBeNull();
      expect(getSkillToolKind('get_weather')).toBeNull();
      expect(getSkillToolKind(undefined)).toBeNull();
    });
  });

  describe('parseSkillsXml', () => {
    it('reads names and descriptions and unescapes them', () => {
      expect(parseSkillsXml(SKILLS_XML)).toEqual([
        {name: 'calc-skill', description: 'Does math & more.'},
        {name: 'text-skill', description: 'Formats <text>.'},
      ]);
      expect(parseSkillsXml('<available_skills>\n</available_skills>'))
          .toEqual([]);
    });
  });

  describe('getSkillResult', () => {
    it('reads list_skills and search_skills results', () => {
      expect(getSkillResult({name: 'list_skills', response: {result: SKILLS_XML}}))
          .toEqual({
            kind: 'list',
            skills: [
              {name: 'calc-skill', description: 'Does math & more.'},
              {name: 'text-skill', description: 'Formats <text>.'},
            ],
          });
      expect(getSkillResult({
        name: 'search_skills',
        response: {result: [{name: 'pdf', description: 'Reads PDFs.', metadata: {}}]},
      })).toEqual({kind: 'search', skills: [{name: 'pdf', description: 'Reads PDFs.'}]});
    });

    it('reads a loaded skill', () => {
      expect(getSkillResult({
        name: 'load_skill',
        response: {
          skill_name: 'text-skill',
          instructions: '# Text skill',
          frontmatter: {name: 'text-skill', description: 'Formats text.'},
        },
      })).toEqual({
        kind: 'load',
        skillName: 'text-skill',
        description: 'Formats text.',
        instructions: '# Text skill',
      });
    });

    it('reads a resource, with null content for binary files', () => {
      expect(getSkillResult({
        name: 'load_skill_resource',
        response: {skill_name: 's', file_path: 'references/a.md', content: '# A'},
      })).toEqual({
        kind: 'resource',
        skillName: 's',
        filePath: 'references/a.md',
        content: '# A',
      });
      expect(getSkillResult({
        name: 'load_skill_resource',
        response: {skill_name: 's', file_path: 'assets/logo.png', status: 'Binary'},
      })).toEqual(jasmine.objectContaining({kind: 'resource', content: null}));
    });

    it('reads an unloaded skill', () => {
      expect(getSkillResult({
        name: 'unload_skill',
        response: {skill_name: 'a', unloaded: true, active_skills: ['b']},
      })).toEqual({kind: 'unload', skillName: 'a', activeSkills: ['b']});
    });

    it('reads errors from any skill tool', () => {
      expect(getSkillResult({
        name: 'load_skill',
        response: {error: 'Skill \'x\' not found.', error_code: 'SKILL_NOT_FOUND'},
      })).toEqual({kind: 'error', error: 'Skill \'x\' not found.'});
    });

    it('returns null for unexpected shapes and other tools', () => {
      expect(getSkillResult({name: 'load_skill', response: {result: 'ok'}}))
          .toBeNull();
      expect(isSkillToolResponse({name: 'run_skill_script', response: {stdout: ''}}))
          .toBeFalse();
      expect(getSkillResult(undefined)).toBeNull();
    });
  });

  describe('getResourceLanguage', () => {
    it('maps file extensions to highlighting languages', () => {
      expect(getResourceLanguage('scripts/run.sh')).toBe('bash');
      expect(getResourceLanguage('scripts/calc.PY')).toBe('python');
      expect(getResourceLanguage('references/guide.md')).toBe('markdown');
      expect(getResourceLanguage('assets/template.txt')).toBe('');
      expect(getResourceLanguage('scripts/Makefile')).toBe('');
    });
  });
});
