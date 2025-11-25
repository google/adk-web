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

import {HttpClientTestingModule, HttpTestingController,} from '@angular/common/http/testing';
import {TestBed} from '@angular/core/testing';
// 1p-ONLY-IMPORTS: import {beforeEach, describe, expect, it,}
import {firstValueFrom} from 'rxjs';

import {URLUtil} from '../../../utils/url-util';
import {initTestBed} from '../../testing/utils';

import {ArtifactService} from './artifact.service';

const API_SERVER_BASE_URL = 'http://test.com';
const USER_ID = 'user1';
const APP_NAME = 'app1';
const SESSION_ID = 'session1';
const ARTIFACT_ID = 'artifact1';
const ARTIFACT_VERSION = 'v1';
const ARTIFACT_PATH = `/apps/${APP_NAME}/users/${USER_ID}/sessions/${
    SESSION_ID}/artifacts/${ARTIFACT_ID}`;
const ARTIFACT_VERSION_PATH = `${ARTIFACT_PATH}/versions/${ARTIFACT_VERSION}`;

describe('ArtifactService', () => {
  let service: ArtifactService;
  let httpTestingController: HttpTestingController;

  beforeEach(() => {
    spyOn(URLUtil, 'getApiServerBaseUrl').and.returnValue(API_SERVER_BASE_URL);
    initTestBed();  // required for 1p compat
    TestBed.configureTestingModule({
      imports: [HttpClientTestingModule],
      providers: [ArtifactService],
    });
    service = TestBed.inject(ArtifactService);
    httpTestingController = TestBed.inject(HttpTestingController);
  });

  afterEach(() => {
    httpTestingController.verify();
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });

  describe('getLatestArtifact', () => {
    it('should call the correct endpoint to get latest artifact', () => {
      service.getLatestArtifact(USER_ID, APP_NAME, SESSION_ID, ARTIFACT_ID)
          .subscribe();
      const req = httpTestingController.expectOne(
          API_SERVER_BASE_URL + ARTIFACT_PATH,
      );
      expect(req.request.method).toEqual('GET');
      req.flush({});
    });

    it('should return artifact data from http get', async () => {
      const artifactPromise = firstValueFrom(
          service.getLatestArtifact(USER_ID, APP_NAME, SESSION_ID, ARTIFACT_ID),
      );
      const req = httpTestingController.expectOne(
          API_SERVER_BASE_URL + ARTIFACT_PATH,
      );
      req.flush({data: 'test artifact'});
      const artifact = await artifactPromise;
      expect(artifact).toEqual({data: 'test artifact'});
    });
  });

  describe('getArtifactVersion', () => {
    it('should call the correct endpoint to get artifact version', () => {
      service
          .getArtifactVersion(
              USER_ID, APP_NAME, SESSION_ID, ARTIFACT_ID, ARTIFACT_VERSION)
          .subscribe();
      const req = httpTestingController.expectOne(
          API_SERVER_BASE_URL + ARTIFACT_VERSION_PATH,
      );
      expect(req.request.method).toEqual('GET');
      req.flush({});
    });

    it('should return artifact data from http get', async () => {
      const artifactPromise = firstValueFrom(
          service.getArtifactVersion(
              USER_ID, APP_NAME, SESSION_ID, ARTIFACT_ID, ARTIFACT_VERSION),
      );
      const req = httpTestingController.expectOne(
          API_SERVER_BASE_URL + ARTIFACT_VERSION_PATH,
      );
      req.flush({data: 'test artifact version'});
      const artifact = await artifactPromise;
      expect(artifact).toEqual({data: 'test artifact version'});
    });
  });
});
