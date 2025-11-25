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
import { MAT_DIALOG_DATA, MatDialogRef } from '@angular/material/dialog';
import { NoopAnimationsModule } from '@angular/platform-browser/animations';
// 1p-ONLY-IMPORTS: import {beforeEach, describe, expect, it}
import {initTestBed} from '../../testing/utils';

import { AddCallbackDialogComponent } from './add-callback-dialog.component';

describe('AddCallbackDialogComponent', () => {
  let component: AddCallbackDialogComponent;
  let fixture: ComponentFixture<AddCallbackDialogComponent>;
  let mockDialogRef: jasmine.SpyObj<MatDialogRef<AddCallbackDialogComponent>>;

  beforeEach(async () => {
    const dialogRefSpy = jasmine.createSpyObj('MatDialogRef', ['close']);

    initTestBed();  // required for 1p compat
    await TestBed.configureTestingModule({
      imports: [AddCallbackDialogComponent, NoopAnimationsModule],
      providers: [
        { provide: MatDialogRef, useValue: dialogRefSpy },
        { provide: MAT_DIALOG_DATA, useValue: {} },
      ]
    })
    .compileComponents();

    fixture = TestBed.createComponent(AddCallbackDialogComponent);
    component = fixture.componentInstance;
    mockDialogRef = TestBed.inject(MatDialogRef) as jasmine.SpyObj<MatDialogRef<AddCallbackDialogComponent>>;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('should disable create button when callback name is empty', () => {
    component.callbackName = '';
    expect(component.createDisabled()).toBe(true);
  });

  it('should enable create button when callback name is provided', () => {
    component.callbackName = 'test_callback';
    expect(component.createDisabled()).toBe(false);
  });

  it('should close dialog with callback data when addCallback is called', () => {
    component.callbackName = 'test_callback';
    component.callbackType = 'after_agent';

    component.addCallback();

    expect(mockDialogRef.close).toHaveBeenCalledWith({
      name: 'test_callback',
      type: 'after_agent',
      isEditMode: false,
      originalName: 'test_callback',
    });
  });

  it('should allow editing existing callback without flagging duplicate name', () => {
    component.callbackName = 'existing_callback';
    component.callbackType = 'before_agent';
    component.isEditMode = true;
    component['originalCallbackName'] = 'existing_callback';
    component.existingCallbackNames = ['another_callback'];

    expect(component.isDuplicateName()).toBeFalse();
    component.addCallback();

    expect(mockDialogRef.close).toHaveBeenCalledWith({
      name: 'existing_callback',
      type: 'before_agent',
      isEditMode: true,
      originalName: 'existing_callback',
    });
  });

  it('should not close dialog when callback name is empty', () => {
    component.callbackName = '';

    component.addCallback();

    expect(mockDialogRef.close).not.toHaveBeenCalled();
  });

  it('should close dialog without data when cancel is called', () => {
    component.cancel();

    expect(mockDialogRef.close).toHaveBeenCalledWith();
  });
});
