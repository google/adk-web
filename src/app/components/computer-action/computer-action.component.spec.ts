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

import {ComponentFixture, TestBed} from '@angular/core/testing';
import {By} from '@angular/platform-browser';
// 1p-ONLY-IMPORTS: import {beforeEach, describe, expect, it}

import {ComputerAction, ComputerTool} from '../../core/models/ComputerUse';
import {initTestBed} from '../../testing/utils';

import {ComputerActionComponent} from './computer-action.component';

const CSS_SELECTORS = {
  SCREENSHOT: By.css('.computer-use-screenshot'),
  CLICK_MARKER: By.css('.click-overlay-box'),
  URL_TEXT: By.css('.url-text'),
};

describe('ComputerActionComponent', () => {
  let component: ComputerActionComponent;
  let fixture: ComponentFixture<ComputerActionComponent>;

  beforeEach(async () => {
    initTestBed();  // required for 1p compat

    await TestBed
        .configureTestingModule({
          imports: [ComputerActionComponent],
        })
        .compileComponents();

    fixture = TestBed.createComponent(ComputerActionComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  describe('Screenshot Display', () => {
    it('should format screenshot as data URI', () => {
      component.functionResponse = {
        name: 'computer',
        response: {image: {data: 'base64data', mimetype: 'image/jpeg'}}
      };
      fixture.detectChanges();
      const img = fixture.debugElement.query(CSS_SELECTORS.SCREENSHOT);
      expect(img.nativeElement.src).toBe('data:image/jpeg;base64,base64data');
    });

    it('should use default mimetype if missing', () => {
      component.functionResponse = {
        name: 'computer',
        response: {image: {data: 'base64data'}}
      };
      fixture.detectChanges();
      const img = fixture.debugElement.query(CSS_SELECTORS.SCREENSHOT);
      expect(img.nativeElement.src).toBe('data:image/png;base64,base64data');
    });
  });

  describe('Coordinate Scaling', () => {
    it('should calculate style percentage for coordinates', () => {
      component.allMessages = [{
        functionResponses: [
            {name: 'computer', response: {image: {data: 'prev-img'}}}
        ]
      }];
      component.index = 1;
      component.functionCall = {
        name: ComputerTool.COMPUTER,
        args: {action: ComputerAction.LEFT_CLICK, coordinate: [500, 250]}
      };
      fixture.detectChanges();
      const marker = fixture.debugElement.query(CSS_SELECTORS.CLICK_MARKER);
      expect(marker.nativeElement.style.left).toBe('50%');
      expect(marker.nativeElement.style.top).toBe('25%');
    });

    it(
        'should calculate actual pixel coordinates when image dimensions are known',
        () => {
          component.functionCall = {
            name: ComputerTool.COMPUTER,
            args: {action: ComputerAction.LEFT_CLICK, coordinate: [500, 500]}
          };
          component.index = 1;
          component.imageDimensions.set(1, {width: 1920, height: 1080});

          const pixelCoords = component.getActualPixelCoordinates();
          expect(pixelCoords).toEqual({x: 960, y: 540, isVirtual: false});
        });

    it('should match python normalization logic', () => {
      component.functionCall = {
        name: ComputerTool.COMPUTER,
        args: {action: ComputerAction.LEFT_CLICK, coordinate: [333, 666]}
      };
      component.index = 0;
      component.imageDimensions.set(0, {width: 800, height: 600});

      const pixelCoords = component.getActualPixelCoordinates();
      expect(pixelCoords?.x).toBe(266);
      expect(pixelCoords?.y).toBe(400);
    });
  });

  describe('Backward Screenshot Search', () => {
    it('should find the last available screenshot in history (plural schema)', () => {
      component.index = 2;
      component.allMessages = [
        {
          functionResponses: [
            {name: 'computer', response: {image: {data: 'img1'}}}
          ]
        },
        {},
        {}
      ];

      const screenshot = component.getPreviousComputerUseScreenshot();
      expect(screenshot).toContain('img1');
    });
  });
});