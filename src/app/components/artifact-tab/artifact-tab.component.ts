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

import {Component, Inject, inject, input, OnChanges, SimpleChanges} from '@angular/core';
import {FormsModule} from '@angular/forms';
import {MatButton} from '@angular/material/button';
import {MatOption} from '@angular/material/core';
import {MatDialog, MatDialogModule} from '@angular/material/dialog';
import {MatIcon} from '@angular/material/icon';
import {MatSelect} from '@angular/material/select';

import {DOWNLOAD_SERVICE, DownloadService} from '../../core/services/interfaces/download';
import {SAFE_VALUES_SERVICE} from '../../core/services/interfaces/safevalues';
import {AudioPlayerComponent} from '../audio-player/audio-player.component';
import {ViewImageDialogComponent} from '../view-image-dialog/view-image-dialog.component';

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
  artifacts = input<any[]>([]);

  selectedArtifacts: any[] = [];

  protected isArtifactAudio = isArtifactAudio;
  protected isArtifactImage = isArtifactImage;
  protected MediaType = MediaType;
  private readonly downloadService = inject(DOWNLOAD_SERVICE);
  private readonly dialog = inject(MatDialog);
  private readonly safeValuesService = inject(SAFE_VALUES_SERVICE);

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
    return [...new Set(this.artifacts().map((artifact) => artifact.id))];
  }

  protected getSortedArtifactsFromId(artifactId: string) {
    return this.artifacts().filter((artifact) => artifact.id === artifactId)
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

  /**
   * Opens the base64 data in a new tab.
   */
  private openBase64InNewTab(dataUrl: string, mimeType: string) {
  }
}
