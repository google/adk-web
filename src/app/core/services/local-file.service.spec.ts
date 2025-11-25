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

import {LocalFileServiceImpl} from './local-file.service';

describe('LocalFileServiceImpl', () => {
  let service: LocalFileServiceImpl;

  beforeEach(() => {
    initTestBed();  // required for 1p compat
    TestBed.configureTestingModule({
      providers: [LocalFileServiceImpl],
    });
    service = TestBed.inject(LocalFileServiceImpl);
  });

  it('createMessagePartFromFile successfully reads a file and returns a message part',
     async () => {
       const fileContent = 'Hello World';
       const fileContentBase64 = btoa(fileContent);  // Base64 for "Hello World"
       const dataUrl = `data:text/plain;base64,${fileContentBase64}`;
       const mockFile = new File([fileContent], 'test.txt', {
         type: 'text/plain',
       });
       const mockFileReader = jasmine.createSpyObj('FileReader', [
         'readAsDataURL',
         'onload',
       ]);
       spyOn(window, 'FileReader').and.returnValue(mockFileReader);
       mockFileReader.result = dataUrl;
       mockFileReader.readAsDataURL.and.callFake(() => {
         mockFileReader.onload({target: mockFileReader});
       });

       const result = await service.createMessagePartFromFile(mockFile);

       expect(mockFileReader.readAsDataURL).toHaveBeenCalledWith(mockFile);
       expect(result).toEqual({
         inlineData: {
           displayName: 'test.txt',
           data: fileContentBase64,
           mimeType: 'text/plain',
         },
       });
     });
});
