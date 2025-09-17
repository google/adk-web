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

import {Component, Input, OnChanges, SimpleChanges, Inject} from '@angular/core';
import {MatDialog, MatDialogModule} from '@angular/material/dialog';

import {DownloadService, DOWNLOAD_SERVICE} from '../../core/services/download.service';
import {AudioPlayerComponent} from '../audio-player/audio-player.component';
import {ViewImageDialogComponent} from '../view-image-dialog/view-image-dialog.component';
import { MatSelect } from '@angular/material/select';
import { FormsModule } from '@angular/forms';
import { MatOption } from '@angular/material/core';
import { MatButton } from '@angular/material/button';
import { MatIcon } from '@angular/material/icon';

const DEFAULT_ARTIFACT_NAME = 'default_artifact_name';

/**
 * The supported media types for artifacts.
 */
export enum MediaType {
  IMAGE = 'image',
  AUDIO = 'audio',
  TEXT = 'text',  // for text/html
  UNSPECIFIED = 'unspecified',
}

/*
 * Returns the media type from the mime type.
 *
 * This function iterates through the MediaType enum values and checks if the
 * mime type starts with the enum value + '/'.
 *
 * If no matching prefix is found, it returns UNSPECIFIED.
 */
export function getMediaTypeFromMimetype(mimetype: string): MediaType {
  const lowerMime = mimetype.toLowerCase();

  for (const enumValue of Object.values(MediaType)) {
    if (enumValue === MediaType.UNSPECIFIED) {
      continue;
    }

    if (lowerMime.startsWith(enumValue + '/')) {
      return enumValue as MediaType;
    }
  }

  return MediaType.UNSPECIFIED;
}

/**
 * Returns true if the mime type is an image type.
 */
export function isArtifactImage(mimeType: string): boolean {
  if (!mimeType) {
    return false;
  }

  return mimeType.startsWith('image/');
}


/**
 * Returns true if the mime type is an audio type.
 */
export function isArtifactAudio(mimeType: string): boolean {
  if (!mimeType) {
    return false;
  }

  return mimeType.startsWith('audio/');
}

/**
 * Opens the base64 data in a new tab.
 */
export function openBase64InNewTab(dataUrl: string, mimeType: string) {
  try {
    if (!dataUrl) {
      return;
    }

    let base64DataString = dataUrl;

    if (dataUrl.startsWith('data:') && dataUrl.includes(';base64,')) {
      base64DataString = base64DataString.substring(
          base64DataString.indexOf(';base64,') + ';base64,'.length);
    }

    if (!mimeType || !base64DataString) {
      return;
    }

    const byteCharacters = atob(base64DataString);
    const byteNumbers = new Array(byteCharacters.length);
    for (let i = 0; i < byteCharacters.length; i++) {
      byteNumbers[i] = byteCharacters.charCodeAt(i);
    }
    const byteArray = new Uint8Array(byteNumbers);

    const blob = new Blob([byteArray], {type: mimeType});

    const blobUrl = URL.createObjectURL(blob);

    const newWindow = window.open(blobUrl, '_blank');
    if (newWindow) {
      newWindow.focus();
    } else {
      alert(
          'Pop-up blocked! Please allow pop-ups for this site to open the data in a new tab.');
    }
  } catch (e) {
    alert(
        'Could not open the data. It might be invalid or too large. Check the browser console for errors.');
  }
}

@Component({
    selector: 'app-artifact-tab',
    templateUrl: './artifact-tab.component.html',
    styleUrl: './artifact-tab.component.scss',
    imports: [
        MatSelect,
        FormsModule,
        MatOption,
        MatButton,
        MatIcon,
        AudioPlayerComponent,
    ],
})
export class ArtifactTabComponent implements OnChanges {
  @Input() artifacts: any[] = [];

  selectedArtifacts: any[] = [];

  protected isArtifactAudio = isArtifactAudio;
  protected isArtifactImage = isArtifactImage;
  protected MediaType = MediaType;
  protected openBase64InNewTab = openBase64InNewTab;

  constructor(
      @Inject(DOWNLOAD_SERVICE) private downloadService: DownloadService,
      private dialog: MatDialog,
  ) {}

  ngOnChanges(changes: SimpleChanges) {
    if (changes['artifacts']) {
      this.selectedArtifacts = [];

      for (const artifactId of this.getDistinctArtifactIds()) {
        this.selectedArtifacts.push(
            this.getSortedArtifactsFromId(artifactId)[0],
        );
      }
    }
  }

  protected downloadArtifact(artifact: any) {
    this.downloadService.downloadBase64Data(
        artifact.data,
        artifact.mimeType,
        artifact.id,
    );
  }

  protected getArtifactName(artifactId: string) {
    return artifactId ?? DEFAULT_ARTIFACT_NAME;
  }

  protected getDistinctArtifactIds() {
    return [...new Set(this.artifacts.map((artifact) => artifact.id))];
  }

  protected getSortedArtifactsFromId(artifactId: string) {
    return this.artifacts.filter((artifact) => artifact.id === artifactId)
        .sort((a, b) => {
          return b.versionId - a.versionId;
        });
  }

  protected onArtifactVersionChange(event: any, index: number) {
    this.selectedArtifacts[index] = event.value;
  }

  protected openViewImageDialog(fullBase64DataUrl: string) {
    if (!fullBase64DataUrl || !fullBase64DataUrl.startsWith('data:') ||
        fullBase64DataUrl.indexOf(';base64,') === -1) {
      return;
    }

    const dialogRef = this.dialog.open(ViewImageDialogComponent, {
      maxWidth: '90vw',
      maxHeight: '90vh',
      data: {
        imageData: fullBase64DataUrl,
      },
    });
  }

  protected openArtifact(fullBase64DataUrl: string, mimeType: string) {
    if (this.isArtifactImage(mimeType)) {
      this.openViewImageDialog(fullBase64DataUrl);
      return;
    }

    this.openBase64InNewTab(fullBase64DataUrl, mimeType);
  }
}
