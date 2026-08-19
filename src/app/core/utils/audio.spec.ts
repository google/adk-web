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
import {base64ToArrayBuffer, pcmChunksToWavBase64} from './audio';

/** Decodes base64 -> Uint8Array for assertions. */
function bytes(base64: string): Uint8Array {
  return new Uint8Array(base64ToArrayBuffer(base64));
}

/** Reads an ASCII tag from a byte array at an offset. */
function tag(arr: Uint8Array, offset: number, length: number): string {
  return String.fromCharCode(...arr.subarray(offset, offset + length));
}

describe('audio util - pcmChunksToWavBase64', () => {
  const chunk = btoa('\x01\x02\x03\x04');  // 4 bytes = 2 samples

  it('returns empty string when there are no chunks', () => {
    expect(pcmChunksToWavBase64([])).toBe('');
    expect(pcmChunksToWavBase64([''])).toBe('');
  });

  it('produces a valid RIFF/WAVE header', () => {
    const wav = bytes(pcmChunksToWavBase64([chunk]));
    expect(tag(wav, 0, 4)).toBe('RIFF');
    expect(tag(wav, 8, 4)).toBe('WAVE');
    expect(tag(wav, 12, 4)).toBe('fmt ');
    expect(tag(wav, 36, 4)).toBe('data');
  });

  it('has correct total length (44 byte header + concatenated PCM)', () => {
    // Two 4-byte chunks -> 8 bytes of PCM + 44 header.
    const wav = bytes(pcmChunksToWavBase64([chunk, chunk]));
    expect(wav.byteLength).toBe(44 + 8);

    const view = new DataView(wav.buffer);
    // data chunk size (offset 40) == PCM byte length.
    expect(view.getUint32(40, true)).toBe(8);
    // RIFF chunk size (offset 4) == 36 + PCM byte length.
    expect(view.getUint32(4, true)).toBe(36 + 8);
  });

  it('encodes the default 24kHz / mono / 16-bit format', () => {
    const wav = bytes(pcmChunksToWavBase64([chunk]));
    const view = new DataView(wav.buffer);
    expect(view.getUint16(20, true)).toBe(1);      // PCM format
    expect(view.getUint16(22, true)).toBe(1);      // mono
    expect(view.getUint32(24, true)).toBe(24000);  // sample rate
    expect(view.getUint16(34, true)).toBe(16);     // bits per sample
  });
});
