/**
 * @license
 * Copyright 2025 Google LLC
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

export const TOOL_ICONS: { [key: string]: string } = {
  'google_search': 'search',
  'EnterpriseWebSearchTool': 'web',
  'VertexAiSearchTool': 'search',
  'FilesRetrieval': 'find_in_page',
  'load_memory': 'memory',
  'preload_memory': 'memory',
  'url_context': 'link',
  'VertexAiRagRetrieval': 'find_in_page',
  'exit_loop': 'sync',
  'get_user_choice': 'how_to_reg',
  'load_artifacts': 'image',
  'LongRunningFunctionTool': 'data_object'
};

export function getToolIcon(toolName: string, toolType?: string): string {
  // For Agent Tools, return smart_toy icon
  if (toolType === 'Agent Tool') {
    return 'smart_toy';
  }

  // For Built-in tools, use the specific icon mapping
  if (toolType === 'Built-in tool') {
    return TOOL_ICONS[toolName] || 'build';
  }

  // For Function tools, return data_object
  if (toolType === 'Function tool') {
    return 'data_object';
  }

  // Default fallback
  return 'build';
}
