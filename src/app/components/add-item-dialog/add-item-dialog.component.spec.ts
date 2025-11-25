/**
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
import {MatDialogRef, MAT_DIALOG_DATA} from '@angular/material/dialog';
import {AGENT_SERVICE} from '../../core/services/interfaces/agent';
// 1p-ONLY-IMPORTS: import {beforeEach, describe, expect, it}
import {initTestBed} from '../../testing/utils';

import {AddItemDialogComponent} from './add-item-dialog.component';
import {provideNoopAnimations} from '@angular/platform-browser/animations';

describe('AddItemDialogComponent', () => {
  let component: AddItemDialogComponent;
  let fixture: ComponentFixture<AddItemDialogComponent>;

  initTestBed();  // required for 1p compat
  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [AddItemDialogComponent],
      providers: [
        {provide: MatDialogRef, useValue: {}},
        {provide: MAT_DIALOG_DATA, useValue: {}},
        {provide: AGENT_SERVICE, useValue: {}},
        provideNoopAnimations()
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(AddItemDialogComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
