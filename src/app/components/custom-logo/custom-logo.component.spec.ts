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

import { ComponentFixture, TestBed } from '@angular/core/testing';
import { By } from '@angular/platform-browser';
import { CustomLogoComponent } from './custom-logo.component';
import {RuntimeConfigUtil} from '../../../utils/runtime-config-util';

describe('CustomLogoComponent', () => {
  let component: CustomLogoComponent;
  let fixture: ComponentFixture<CustomLogoComponent>;

  const setupTest = (logoConfig: any) => {
    spyOn(RuntimeConfigUtil, 'getRuntimeConfig').and.returnValue({
      logo: logoConfig,
    } as any);

    TestBed.configureTestingModule({
      imports: [CustomLogoComponent],
    }).compileComponents();

    fixture = TestBed.createComponent(CustomLogoComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  };

  describe('with valid logo config', () => {
    beforeEach(() => {
      setupTest({ imageUrl: 'test.png', text: 'Test Logo' });
    });

    it('should render the logo and text', () => {
      const linkElement = fixture.debugElement.query(By.css('a'));
      const imgElement = fixture.debugElement.query(By.css('img'));

      expect(imgElement.nativeElement.src).toContain('test.png');
      expect(linkElement.nativeElement.textContent).toContain('Test Logo');
    });
  });

  describe('with invalid logo config', () => {
    it('should show an error if imageUrl is missing', () => {
      setupTest({ text: 'Test Logo' });
      const errorElement = fixture.debugElement.query(By.css('div'));

      expect(errorElement.nativeElement.textContent).toContain(
        'Invalid custom logo config'
      );
    });

    it('should show an error if text is missing', () => {
      setupTest({ imageUrl: 'test.png' });
      const errorElement = fixture.debugElement.query(By.css('div'));

      expect(errorElement.nativeElement.textContent).toContain(
        'Invalid custom logo config'
      );
    });

    it('should show an error if logoConfig is missing', () => {
      setupTest(undefined);
      const errorElement = fixture.debugElement.query(By.css('div'));

      expect(errorElement.nativeElement.textContent).toContain(
        'Invalid custom logo config'
      );
    });
  });
});
