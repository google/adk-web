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

import {initTestBed} from '../../../testing/utils';
import {ComputerAction, ComputerTool, isComputerUseResponse, isVisibleComputerUseClick} from '../ComputerUse';
// 1p-ONLY-IMPORTS: import {beforeEach, describe, expect, it}

describe('ComputerUse', () => {
  describe('isVisibleComputerUseClick', () => {
    it('should return true for valid computer tool with coordinate array', () => {
      const call = {
        name: ComputerTool.COMPUTER,
        args: {
          action: ComputerAction.LEFT_CLICK,
          coordinate: [500, 500]
        }
      };
      expect(isVisibleComputerUseClick(call)).toBeTrue();
    });

    it('should return false for computer tool without coordinates', () => {
      const call = {
        name: ComputerTool.COMPUTER,
        args: {
          action: ComputerAction.LEFT_CLICK
        }
      };
      expect(isVisibleComputerUseClick(call)).toBeFalse();
    });

    it('should return true for specialized tool with x and y args', () => {
      const call = {
        name: ComputerTool.CLICK_AT,
        args: {
          x: 100,
          y: 200
        }
      };
      expect(isVisibleComputerUseClick(call)).toBeTrue();
    });

    it('should return true for hover tool with coordinate array', () => {
      const call = {
        name: ComputerTool.HOVER_AT,
        args: {
          coordinate: [300, 400]
        }
      };
      expect(isVisibleComputerUseClick(call)).toBeTrue();
    });

    it('should return false for non-visual actions in computer tool', () => {
      const call = {
        name: ComputerTool.COMPUTER,
        args: {
          action: ComputerAction.SCREENSHOT,
          coordinate: [500, 500]
        }
      };
      expect(isVisibleComputerUseClick(call)).toBeFalse();
    });

    it('should return false when functionCall is missing (undefined)', () => {
      expect(isVisibleComputerUseClick(undefined)).toBeFalse();
    });
  });

  describe('isComputerUseResponse', () => {
    it('should return true for valid response with image data', () => {
      const response: any = {
        name: 'computer',
        response: {
          image: {
            data: 'base64-encoded-image-data'
          }
        }
      };
      expect(isComputerUseResponse(response)).toBeTrue();
    });

    it('should return false when image data is missing', () => {
      const response: any = {
        name: 'computer',
        response: {
          url: 'https://google.com'
        }
      };
      expect(isComputerUseResponse(response)).toBeFalse();
    });

    it('should return false when functionResponse is missing (undefined)', () => {
      expect(isComputerUseResponse(undefined)).toBeFalse();
    });
  });
});