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

import { Component, inject } from '@angular/core';
import { MatIconModule } from '@angular/material/icon';
import { MatButtonModule } from '@angular/material/button';
import { MatTooltipModule } from '@angular/material/tooltip';
import { ThemeService } from '../../core/services/theme.service';

@Component({
  selector: 'app-theme-toggle',
  imports: [MatIconModule, MatButtonModule, MatTooltipModule],
  templateUrl: './theme-toggle.html',
  styleUrl: './theme-toggle.scss',
})
export class ThemeToggle {
  readonly themeService = inject(ThemeService);

  get currentTheme() {
    return this.themeService.currentTheme();
  }

  get themeIcon() {
    return this.currentTheme === 'light' ? 'dark_mode' : 'light_mode';
  }

  get themeTooltip() {
    return this.currentTheme === 'light'
      ? 'Switch to dark mode'
      : 'Switch to light mode';
  }

  toggleTheme() {
    this.themeService.toggleTheme();
  }
}
