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

/**
 * Where an agent can be deployed. These are the `adk deploy` subcommands, so
 * they keep the CLI's spelling even where the product is named differently:
 * `agent_engine` deploys to what the UI calls Agent Runtime.
 */
export declare type DeployTarget = 'agent_engine'|'cloud_run'|'gke';

/** Fields every target needs. */
export declare interface BaseDeployConfig {
  /**
   * Google Cloud region, e.g. 'us-central1'. Required for all three targets:
   * without it Agent Runtime exits successfully having deployed nothing,
   * Cloud Run tries to prompt for one, and GKE cannot reach the cluster.
   */
  region: string;
  /** Google Cloud project. When empty the server reads it from gcloud config. */
  project?: string;
}

/** Deploy to Agent Runtime (`adk deploy agent_engine`). */
export declare interface AgentEngineDeployConfig extends BaseDeployConfig {
  /** Defaults to the agent folder name. */
  displayName?: string;
  description?: string;
  /**
   * Existing runtime to update. When empty a brand new one is created on every
   * deploy, so the UI sends back the resource name from the previous run.
   */
  agentEngineId?: string;
}

/** Deploy to Cloud Run (`adk deploy cloud_run`). */
export declare interface CloudRunDeployConfig extends BaseDeployConfig {
  serviceName: string;
  port?: number;
  withUi?: boolean;
  /**
   * Whether the service accepts calls without credentials. Always sent, never
   * omitted: gcloud would otherwise prompt for it on a terminal the deploy
   * does not have, and quietly answer "no" on its behalf.
   */
  allowUnauthenticated?: boolean;
}

/** Deploy to GKE (`adk deploy gke`). */
export declare interface GkeDeployConfig extends BaseDeployConfig {
  serviceName: string;
  clusterName: string;
  port?: number;
  withUi?: boolean;
  serviceType?: 'ClusterIP'|'LoadBalancer';
}

/** Any target's configuration. */
export declare type DeployConfig =
    AgentEngineDeployConfig|CloudRunDeployConfig|GkeDeployConfig;

/**
 * Prefill for the deploy form, resolved server-side from the agent's `.env`,
 * environment variables exported to the server, its
 * `.agent_engine_config.json`, and the local gcloud config. One payload covers
 * every target. Each field is a suggestion the user can overwrite.
 */
export declare interface DeployDefaults {
  project?: string|null;
  /**
   * Where `project` came from: the agent's `.env`, an environment variable
   * exported to the server, gcloud config, or null when nothing supplied it.
   */
  projectSource?: 'dotenv'|'environment'|'gcloud'|null;
  region?: string|null;
  /** Where `region` came from. There is no gcloud fallback for region. */
  regionSource?: 'dotenv'|'environment'|null;
  displayName?: string|null;
  description?: string|null;
  /** The agent name in Cloud Run / GKE form: lower-case, hyphens. */
  serviceName?: string|null;
  /** Path of the `.env` that supplied values, for showing the user. */
  envFile?: string|null;
}

/** Terminal outcome of a deploy, parsed from the stream's final line. */
export declare interface DeployResult {
  target: DeployTarget;
  status: 'succeeded'|'failed';
  exitCode: number|null;
  /**
   * Agent Runtime resource name, or the GKE service name. Null for Cloud Run,
   * whose identity is its URL.
   */
  resourceName: string|null;
  /**
   * Where the Open button goes: the Cloud console page for this deployment —
   * the playground for Agent Runtime, the service detail page for Cloud Run.
   * Null for GKE, which has no console page we can address reliably.
   */
  consoleUrl?: string|null;
  /**
   * The live endpoint, for targets that have one worth calling directly.
   * Cloud Run only; shown for copying rather than opened.
   */
  serviceUrl?: string|null;
  /** Follow-up instructions, or the reason a deploy failed. */
  message?: string;
  logPath?: string;
}

/** One item emitted while a deploy runs. */
export declare type DeployEvent = {
  kind: 'log'; text: string;
}|{
  kind: 'result';
  result: DeployResult;
};
