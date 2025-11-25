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

import {TestBed} from '@angular/core/testing';
// 1p-ONLY-IMPORTS: import {beforeEach, describe, expect, it,}

import {initTestBed} from '../../testing/utils';

import {DownloadService} from './download.service';
import {SAFE_VALUES_SERVICE} from './interfaces/safevalues';
import {MockSafeValuesService} from './testing/mock-safevalues.service';

const FILE_NAME_PNG = 'test.png';
const FILE_NAME_JSON = 'test.json';
const MIME_TYPE_PNG = 'image/png';
const OCTET_STREAM = 'application/octet-stream';
const ANCHOR = 'a';

describe('DownloadService', () => {
  let service: DownloadService;
  let mockAnchor: jasmine.SpyObj<HTMLAnchorElement>;
  let createElementSpy: jasmine.Spy;
  let appendChildSpy: jasmine.Spy;
  let removeChildSpy: jasmine.Spy;
  let safeValuesService: MockSafeValuesService;

  beforeEach(() => {
    initTestBed();  // required for 1p compat
    TestBed.configureTestingModule({
      providers: [
        DownloadService,
        {provide: SAFE_VALUES_SERVICE, useClass: MockSafeValuesService},
      ],
    });
    service = TestBed.inject(DownloadService);
    safeValuesService = TestBed.inject(
                            SAFE_VALUES_SERVICE,
                            ) as MockSafeValuesService;

    mockAnchor = jasmine.createSpyObj('HTMLAnchorElement', ['click']);
    createElementSpy = spyOn(document, 'createElement')
                           .and.returnValue(
                               mockAnchor,
                           );
    appendChildSpy = spyOn(document.body, 'appendChild');
    removeChildSpy = spyOn(document.body, 'removeChild');
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });

  describe('downloadBase64Data', () => {
    const base64Data = 'data:image/png;base64,abc';
    const mimeType = 'image/png';

    it('should create an anchor element', () => {
      service.downloadBase64Data(base64Data, mimeType, FILE_NAME_PNG);
      expect(createElementSpy).toHaveBeenCalledWith(ANCHOR);
    });

    it('should call safeValuesService.setAnchorHref', () => {
      service.downloadBase64Data(base64Data, mimeType, FILE_NAME_PNG);
      expect(safeValuesService.setAnchorHref)
          .toHaveBeenCalledWith(
              mockAnchor,
              base64Data,
          );
    });

    it('should set download attribute to filename', () => {
      service.downloadBase64Data(base64Data, mimeType, FILE_NAME_PNG);
      expect(mockAnchor.download).toBe(FILE_NAME_PNG);
    });

    it('should append anchor to body', () => {
      service.downloadBase64Data(base64Data, mimeType, FILE_NAME_PNG);
      expect(appendChildSpy).toHaveBeenCalledWith(mockAnchor);
    });

    it('should click anchor', () => {
      service.downloadBase64Data(base64Data, mimeType, FILE_NAME_PNG);
      expect(mockAnchor.click).toHaveBeenCalled();
    });

    it('should remove anchor from body', () => {
      service.downloadBase64Data(base64Data, mimeType, FILE_NAME_PNG);
      expect(removeChildSpy).toHaveBeenCalledWith(mockAnchor);
    });
  });

  describe('downloadObjectAsJson', () => {
    const data = {key: 'value'};
    const jsonString = JSON.stringify(data, null, 2);
    const blobUrl = 'blob:foo';

    let blobSpy: jasmine.Spy;
    let revokeObjectURLSpy: jasmine.Spy;

    beforeEach(() => {
      blobSpy = spyOn(window, 'Blob').and.callThrough();
      revokeObjectURLSpy = spyOn(URL, 'revokeObjectURL');
      safeValuesService.createObjectUrl.and.returnValue(blobUrl);
    });

    it('should stringify object to JSON', () => {
      spyOn(JSON, 'stringify').and.callThrough();
      service.downloadObjectAsJson(data, FILE_NAME_JSON);
      expect(JSON.stringify).toHaveBeenCalledWith(data, null, 2);
    });

    it('should create a Blob with JSON string', () => {
      service.downloadObjectAsJson(data, FILE_NAME_JSON);
      expect(blobSpy).toHaveBeenCalledWith([jsonString], {
        type: OCTET_STREAM,
      });
    });

    it('should call safeValuesService.createObjectUrl with blob', () => {
      service.downloadObjectAsJson(data, FILE_NAME_JSON);
      expect(safeValuesService.createObjectUrl).toHaveBeenCalled();
      expect(
          safeValuesService.createObjectUrl.calls.mostRecent().args[0].type,
          )
          .toBe(OCTET_STREAM);
    });

    it('should call safeValuesService.setAnchorHref with object url', () => {
      service.downloadObjectAsJson(data, FILE_NAME_JSON);
      expect(safeValuesService.setAnchorHref)
          .toHaveBeenCalledWith(
              mockAnchor,
              blobUrl,
          );
    });

    it('should create an anchor element', () => {
      service.downloadObjectAsJson(data, FILE_NAME_JSON);
      expect(createElementSpy).toHaveBeenCalledWith(ANCHOR);
    });

    it('should set download attribute to filename', () => {
      service.downloadObjectAsJson(data, FILE_NAME_JSON);
      expect(mockAnchor.download).toBe(FILE_NAME_JSON);
    });

    it('should append anchor to body', () => {
      service.downloadObjectAsJson(data, FILE_NAME_JSON);
      expect(appendChildSpy).toHaveBeenCalledWith(mockAnchor);
    });

    it('should click anchor', () => {
      service.downloadObjectAsJson(data, FILE_NAME_JSON);
      expect(mockAnchor.click).toHaveBeenCalled();
    });

    it('should remove anchor from body', () => {
      service.downloadObjectAsJson(data, FILE_NAME_JSON);
      expect(removeChildSpy).toHaveBeenCalledWith(mockAnchor);
    });

    it('should revoke object URL', () => {
      service.downloadObjectAsJson(data, FILE_NAME_JSON);
      expect(revokeObjectURLSpy).toHaveBeenCalledWith(blobUrl);
    });
  });
});
