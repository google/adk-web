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

// dialog.component.spec.ts
import {ComponentFixture, TestBed} from '@angular/core/testing';
import {MatButtonModule} from '@angular/material/button';
import {
  MAT_DIALOG_DATA,
  MatDialogModule,
  MatDialogRef,
} from '@angular/material/dialog';

import {
  DeleteSessionDialogComponent,
  DeleteSessionDialogData,
} from './delete-session-dialog.component';

describe('DeleteSessionDialogComponent', () => {
  let component: DeleteSessionDialogComponent;
  let fixture: ComponentFixture<DeleteSessionDialogComponent>;
  const mockDialogRef = {
    close: jasmine.createSpy('close'),
  };
  const mockDialogData: DeleteSessionDialogData = {
    title: 'Test Title',
    message: 'Test Message',
    confirmButtonText: 'Confirm',
    cancelButtonText: 'Cancel',
  };

  beforeEach(async () => {
    await TestBed.configureTestingModule({
    imports: [MatDialogModule, MatButtonModule, DeleteSessionDialogComponent],
    providers: [
        { provide: MatDialogRef, useValue: mockDialogRef },
        { provide: MAT_DIALOG_DATA, useValue: mockDialogData },
    ],
}).compileComponents();
  });

  beforeEach(() => {
    fixture = TestBed.createComponent(DeleteSessionDialogComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('should display the correct title and message', () => {
    const titleElement = fixture.nativeElement.querySelector('h2');
    const messageElement = fixture.nativeElement.querySelector('p');

    expect(titleElement.textContent).toContain('Test Title');
    expect(messageElement.textContent).toContain('Test Message');
  });

  it('should close the dialog with true when confirm is clicked', () => {
    const confirmButton = fixture.nativeElement.querySelectorAll('button')[1];
    confirmButton.click();
    expect(mockDialogRef.close).toHaveBeenCalledWith(true);
  });

  it('should close the dialog with false when cancel is clicked', () => {
    const cancelButton = fixture.nativeElement.querySelectorAll('button')[0];
    cancelButton.click();
    expect(mockDialogRef.close).toHaveBeenCalledWith(false);
  });
});
