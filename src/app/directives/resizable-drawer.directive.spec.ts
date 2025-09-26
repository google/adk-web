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

import {Component} from '@angular/core';
import {ComponentFixture, TestBed} from '@angular/core/testing';
import {By} from '@angular/platform-browser';

import {ResizableDrawerDirective} from './resizable-drawer.directive';

// Directive constants
const SIDE_DRAWER_WIDTH_VAR = '--side-drawer-width';
const INITIAL_WIDTH = 570;
const MIN_WIDTH = 310;

// Test constants
const MOCKED_WINDOW_WIDTH = 2000;
const MAX_WIDTH = MOCKED_WINDOW_WIDTH / 2;  // 1000

@Component({
  template: `
    <div appResizableDrawer>Drawer</div>
    <div class="resize-handler"></div>
  `,
  standalone: true,
  imports: [ResizableDrawerDirective],
})
class TestHostComponent {
}

describe('ResizableDrawerDirective', () => {
  let fixture: ComponentFixture<TestHostComponent>;
  let directiveElement: HTMLElement;
  let resizeHandle: HTMLElement;
  let body: HTMLElement;
  let innerWidthSpy: jasmine.Spy;

  /**
   * Reads the drawer width from the CSS variable on the root element.
   */
  function getDrawerWidth(): number {
    const widthStr = getComputedStyle(document.documentElement)
                         .getPropertyValue(SIDE_DRAWER_WIDTH_VAR);
    return parseFloat(widthStr);
  }

  /**
   * Dispatches a mouse event with a given clientX position.
   */
  function dispatchMouseEvent(
      element: EventTarget, type: string, clientX: number) {
    element.dispatchEvent(new MouseEvent(type, {
      bubbles: true,
      clientX,
    }));
  }

  beforeEach(() => {
    TestBed.configureTestingModule({
      imports: [TestHostComponent],
    });
    innerWidthSpy = spyOnProperty(window, 'innerWidth', 'get');
    innerWidthSpy.and.returnValue(MOCKED_WINDOW_WIDTH);
    fixture = TestBed.createComponent(TestHostComponent);
    directiveElement =
        fixture.debugElement.query(By.directive(ResizableDrawerDirective))
            .nativeElement;
    resizeHandle =
        fixture.debugElement.query(By.css('.resize-handler')).nativeElement;
    body = document.body;
    fixture.detectChanges();  // This calls ngAfterViewInit
    window.dispatchEvent(new Event('resize'));
  });

  afterEach(() => {
    document.documentElement.style.removeProperty(SIDE_DRAWER_WIDTH_VAR);
    body.classList.remove('resizing');
  });

  it('should set initial width to 570px after view init', () => {
    // Assert
    expect(directiveElement.style.width).toBe('var(--side-drawer-width)');
    expect(getDrawerWidth()).toBe(INITIAL_WIDTH);
  });

  it('should resize drawer on mouse drag', () => {
    // Arrange
    const startClientX = 600;
    const moveClientX = 650;  // Drag 50px to the right
    const expectedWidth = INITIAL_WIDTH + (moveClientX - startClientX);

    // Act
    dispatchMouseEvent(resizeHandle, 'mousedown', startClientX);
    dispatchMouseEvent(document, 'mousemove', moveClientX);
    fixture.detectChanges();

    // Assert
    expect(getDrawerWidth()).toBe(expectedWidth);
    expect(body.classList).toContain('resizing');

    // Act: Release mouse
    dispatchMouseEvent(document, 'mouseup', moveClientX);
    fixture.detectChanges();

    // Assert: Resizing class is removed
    expect(body.classList).not.toContain('resizing');
  });

  it('should not resize below min width', () => {
    // Arrange
    const startClientX = 600;
    const moveClientX = 100;  // Attempt to drag far left (-500px)

    // Act
    dispatchMouseEvent(resizeHandle, 'mousedown', startClientX);
    dispatchMouseEvent(document, 'mousemove', moveClientX);
    fixture.detectChanges();

    // Assert
    expect(getDrawerWidth()).toBe(MIN_WIDTH);

    // Cleanup
    dispatchMouseEvent(document, 'mouseup', moveClientX);
  });

  it('should not resize above max width', () => {
    // Arrange
    const startClientX = 100;
    const moveClientX = 9000;  // Attempt to drag far right

    // Act
    dispatchMouseEvent(resizeHandle, 'mousedown', startClientX);
    dispatchMouseEvent(document, 'mousemove', moveClientX);
    fixture.detectChanges();

    // Assert
    expect(getDrawerWidth()).toBe(MAX_WIDTH);

    // Cleanup
    dispatchMouseEvent(document, 'mouseup', moveClientX);
  });

  it('should re-clamp width on window resize if current width exceeds new max width',
     () => {
       // Arrange
       expect(getDrawerWidth()).toBe(INITIAL_WIDTH);  // 570
       const smallWindowWidth = 800;
       const expectedClampedWidth = smallWindowWidth / 2;  // 400

       // Act
       innerWidthSpy.and.returnValue(smallWindowWidth);
       window.dispatchEvent(new Event('resize'));
       fixture.detectChanges();

       // Assert
       expect(getDrawerWidth()).toBe(expectedClampedWidth);
     });
});
