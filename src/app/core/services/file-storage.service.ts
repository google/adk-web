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

import {Injectable} from '@angular/core';
import {Observable, from, of} from 'rxjs';
import {catchError, map, tap} from 'rxjs/operators';

@Injectable({
  providedIn: 'root',
})
export class FileStorageService {
  private dbName = 'adkWebStorage';
  private storeName = 'fileAttachments';
  private dbVersion = 1;
  private dbReady = false;

  constructor() {
    this.initDB().then(() => {
      this.dbReady = true;
    }).catch(err => {
      console.error('Failed to initialize IndexedDB:', err);
    });
  }

  private initDB(): Promise<IDBDatabase> {
    return new Promise((resolve, reject) => {
      const request = indexedDB.open(this.dbName, this.dbVersion);
      
      request.onupgradeneeded = (event: any) => {
        const db = event.target.result;
        if (!db.objectStoreNames.contains(this.storeName)) {
          db.createObjectStore(this.storeName, {keyPath: 'id'});
        }
      };

      request.onsuccess = (event: any) => {
        resolve(event.target.result);
      };

      request.onerror = (event: any) => {
        console.error('IndexedDB error:', event.target.error);
        reject(event.target.error);
      };
    });
  }

  storeFile(file: File, sessionId: string, messageIndex?: number): Observable<string> {
    return from(this.readFileAsDataURL(file)).pipe(
      map((dataUrl) => {
        const fileId = `${sessionId}_${Date.now()}_${file.name}`;
        this.saveToIndexedDB({
          id: fileId,
          name: file.name,
          type: file.type,
          size: file.size,
          lastModified: file.lastModified,
          data: dataUrl,
          sessionId: sessionId,
          messageIndex: messageIndex,
          timestamp: Date.now(),
        });
        return fileId;
      }),
      catchError((error) => {
        console.error('Error storing file:', error);
        return of('');
      })
    );
  }

  getFile(fileId: string): Observable<{data: string, type: string, name: string, size: number, messageIndex?: number} | null> {
    return from(this.getFromIndexedDB(fileId)).pipe(
      map((fileData) => {
        if (fileData) {
          return {
            data: fileData.data,
            type: fileData.type,
            name: fileData.name,
            size: fileData.size || 0,
            lastModified: fileData.lastModified,
            messageIndex: fileData.messageIndex
          };
        }
        console.warn('File not found in IndexedDB:', fileId);
        return null;
      }),
      catchError((error) => {
        console.error('Error retrieving file:', error);
        return of(null);
      })
    );
  }

  getSessionFiles(sessionId: string): Observable<any[]> {
    return from(this.getAllFromIndexedDB(sessionId)).pipe(
      catchError((error) => {
        console.error('Error retrieving session files:', error);
        return of([]);
      })
    );
  }

  deleteSessionFiles(sessionId: string): Observable<boolean> {
    return from(this.deleteSessionFilesFromIndexedDB(sessionId)).pipe(
      catchError((error) => {
        console.error('Error deleting session files:', error);
        return of(false);
      })
    );
  }

  private readFileAsDataURL(file: File): Promise<string> {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => {
        resolve(reader.result as string);
      };
      reader.onerror = (error) => {
        console.error('Error reading file as data URL:', error);
        reject(error);
      };
      reader.readAsDataURL(file);
    });
  }

  private async saveToIndexedDB(fileData: any): Promise<void> {
    try {
      const db = await this.initDB();
      return new Promise((resolve, reject) => {
        const transaction = db.transaction([this.storeName], 'readwrite');
        const store = transaction.objectStore(this.storeName);
        const request = store.put(fileData);
        
        request.onsuccess = () => {
          resolve();
        };
        request.onerror = (event: any) => {
          console.error('Error saving to IndexedDB:', event.target.error);
          reject(event.target.error);
        };
      });
    } catch (error) {
      console.error('Error accessing IndexedDB:', error);
    }
  }

  private async getFromIndexedDB(fileId: string): Promise<any> {
    try {
      const db = await this.initDB();
      return new Promise((resolve, reject) => {
        const transaction = db.transaction([this.storeName], 'readonly');
        const store = transaction.objectStore(this.storeName);
        const request = store.get(fileId);
        
        request.onsuccess = (event: any) => {
          resolve(event.target.result);
        };
        request.onerror = (event: any) => {
          console.error('Error getting file from IndexedDB:', event.target.error);
          reject(event.target.error);
        };
      });
    } catch (error) {
      console.error('Error accessing IndexedDB:', error);
      return null;
    }
  }

  private async getAllFromIndexedDB(sessionId: string): Promise<any[]> {
    try {
      const db = await this.initDB();
      return new Promise((resolve, reject) => {
        const transaction = db.transaction([this.storeName], 'readonly');
        const store = transaction.objectStore(this.storeName);
        const request = store.getAll();
        
        request.onsuccess = (event: any) => {
          const allFiles = event.target.result || [];
          const sessionFiles = allFiles.filter((file: any) => file.sessionId === sessionId);
          resolve(sessionFiles);
        };
        request.onerror = (event: any) => {
          console.error('Error getting all files from IndexedDB:', event.target.error);
          reject(event.target.error);
        };
      });
    } catch (error) {
      console.error('Error accessing IndexedDB:', error);
      return [];
    }
  }

  private async deleteSessionFilesFromIndexedDB(sessionId: string): Promise<boolean> {
    try {
      const files = await this.getAllFromIndexedDB(sessionId);
      if (files.length === 0) {
        return true;
      }
      
      const db = await this.initDB();
      
      return new Promise((resolve, reject) => {
        const transaction = db.transaction([this.storeName], 'readwrite');
        const store = transaction.objectStore(this.storeName);
        
        let deleteCount = 0;
        let errorCount = 0;
        
        files.forEach((file) => {
          const request = store.delete(file.id);
          
          request.onsuccess = () => {
            deleteCount++;
            if (deleteCount + errorCount === files.length) {
              resolve(errorCount === 0);
            }
          };
          
          request.onerror = (event: any) => {
            console.error('Error deleting file from IndexedDB:', event.target.error);
            errorCount++;
            if (deleteCount + errorCount === files.length) {
              resolve(errorCount === 0);
            }
          };
        });
        
        transaction.onerror = (event: any) => {
          console.error('Transaction error when deleting files:', event.target.error);
          reject(event.target.error);
        };
      });
    } catch (error) {
      console.error('Error accessing IndexedDB for deletion:', error);
      return false;
    }
  }
} 