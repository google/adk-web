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

import {FunctionCall, FunctionResponse} from './types';

export enum ComputerTool {
  COMPUTER = 'computer',
  CLICK_AT = 'click_at',
  HOVER_AT = 'hover_at',
  TYPE_TEXT_AT = 'type_text_at',
  SCROLL_AT = 'scroll_at',
  DRAG_AND_DROP = 'drag_and_drop',
  MOUSE_MOVE = 'mouse_move',
  SCROLL_DOCUMENT = 'scroll_document',
}

export enum ComputerAction {
  LEFT_CLICK = 'left_click',
  RIGHT_CLICK = 'right_click',
  MIDDLE_CLICK = 'middle_click',
  DOUBLE_CLICK = 'double_click',
  KEY = 'key',
  TYPE_TEXT = 'type_text',
  MOUSE_MOVE = 'mouse_move',
  LEFT_DRAG = 'left_drag',
  SCREENSHOT = 'screenshot',
  CURSOR_POSITION = 'cursor_position',
}

export interface ComputerUsePayload {
  image?: {
    data: string;
    mimetype?: string;
  };
  url?: string;
}

export interface ComputerUseClickCall extends FunctionCall {
  args: {
    action?: ComputerAction;
    coordinate?: [number, number];
    x?: number;
    y?: number;
    [key: string]: any;
  };
}

export function isVisibleComputerUseClick(message: {
  functionCall?: FunctionCall;
}): message is {functionCall: ComputerUseClickCall} {
  const fc = message.functionCall;
  if (!fc) return false;

  if (fc.name === ComputerTool.COMPUTER) {
    const action = fc.args?.['action'];
    const coordinate = fc.args?.['coordinate'];
    const isVisibleClickAction = [
      ComputerAction.LEFT_CLICK,
      ComputerAction.RIGHT_CLICK,
      ComputerAction.MIDDLE_CLICK,
      ComputerAction.DOUBLE_CLICK,
    ].includes(action as ComputerAction);
    return isVisibleClickAction && Array.isArray(coordinate) &&
        coordinate.length === 2;
  }

  const isVisibleClickTool = [
    ComputerTool.CLICK_AT,
    ComputerTool.HOVER_AT,
    ComputerTool.TYPE_TEXT_AT,
    ComputerTool.SCROLL_AT,
    ComputerTool.DRAG_AND_DROP,
    ComputerTool.MOUSE_MOVE,
    ComputerTool.SCROLL_DOCUMENT,
  ].includes(fc.name as ComputerTool);
  const hasCoordinates =
      (fc.args?.['x'] != null && fc.args?.['y'] != null) ||
      (Array.isArray(fc.args?.['coordinate']) &&
       fc.args?.['coordinate'].length === 2);

  return isVisibleClickTool && hasCoordinates;
}

export function isComputerUseResponse(message: {
  functionResponse?: FunctionResponse;
}): message is
    {functionResponse: FunctionResponse & {response: ComputerUsePayload}} {
  const response = message.functionResponse?.response as ComputerUsePayload;
  return !!(response?.image?.data);
}