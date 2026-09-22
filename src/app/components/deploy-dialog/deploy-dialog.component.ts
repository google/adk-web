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

import {CommonModule} from '@angular/common';
import {ChangeDetectionStrategy, Component, ElementRef, Inject, inject, signal, viewChild} from '@angular/core';
import {FormsModule} from '@angular/forms';
import {MatButtonModule} from '@angular/material/button';
import {MatCheckboxModule} from '@angular/material/checkbox';
import {MAT_DIALOG_DATA, MatDialogActions, MatDialogContent, MatDialogRef, MatDialogTitle} from '@angular/material/dialog';
import {MatFormFieldModule} from '@angular/material/form-field';
import {MatIconModule} from '@angular/material/icon';
import {MatInputModule} from '@angular/material/input';
import {MatProgressBarModule} from '@angular/material/progress-bar';
import {MatProgressSpinnerModule} from '@angular/material/progress-spinner';
import {MatSelectModule} from '@angular/material/select';
import {Subscription} from 'rxjs';

import {DeployConfig, DeployDefaults, DeployResult, DeployTarget} from '../../core/models/Deploy';
import {DEPLOY_SERVICE} from '../../core/services/interfaces/deploy';

/** Data required to open the deploy dialog. */
export interface DeployDialogData {
  appName: string;
}

/** Where the dialog is in the deploy flow. */
type DeployPhase = 'configuring'|'running'|'finished';

/** A deploy destination, as offered in the picker. */
interface TargetOption {
  id: DeployTarget;
  label: string;
  icon: string;
  blurb: string;
}

const TARGETS: readonly TargetOption[] = [
  {
    id: 'agent_engine',
    label: 'Agent Runtime',
    icon: 'smart_toy',
    blurb: 'Managed runtime on Vertex AI. No infrastructure to run.',
  },
  {
    id: 'cloud_run',
    label: 'Cloud Run',
    icon: 'cloud',
    blurb: 'Serverless container with a public HTTPS URL.',
  },
  {
    id: 'gke',
    label: 'GKE',
    icon: 'lan',
    blurb: 'Container on a cluster you already run.',
  },
];

/**
 * localStorage key holding the last successful deploy, per agent and target.
 * Without it every Agent Runtime deploy creates a fresh instance instead of
 * updating the one from last time, and the previous one is left running and
 * billing.
 */
const LAST_DEPLOY_KEY = 'adk-web:last-deploy';

interface RememberedDeploy {
  region?: string;
  project?: string;
  resourceName?: string;
  serviceName?: string;
  clusterName?: string;
}

@Component({
  changeDetection: ChangeDetectionStrategy.Default,
  selector: 'app-deploy-dialog',
  templateUrl: './deploy-dialog.component.html',
  styleUrl: './deploy-dialog.component.scss',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    MatButtonModule,
    MatCheckboxModule,
    MatDialogTitle,
    MatDialogContent,
    MatDialogActions,
    MatFormFieldModule,
    MatIconModule,
    MatInputModule,
    MatProgressBarModule,
    MatProgressSpinnerModule,
    MatSelectModule,
  ],
})
export class DeployDialogComponent {
  private readonly deployService = inject(DEPLOY_SERVICE);
  private readonly logPane = viewChild<ElementRef<HTMLElement>>('logPane');

  readonly appName: string;
  readonly targets = TARGETS;
  readonly target = signal<DeployTarget>('agent_engine');

  // Shared across targets, so switching the picker keeps what you typed.
  region = '';
  project = '';
  // Agent Runtime.
  displayName = '';
  description = '';
  agentEngineId = '';
  // Cloud Run and GKE.
  serviceName = '';
  port = 8000;
  withUi = false;
  allowUnauthenticated = false;
  // GKE only.
  clusterName = '';
  serviceType: 'ClusterIP'|'LoadBalancer' = 'ClusterIP';

  readonly phase = signal<DeployPhase>('configuring');
  readonly log = signal<string>('');
  readonly result = signal<DeployResult|null>(null);
  readonly errorMessage = signal<string>('');
  /** True when the stream ended with no verdict, e.g. the server went away. */
  readonly outcomeUnknown = signal<boolean>(false);
  readonly loadingDefaults = signal<boolean>(true);
  readonly defaults = signal<DeployDefaults|null>(null);

  private subscription?: Subscription;
  private defaultsSubscription?: Subscription;

  constructor(
      private readonly dialogRef: MatDialogRef<DeployDialogComponent>,
      @Inject(MAT_DIALOG_DATA) data: DeployDialogData,
  ) {
    this.appName = data.appName;
    this.displayName = data.appName;
    this.applyRemembered();
    this.loadDefaults();
    // A deploy must not be interrupted by a stray Escape or backdrop click.
    dialogRef.disableClose = true;
  }

  get targetLabel(): string {
    return TARGETS.find((t) => t.id === this.target())?.label ?? '';
  }

  get isAgentRuntime(): boolean {
    return this.target() === 'agent_engine';
  }

  get isContainerTarget(): boolean {
    return this.target() === 'cloud_run' || this.target() === 'gke';
  }

  get isGke(): boolean {
    return this.target() === 'gke';
  }

  get isCloudRun(): boolean {
    return this.target() === 'cloud_run';
  }

  /** True when this run updates an existing Agent Runtime instead of creating. */
  get isUpdate(): boolean {
    return this.isAgentRuntime && !!this.agentEngineId.trim();
  }

  get canDeploy(): boolean {
    if (this.phase() !== 'configuring' || this.loadingDefaults()) {
      // Held back while defaults resolve, so a fast click cannot deploy with
      // an empty region that was about to be filled in from .env.
      return false;
    }
    if (!this.region.trim()) {
      return false;
    }
    if (this.isContainerTarget && !this.serviceName.trim()) {
      return false;
    }
    if (this.isGke && !this.clusterName.trim()) {
      return false;
    }
    return true;
  }

  selectTarget(target: DeployTarget): void {
    if (this.phase() !== 'configuring' || target === this.target()) {
      return;
    }
    this.target.set(target);
    // Each target remembers its own last deploy, so re-apply on switch.
    this.applyRemembered();
  }

  deploy(): void {
    if (!this.canDeploy) {
      return;
    }
    this.phase.set('running');
    this.log.set('');
    this.errorMessage.set('');
    this.result.set(null);
    this.outcomeUnknown.set(false);

    let sawResult = false;
    this.subscription =
        this.deployService
            .deploy(this.appName, this.target(), this.buildConfig())
            .subscribe({
              next: (event) => {
                if (event.kind === 'log') {
                  this.log.update((current) => current + event.text);
                  this.scrollLogToBottom();
                  return;
                }
                sawResult = true;
                this.result.set(event.result);
                if (event.result.status === 'succeeded') {
                  this.remember(event.result);
                }
              },
              error: (err) => {
                this.errorMessage.set(err?.message ?? String(err));
                this.phase.set('finished');
              },
              complete: () => {
                this.outcomeUnknown.set(!sawResult);
                this.phase.set('finished');
              },
            });
  }

  /** Copies the live endpoint, falling back to the resource name. */
  copyResult(): void {
    const deployResult = this.result();
    const text = deployResult?.serviceUrl || deployResult?.resourceName;
    if (text) {
      navigator.clipboard.writeText(text);
    }
  }

  /** Opens the Cloud console page for the deployment, not the live service. */
  openConsole(): void {
    const url = this.result()?.consoleUrl;
    if (url) {
      window.open(url, '_blank', 'noopener');
    }
  }

  /** Returns to the form so a failed deploy can be retried. */
  backToForm(): void {
    this.phase.set('configuring');
  }

  close(): void {
    this.subscription?.unsubscribe();
    this.defaultsSubscription?.unsubscribe();
    this.dialogRef.close(this.result());
  }

  /** Explains where a prefilled value came from, for display under a field. */
  sourceHint(field: 'project'|'region'): string {
    const defaults = this.defaults();
    if (!defaults) {
      return '';
    }
    const source =
        field === 'project' ? defaults.projectSource : defaults.regionSource;
    const current = field === 'project' ? this.project : this.region;
    const resolved = field === 'project' ? defaults.project : defaults.region;
    if (!source || !resolved || current !== resolved) {
      return '';
    }
    switch (source) {
      case 'dotenv':
        return `From ${defaults.envFile ?? '.env'}`;
      case 'environment':
        const variable = field === 'project' ? 'GOOGLE_CLOUD_PROJECT' :
                                               'GOOGLE_CLOUD_LOCATION';
        return `From the ${variable} environment variable`;
      case 'gcloud':
        return 'From your gcloud config';
      default:
        return '';
    }
  }

  private buildConfig(): DeployConfig {
    const base = {
      region: this.region.trim(),
      project: this.project.trim() || undefined,
    };
    if (this.isAgentRuntime) {
      return {
        ...base,
        displayName: this.displayName.trim() || undefined,
        description: this.description.trim() || undefined,
        agentEngineId: this.agentEngineId.trim() || undefined,
      };
    }
    const container = {
      ...base,
      serviceName: this.serviceName.trim(),
      port: this.port,
      withUi: this.withUi,
    };
    if (!this.isGke) {
      return {...container, allowUnauthenticated: this.allowUnauthenticated};
    }
    return {
      ...container,
      clusterName: this.clusterName.trim(),
      serviceType: this.serviceType,
    };
  }

  /** Fills any field the user has not already got a value for. */
  private loadDefaults(): void {
    this.defaultsSubscription =
        this.deployService.getDeployDefaults(this.appName).subscribe({
          next: (defaults) => {
            this.defaults.set(defaults);
            this.region = this.region || (defaults.region ?? '');
            this.project = this.project || (defaults.project ?? '');
            this.serviceName = this.serviceName || (defaults.serviceName ?? '');
            if (defaults.displayName) {
              this.displayName = defaults.displayName;
            }
            this.description = this.description || (defaults.description ?? '');
            this.loadingDefaults.set(false);
          },
          error: () => {
            // Prefill is a convenience. If the server cannot resolve it the
            // form still works, and a genuinely unavailable deploy endpoint
            // will say so clearly when Deploy is pressed.
            this.loadingDefaults.set(false);
          },
        });
  }

  /**
   * Restores the last deploy of the current target.
   *
   * What the user chose last time wins over anything resolved from the
   * environment: an Agent Runtime resource name embeds a project and region,
   * so pairing it with a different pair would be incoherent.
   */
  private applyRemembered(): void {
    const remembered = this.readRemembered();
    if (!remembered) {
      return;
    }
    this.region = remembered.region ?? this.region;
    this.project = remembered.project ?? this.project;
    if (this.isAgentRuntime) {
      this.agentEngineId = remembered.resourceName ?? '';
    }
    if (remembered.serviceName) {
      this.serviceName = remembered.serviceName;
    }
    if (remembered.clusterName) {
      this.clusterName = remembered.clusterName;
    }
  }

  private storageKey(): string {
    return `${this.appName}::${this.target()}`;
  }

  private readRemembered(): RememberedDeploy|null {
    try {
      const all = JSON.parse(localStorage.getItem(LAST_DEPLOY_KEY) ?? '{}');
      return all[this.storageKey()] ?? null;
    } catch {
      return null;
    }
  }

  private remember(result: DeployResult): void {
    try {
      const all = JSON.parse(localStorage.getItem(LAST_DEPLOY_KEY) ?? '{}');
      all[this.storageKey()] = {
        region: this.region.trim(),
        project: this.project.trim() || undefined,
        // Only Agent Runtime can be updated in place by id. For the container
        // targets the service name is what identifies the deployment, and
        // redeploying the same name replaces it.
        resourceName: this.isAgentRuntime ?
            (result.resourceName ?? undefined) :
            undefined,
        serviceName: this.serviceName.trim() || undefined,
        clusterName: this.clusterName.trim() || undefined,
      };
      localStorage.setItem(LAST_DEPLOY_KEY, JSON.stringify(all));
    } catch {
      // A full or unavailable localStorage only costs us the prefill.
    }
  }

  private scrollLogToBottom(): void {
    queueMicrotask(() => {
      const pane = this.logPane()?.nativeElement;
      if (pane) {
        pane.scrollTop = pane.scrollHeight;
      }
    });
  }
}
