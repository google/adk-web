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
import {MAT_DIALOG_DATA, MatDialogModule, MatDialogRef} from '@angular/material/dialog';
import {By} from '@angular/platform-browser';


import {ViewImageDialogComponent, ViewImageDialogData} from './view-image-dialog.component';

describe('ViewImageDialogComponent', () => {
  let component: ViewImageDialogComponent;
  let fixture: ComponentFixture<ViewImageDialogComponent>;
  let mockDialogRef: MatDialogRef<ViewImageDialogComponent>;
  let mockDialogData: ViewImageDialogData;

  beforeEach(async () => {
    mockDialogRef = jasmine.createSpyObj('MatDialogRef', ['close']);
    mockDialogData = {imageData: null};

    await TestBed.configureTestingModule({
      imports: [MatDialogModule, ViewImageDialogComponent],
      providers: [
        {provide: MatDialogRef, useValue: mockDialogRef},
        {provide: MAT_DIALOG_DATA, useValue: mockDialogData},
      ],
    }).compileComponents();
  });

  beforeEach(() => {
    fixture = TestBed.createComponent(ViewImageDialogComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();  // Initial change detection
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('should display base64 image correctly', () => {
    // A tiny transparent base64 image (1x1 pixel)
    const base64Image =
        'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNkYAAAAAYAAjCB0C8AAAAASUVORK5CYII=';
    mockDialogData.imageData = base64Image;
    component.ngOnInit();  // Manually call ngOnInit as it's not triggered by
                           // fixture.detectChanges for @Input changes
    fixture.detectChanges();

    const imgElement = fixture.debugElement.query(By.css('.image-wrapper img'));
    expect(imgElement).not.toBeNull();
    expect(imgElement.nativeElement.src)
        .toContain('data:image/png;base64,' + base64Image);
    expect(component.isSvgContent).toBeFalse();
  });

  it('should call dialogRef.close() when close button is clicked', () => {
    const closeButton = fixture.debugElement.query(By.css('.close-button'));
    closeButton.nativeElement.click();
    expect(mockDialogRef.close).toHaveBeenCalled();
  });

  it('should show no image placeholder if imageData is null', () => {
    mockDialogData.imageData = null;
    component.ngOnInit();  // Manually call ngOnInit
    fixture.detectChanges();

    const placeholder =
        fixture.debugElement.query(By.css('.no-image-placeholder'));
    expect(placeholder).not.toBeNull();
    expect(placeholder.nativeElement.textContent)
        .toContain('No image data provided.');
  });
});
