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

import {ComponentFixture, TestBed} from '@angular/core/testing';
import {By} from '@angular/platform-browser';
import {NoopAnimationsModule} from '@angular/platform-browser/animations';
// 1p-ONLY-IMPORTS: import {beforeEach, describe, expect, it}

import {initTestBed} from '../../testing/utils';
import {AuthService, UserInfo} from '../../core/auth/auth.service';
import {AuthUserMenuComponent} from './user-menu.component';

describe('AuthUserMenuComponent', () => {
  let component: AuthUserMenuComponent;
  let fixture: ComponentFixture<AuthUserMenuComponent>;
  let authServiceSpy: jasmine.SpyObj<AuthService>;

  function createComponent(
      isEnabled: boolean,
      isAuthenticated: boolean = false,
      userInfo: UserInfo|null = null) {
    authServiceSpy = jasmine.createSpyObj(
        'AuthService', ['isAuthenticated', 'getUserInfo', 'logout'],
        {isEnabled});
    authServiceSpy.isAuthenticated.and.returnValue(isAuthenticated);
    authServiceSpy.getUserInfo.and.returnValue(userInfo);
    authServiceSpy.logout.and.resolveTo();

    initTestBed();
    TestBed.configureTestingModule({
      imports: [AuthUserMenuComponent, NoopAnimationsModule],
      providers: [
        {provide: AuthService, useValue: authServiceSpy},
      ],
    });

    fixture = TestBed.createComponent(AuthUserMenuComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  }

  describe('auth disabled', () => {
    beforeEach(() => {
      createComponent(false);
    });

    it('should be created', () => {
      expect(component).toBeTruthy();
    });

    it('should render empty template', () => {
      const button = fixture.debugElement.query(By.css('button'));
      expect(button).toBeNull();
    });
  });

  describe('auth enabled + authenticated', () => {
    const mockUser: UserInfo = {
      name: 'Jane Doe',
      email: 'jane@example.com',
      userId: 'user-42',
      roles: ['admin', 'editor'],
    };

    beforeEach(() => {
      createComponent(true, true, mockUser);
    });

    it('should show user avatar button', () => {
      const button = fixture.debugElement.query(
          By.css('.user-avatar-button'));
      expect(button).toBeTruthy();
    });

    it('should expose userInfo from AuthService', () => {
      expect(component.userInfo).toEqual(mockUser);
    });
  });

  describe('auth enabled + not authenticated', () => {
    beforeEach(() => {
      createComponent(true, false);
    });

    it('should render empty template', () => {
      const button = fixture.debugElement.query(By.css('button'));
      expect(button).toBeNull();
    });
  });

  describe('logout', () => {
    beforeEach(() => {
      createComponent(true, true, {
        name: 'Test',
        email: 'test@test.com',
        userId: '1',
        roles: [],
      });
    });

    it('should call authService.logout', async () => {
      await component.logout();
      expect(authServiceSpy.logout).toHaveBeenCalled();
    });
  });
});
