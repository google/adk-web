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

// 1p-ONLY-IMPORTS: import {beforeEach, describe, expect, it}
import {initTestBed} from '../../testing/utils';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { MAT_DIALOG_DATA, MatDialogRef } from '@angular/material/dialog';
import { NoopAnimationsModule } from '@angular/platform-browser/animations';

import { SystemInstructionDiffDialogComponent } from './system-instruction-diff-dialog.component';

describe('SystemInstructionDiffDialogComponent', () => {
  let component: SystemInstructionDiffDialogComponent;
  let fixture: ComponentFixture<SystemInstructionDiffDialogComponent>;
  let mockDialogRef: jasmine.SpyObj<MatDialogRef<SystemInstructionDiffDialogComponent>>;

  const MOCK_DATA = {
    precedingInstruction: 'You are an agent.\nInternal name: empty_agent.\nOld instruction.',
    currentInstruction: 'You are an agent.\nInternal name: empty_agent.\nNew instruction.\nAdded line.'
  };

  beforeEach(async () => {
    mockDialogRef = jasmine.createSpyObj('MatDialogRef', ['close']);

    initTestBed();  // required for 1p compat
    await TestBed.configureTestingModule({
      imports: [SystemInstructionDiffDialogComponent, NoopAnimationsModule],
      providers: [
        { provide: MatDialogRef, useValue: mockDialogRef },
        { provide: MAT_DIALOG_DATA, useValue: MOCK_DATA }
      ]
    }).compileComponents();

    fixture = TestBed.createComponent(SystemInstructionDiffDialogComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create and calculate diff rows successfully', () => {
    expect(component).toBeTruthy();
    expect(component.diffRows.length).toBeGreaterThan(0);
  });

  it('should align identical lines correctly', () => {
    const identicalRow = component.diffRows[0];
    expect(identicalRow.left.type).toBe('unchanged');
    expect(identicalRow.left.value).toBe('You are an agent.');
    expect(identicalRow.right.type).toBe('unchanged');
    expect(identicalRow.right.value).toBe('You are an agent.');
  });

  it('should pair modified lines on the same row', () => {
    // line 3 was 'Old instruction.' in preceding, and 'New instruction.' in current
    const modifiedRow = component.diffRows.find(
      row => row.left.type === 'removed' && row.right.type === 'added'
    );
    expect(modifiedRow).toBeDefined();
    expect(modifiedRow?.left.value).toBe('Old instruction.');
    expect(modifiedRow?.right.value).toBe('New instruction.');
  });

  it('should render pure additions with gap alignment', () => {
    // 'Added line.' was added at the end of the current instruction
    const addedRow = component.diffRows.find(
      row => row.left.type === 'empty' && row.right.type === 'added'
    );
    expect(addedRow).toBeDefined();
    expect(addedRow?.left.value).toBe('');
    expect(addedRow?.right.value).toBe('Added line.');
  });

  it('should generate character level diff tokens for modified lines', () => {
    // line 3 was 'Old instruction.' in preceding, and 'New instruction.' in current
    const modifiedRow = component.diffRows.find(
      row => row.left.type === 'removed' && row.right.type === 'added'
    );
    expect(modifiedRow).toBeDefined();
    
    // Left tokens should highlight 'Old' as removed
    const leftTokens = modifiedRow?.left.tokens;
    expect(leftTokens).toBeDefined();
    const removedToken = leftTokens?.find(t => t.type === 'removed');
    expect(removedToken).toBeDefined();
    expect(removedToken?.value).toBe('Old');

    // Right tokens should highlight 'New' as added
    const rightTokens = modifiedRow?.right.tokens;
    expect(rightTokens).toBeDefined();
    const addedToken = rightTokens?.find(t => t.type === 'added');
    expect(addedToken).toBeDefined();
    expect(addedToken?.value).toBe('New');

    // Unchanged tokens should represent the shared suffix ' instruction.'
    const unchangedToken = rightTokens?.find(t => t.type === 'unchanged' && t.value.includes('instruction.'));
    expect(unchangedToken).toBeDefined();
  });

  it('should close the dialog when close is called', () => {
    component.close();
    expect(mockDialogRef.close).toHaveBeenCalled();
  });
});
