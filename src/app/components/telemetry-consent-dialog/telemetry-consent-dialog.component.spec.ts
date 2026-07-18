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

import {ComponentFixture, TestBed} from '@angular/core/testing';
import {MatDialogRef} from '@angular/material/dialog';
import {provideNoopAnimations} from '@angular/platform-browser/animations';
// 1p-ONLY-IMPORTS: import {beforeEach, describe, expect, it}

import {TelemetryService} from '../../core/services/telemetry.service';
import {initTestBed} from '../../testing/utils';

import {TelemetryConsentDialogComponent} from './telemetry-consent-dialog.component';

describe('TelemetryConsentDialogComponent', () => {
  let component: TelemetryConsentDialogComponent;
  let fixture: ComponentFixture<TelemetryConsentDialogComponent>;
  let mockTelemetryService: jasmine.SpyObj<TelemetryService>;
  let mockDialogRef:
      jasmine.SpyObj<MatDialogRef<TelemetryConsentDialogComponent>>;

  initTestBed();

  beforeEach(async () => {
    mockTelemetryService = jasmine.createSpyObj<TelemetryService>(
        'TelemetryService', ['setTelemetry']);
    mockDialogRef =
        jasmine.createSpyObj<MatDialogRef<TelemetryConsentDialogComponent>>(
            'MatDialogRef', ['close']);

    await TestBed
        .configureTestingModule({
          imports: [TelemetryConsentDialogComponent],
          providers: [
            {provide: TelemetryService, useValue: mockTelemetryService},
            {provide: MatDialogRef, useValue: mockDialogRef},
            provideNoopAnimations(),
          ],
        })
        .compileComponents();

    fixture = TestBed.createComponent(TelemetryConsentDialogComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it(
      'should set telemetry to true and close when enable clicked',
      () => {
        component.onEnable();
        expect(mockTelemetryService.setTelemetry).toHaveBeenCalledWith(true);
        expect(mockDialogRef.close).toHaveBeenCalledWith(true);
      });

  it(
      'should set telemetry to false and close when no thanks clicked',
      () => {
        component.onNoThanks();
        expect(mockTelemetryService.setTelemetry).toHaveBeenCalledWith(false);
        expect(mockDialogRef.close).toHaveBeenCalledWith(false);
      });

  it(
      'should close dialog without setting preference when dismissed', () => {
        component.onDismiss();
        expect(mockTelemetryService.setTelemetry).not.toHaveBeenCalled();
        expect(mockDialogRef.close).toHaveBeenCalledWith();
      });
});
