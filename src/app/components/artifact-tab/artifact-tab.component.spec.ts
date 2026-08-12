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
import { MatDialog, MatDialogModule } from '@angular/material/dialog';
import { ArtifactTabComponent } from './artifact-tab.component';
import { DownloadService } from '../../core/services/download.service';
import { NoopAnimationsModule } from '@angular/platform-browser/animations';
import { SAFE_VALUES_SERVICE } from '../../core/services/interfaces/safevalues';
import {DOWNLOAD_SERVICE} from '../../core/services/interfaces/download';
import { MockSafeValuesService } from '../../core/services/testing/mock-safevalues.service';

describe('ArtifactTabComponent', () => {
  let component: ArtifactTabComponent;
  let fixture: ComponentFixture<ArtifactTabComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [MatDialogModule, ArtifactTabComponent, NoopAnimationsModule],
      providers: [
        { provide: MatDialog, useValue: jasmine.createSpyObj('MatDialog', ['open']) },
        {
          provide: DOWNLOAD_SERVICE,
          useValue: jasmine.createSpyObj<DownloadService>([
            'downloadBase64Data',
          ]),
        },
        { provide: SAFE_VALUES_SERVICE, useClass: MockSafeValuesService },
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(ArtifactTabComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  describe('getTextContent', () => {
    const toDataUrl = (text: string) => {
      const base64 = btoa(
        String.fromCharCode(...new TextEncoder().encode(text)),
      );
      return `data:text/plain;base64,${base64}`;
    };

    it('should decode multibyte UTF-8 content without garbling it', () => {
      const text = 'こんにちは 🌙 مرحبا';
      expect(component['getTextContent'](toDataUrl(text))).toBe(text);
    });

    it('should still decode ASCII content', () => {
      const text = 'Hello, world!';
      expect(component['getTextContent'](toDataUrl(text))).toBe(text);
    });

    it('should return an empty string for an empty data URL', () => {
      expect(component['getTextContent']('')).toBe('');
    });
  });
});
