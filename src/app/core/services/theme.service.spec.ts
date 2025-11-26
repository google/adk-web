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

// 1p-ONLY-IMPORTS: import {beforeEach, describe, expect, it}
import {initTestBed} from '../../testing/utils';
import { TestBed } from '@angular/core/testing';
import { ThemeService } from './theme.service';

describe('ThemeService', () => {
  let service: ThemeService;

  beforeEach(() => {
    window.localStorage.clear();
    initTestBed();  // required for 1p compat
    TestBed.configureTestingModule({});
    service = TestBed.inject(ThemeService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });

  it('should default to dark theme', () => {
    expect(service.currentTheme()).toBe('dark');
  });

  it('should toggle theme from dark to light', () => {
    service.setTheme('dark');
    service.toggleTheme();
    expect(service.currentTheme()).toBe('light');
  });

  it('should toggle theme from light to dark', () => {
    service.setTheme('light');
    service.toggleTheme();
    expect(service.currentTheme()).toBe('dark');
  });

  it('should persist theme to localStorage', () => {
    service.setTheme('light');
    TestBed.flushEffects();
    expect(window.localStorage.getItem('adk-theme-preference')).toBe('light');
  });
});
