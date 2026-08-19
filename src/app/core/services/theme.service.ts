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

import { Injectable, signal, effect } from '@angular/core';
import { ThemeServiceInterface, Theme } from './interfaces/theme';
import {setLinkHrefAndRel} from 'safevalues/dom';
import {trustedResourceUrl} from 'safevalues';

@Injectable({
  providedIn: 'root'
})
export class ThemeService implements ThemeServiceInterface {
  private readonly THEME_STORAGE_KEY = 'adk-theme-preference';

  // Signal to track current theme
  readonly currentTheme = signal<Theme>(this.getInitialTheme());

  constructor() {
    // Apply theme whenever it changes
    effect(() => {
      this.applyTheme(this.currentTheme());
    });
  }

  private getInitialTheme(): Theme {
    // Check localStorage first
    const stored = window.localStorage.getItem(this.THEME_STORAGE_KEY);
    if (stored === 'light' || stored === 'dark') {
      return stored;
    }

    // Default to dark mode (current behavior)
    return 'dark';
  }

  private applyTheme(theme: Theme): void {
    const htmlElement = document.documentElement;

    // Remove both theme classes
    htmlElement.classList.remove('light-theme', 'dark-theme');

    // Add the current theme class
    htmlElement.classList.add(`${theme}-theme`);

    // Update color-scheme for native browser controls
    htmlElement.style.colorScheme = theme;

    // Save to localStorage
    window.localStorage.setItem(this.THEME_STORAGE_KEY, theme);

    // Update Prism theme
    this.updatePrismTheme(theme);
  }

  private updatePrismTheme(theme: Theme): void {
    const linkId = "prism-theme-style";
    let linkElement = document.getElementById(linkId) as HTMLLinkElement;
    if (!linkElement) {
      linkElement = document.createElement("link");
      linkElement.id = linkId;
      document.head.appendChild(linkElement);
    }
    setLinkHrefAndRel(
      linkElement,
      theme === "light" ? trustedResourceUrl`prism-light.css` : trustedResourceUrl`prism-dark.css`,
      "stylesheet",
    );
  }

  toggleTheme(): void {
    this.currentTheme.update(current => current === 'light' ? 'dark' : 'light');
  }

  setTheme(theme: Theme): void {
    this.currentTheme.set(theme);
  }
}
