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

import {HttpClientTestingModule} from '@angular/common/http/testing';
import {TestBed} from '@angular/core/testing';

import {SafeValuesServiceImpl} from './safevalues.service';

describe('SafeValuesService', () => {
  let service: SafeValuesServiceImpl;

  beforeEach(() => {
    TestBed.configureTestingModule({
      imports: [HttpClientTestingModule],
      providers: [SafeValuesServiceImpl],
    });
    service = TestBed.inject(SafeValuesServiceImpl);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });

  describe('windowOpen', () => {
    it('should call window.open', () => {
      const windowSpy = spyOn(window, 'open');
      const url = 'http://test.com';
      const target = '_blank';
      const features = 'noreferrer';

      service.windowOpen(window, url, target, features);

      expect(windowSpy).toHaveBeenCalledWith(url, target, features);
    });
  });

  describe('createObjectUrl', () => {
    it('should call URL.createObjectURL', () => {
      const urlSpy = spyOn(URL, 'createObjectURL');
      const blob = new Blob();

      service.createObjectUrl(blob);

      expect(urlSpy).toHaveBeenCalledWith(blob);
    });
  });

  describe('openBlobUrl', () => {
    it('should call createObjectUrl and windowOpen', () => {
      const createObjectUrlSpy =
          spyOn(service, 'createObjectUrl').and.returnValue('blob:url');
      const windowOpenSpy = spyOn(service, 'windowOpen');
      const blob = new Blob();

      service.openBlobUrl(blob);

      expect(createObjectUrlSpy).toHaveBeenCalledWith(blob);
      expect(windowOpenSpy).toHaveBeenCalledWith(window, 'blob:url', '_blank');
    });
  });

  describe('setAnchorHref', () => {
    it('should set anchor href', () => {
      const anchor = document.createElement('a');
      const url = 'http://test.com/';

      service.setAnchorHref(anchor, url);

      expect(anchor.href).toEqual(url);
    });
  });

  describe('openBase64InNewTab', () => {
    it('should open blob url from base64 data', () => {
      const dataUrl =
          'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNkYPhfDwAChwGA60e6kgAAAABJRU5ErkJggg==';
      const mimeType = 'image/png';
      const openBlobUrlSpy = spyOn(service, 'openBlobUrl').and.returnValue({
        focus: () => {},
      } as Window);

      service.openBase64InNewTab(dataUrl, mimeType);

      expect(openBlobUrlSpy).toHaveBeenCalled();
      const blob = openBlobUrlSpy.calls.mostRecent().args[0];
      expect(blob.type).toEqual(mimeType);
      expect(blob.size).toBeGreaterThan(0);
    });

    it('should do nothing if dataUrl is empty', () => {
      const openBlobUrlSpy = spyOn(service, 'openBlobUrl');
      service.openBase64InNewTab('', 'image/png');
      expect(openBlobUrlSpy).not.toHaveBeenCalled();
    });

    it('should do nothing if mimeType is empty', () => {
      const openBlobUrlSpy = spyOn(service, 'openBlobUrl');
      service.openBase64InNewTab('base64data', '');
      expect(openBlobUrlSpy).not.toHaveBeenCalled();
    });

    it('should show alert if window cannot be opened', () => {
      spyOn(service, 'openBlobUrl').and.returnValue(null);
      const alertSpy = spyOn(window, 'alert');
      service.openBase64InNewTab(
          'data:image/png;base64,base64data', 'image/png');
      expect(alertSpy).toHaveBeenCalled();
    });

    it('should show alert on error', () => {
      spyOn(window, 'atob').and.throwError('error');
      const alertSpy = spyOn(window, 'alert');
      service.openBase64InNewTab(
          'data:image/png;base64,base64data', 'image/png');
      expect(alertSpy).toHaveBeenCalled();
    });
  });
});
