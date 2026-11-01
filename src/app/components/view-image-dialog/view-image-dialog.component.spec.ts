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

// 1p-ONLY-IMPORTS: import {beforeEach, describe, expect, it}
import {ComponentFixture, TestBed} from '@angular/core/testing';
import {MAT_DIALOG_DATA, MatDialogRef} from '@angular/material/dialog';
import {By} from '@angular/platform-browser';

import {SAFE_VALUES_SERVICE} from '../../core/services/interfaces/safevalues';
import {MockSafeValuesService} from '../../core/services/testing/mock-safevalues.service';
import {initTestBed} from '../../testing/utils';
import {ViewImageDialogComponent, ViewImageDialogData} from './view-image-dialog.component';

describe('ViewImageDialogComponent', () => {
  let component: ViewImageDialogComponent;
  let fixture: ComponentFixture<ViewImageDialogComponent>;
  let mockDialogRef: MatDialogRef<ViewImageDialogComponent>;
  let mockDialogData: ViewImageDialogData;

  let mockSafeValuesService: MockSafeValuesService;

  beforeEach(async () => {
    mockDialogRef = jasmine.createSpyObj('MatDialogRef', ['close']);
    mockDialogData = {imageData: null};

    initTestBed();  // required for 1p compat
    await TestBed
        .configureTestingModule({
          imports: [ViewImageDialogComponent],
          providers: [
            {provide: MatDialogRef, useValue: mockDialogRef},
            {provide: MAT_DIALOG_DATA, useValue: mockDialogData},
            {provide: SAFE_VALUES_SERVICE, useClass: MockSafeValuesService},
          ],
        })
        .compileComponents();
  });

  beforeEach(() => {
    mockSafeValuesService =
        TestBed.inject(SAFE_VALUES_SERVICE) as MockSafeValuesService;
  });

  /**
   * Instantiates the dialog. Call this after setting `mockDialogData`, since
   * the component reads it in ngOnInit.
   */
  function createComponent() {
    fixture = TestBed.createComponent(ViewImageDialogComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();    // Initial change detection
  }

  it('should create', () => {
    createComponent();

    expect(component).toBeTruthy();
  });

  it('should display base64 image correctly', () => {
    // A tiny transparent base64 image (1x1 pixel)
    const base64Image =
        'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNkYAAAAAYAAjCB0C8AAAAASUVORK5CYII=';
    mockDialogData.imageData = base64Image;
    mockSafeValuesService.bypassSecurityTrustUrl.and.returnValue(
        'data:image/png;base64,' + base64Image);

    createComponent();

    const imgElement = fixture.debugElement.query(By.css('.image-wrapper img'));
    expect(imgElement).not.toBeNull();
    expect(mockSafeValuesService.bypassSecurityTrustUrl)
        .toHaveBeenCalledWith('data:image/png;base64,' + base64Image);
    expect(imgElement.nativeElement.src).toEqual(
        'data:image/png;base64,' + base64Image);
    expect(component.isSvgContent).toBeFalse();
  });

  it(
      'should call dialogRef.close() when close button is clicked', () => {
        createComponent();

        const closeButton =
            fixture.debugElement.query(By.css('.close-button'));
        closeButton.nativeElement.click();
        expect(mockDialogRef.close).toHaveBeenCalled();
      });

  it('should show no image placeholder if imageData is null', () => {
    mockDialogData.imageData = null;

    createComponent();

    const placeholder =
        fixture.debugElement.query(By.css('.no-image-placeholder'));
    expect(placeholder).not.toBeNull();
    expect(placeholder.nativeElement.textContent)
        .toContain('No image data provided.');
  });

  it('should display image title if url is provided', () => {
    const testData = 'data:image/png;base64,xyz';
    const testUrl = 'http://example.com';
    mockDialogData.imageData = testData;
    mockDialogData.images = [testData];
    mockDialogData.urls = [testUrl];
    mockSafeValuesService.bypassSecurityTrustUrl.and.returnValue(testData);

    createComponent();

    const titleElement = fixture.debugElement.query(By.css('.image-title'));
    expect(titleElement).not.toBeNull();
    expect(titleElement.nativeElement.textContent).toContain(testUrl);
  });

  it(
      'should display highlight circle if coordinate is provided', () => {
        const testData = 'data:image/png;base64,xyz';
        mockDialogData.imageData = testData;
        mockDialogData.images = [testData];
        mockDialogData.coordinates = [{x: 500, y: 500}];
        mockSafeValuesService.bypassSecurityTrustUrl.and.returnValue(testData);

        createComponent();

        const highlightElement =
            fixture.debugElement.query(By.css('.highlight-circle'));
        expect(highlightElement).not.toBeNull();

        const style = highlightElement.nativeElement.style;
        expect(style.left).toBe('50%');
        expect(style.top).toBe('50%');
      });

  describe('SVG content', () => {
    // Artifacts and tool responses are attacker-controlled. SVG must never be
    // injected into the page as HTML, because <foreignObject>, <script> and
    // event handler attributes all execute in the dev UI's origin when it is.
    // Rendering through <img> puts the SVG in an image context, where browsers
    // run none of it.
    const xssPayloads: Array<[string, string]> = [
      [
        'foreignObject with onerror',
        '<svg xmlns="http://www.w3.org/2000/svg"><foreignObject>' +
            '<body xmlns="http://www.w3.org/1999/xhtml">' +
            '<img src=x onerror="alert(\'XSS\')"/></body></foreignObject></svg>',
      ],
      ['onload handler', '<svg onload="alert(\'XSS\')"></svg>'],
      [
        'script element',
        // Split so the source never contains a literal closing script tag.
        '<svg><script>alert(\'XSS\')<' +
            '/script></svg>',
      ],
      [
        'CDATA section',
        '<svg><foreignObject><![CDATA[<img src=x onerror="alert(1)">]]>' +
            '</foreignObject></svg>',
      ],
      [
        'namespaced script element',
        '<svg xmlns:foo="http://example.com"><foo:script>alert(1)' +
            '</foo:script></svg>',
      ],
      [
        'xlink:href javascript URL',
        '<svg><use xlink:href="javascript:alert(1)"></use></svg>',
      ],
      [
        'plain href javascript URL',
        '<svg><a href="javascript:alert(1)"></a></svg>',
      ],
    ];

    beforeEach(() => {
      mockSafeValuesService.bypassSecurityTrustUrl.and.callFake(
          (url: string) => url);
    });

    for (const [name, payload] of xssPayloads) {
      it(`renders ${name} as an image instead of markup`, () => {
        mockDialogData.imageData = payload;

        createComponent();

        expect(component.isSvgContent).toBeTrue();
        // The payload must never be handed to the DOM as trusted HTML.
        expect(mockSafeValuesService.bypassSecurityTrustHtml)
            .not.toHaveBeenCalled();

        // It reaches the page only as the URL of an <img>, where it is inert.
        const expectedUrl =
            'data:image/svg+xml;charset=utf-8,' + encodeURIComponent(payload);
        expect(mockSafeValuesService.bypassSecurityTrustUrl)
            .toHaveBeenCalledWith(expectedUrl);
        const img = fixture.debugElement.query(By.css('.image-wrapper img'));
        expect(img.nativeElement.getAttribute('src')).toEqual(expectedUrl);

        // Nothing from the payload may be parsed into live DOM nodes, and no
        // inline event handler may survive anywhere in the dialog.
        const host = fixture.debugElement.nativeElement as HTMLElement;
        expect(host.querySelector('foreignObject')).toBeNull();
        expect(host.querySelector('script')).toBeNull();
        const handlerAttrs: string[] = [];
        for (const el of Array.from(host.querySelectorAll('*'))) {
          for (const attr of Array.from(el.attributes)) {
            if (attr.name.startsWith('on')) {
              handlerAttrs.push(attr.name);
            }
          }
        }
        expect(handlerAttrs).toEqual([]);
      });
    }

    it('renders SVG through the img element', () => {
      mockDialogData.imageData =
          '<svg xmlns="http://www.w3.org/2000/svg"></svg>';

      createComponent();

      expect(fixture.debugElement.query(By.css('.image-wrapper img')))
          .not.toBeNull();
    });

    it('preserves non-ASCII markup', () => {
      const svg =
          '<svg xmlns="http://www.w3.org/2000/svg"><text>\u65e5\u672c</text></svg>';
      mockDialogData.imageData = svg;

      createComponent();

      const url =
          mockSafeValuesService.bypassSecurityTrustUrl.calls.mostRecent()
              .args[0] as string;
      expect(decodeURIComponent(url.split(',')[1])).toEqual(svg);
    });
  });
});
