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

import {ChangeDetectionStrategy, Component, inject} from '@angular/core';
import {MatButtonModule} from '@angular/material/button';
import {MatDialogModule, MatDialogRef} from '@angular/material/dialog';
import {MatIconModule} from '@angular/material/icon';

import {TelemetryService} from '../../core/services/telemetry.service';

@Component({
  changeDetection: ChangeDetectionStrategy.OnPush,
  selector: 'app-telemetry-consent-dialog',
  templateUrl: './telemetry-consent-dialog.component.html',
  styleUrls: ['./telemetry-consent-dialog.component.scss'],
  standalone: true,
  imports: [
    MatDialogModule,
    MatButtonModule,
    MatIconModule,
  ],
})
export class TelemetryConsentDialogComponent {
  private readonly telemetryService = inject(TelemetryService);
  private readonly dialogRef =
      inject(MatDialogRef<TelemetryConsentDialogComponent>);

  onEnable(): void {
    this.telemetryService.setTelemetry(true);
    this.dialogRef.close(true);
  }

  onNoThanks(): void {
    this.telemetryService.setTelemetry(false);
    this.dialogRef.close(false);
  }

  onDismiss(): void {
    this.dialogRef.close();
  }
}
