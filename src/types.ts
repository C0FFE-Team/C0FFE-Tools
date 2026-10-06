export interface Client {
  name: string;
  slug: string;
  projects: ProjectRef[];
}

export interface ProjectRef {
  name: string;
  path: string;
}

export interface Registry {
  clients: Client[];
}

export interface RepoConfig {
  name: string;
  path: string;
  role: string;
  stack: string;
  figma_file?: string;
}

export interface DeploymentConfig {
  railway_project_id?: string;
  railway_service_urls?: Record<string, string>;
  vercel_project_id?: string;
  vercel_team_id?: string;
  vercel_url?: string;
  last_deployed_at?: string;
}

export interface HarnessConfig {
  version: 3;
  client: string;
  repos: RepoConfig[];
  prd: string;
  figma_file?: string;
  tracker_team: string;
  tracker_project: string;
  deployment?: DeploymentConfig;
}

// Dev server management
export interface PortAllocation {
  featureSlug: string;
  basePort: number;
  ports: Record<string, number>; // role -> port (e.g. "backend" -> 10000)
}

export interface ProcessEntry {
  repoName: string;
  role: string;
  stack: string;
  pid: number;
  port: number;
  cwd: string;
  logFile: string;
}

export interface RunningFeature {
  featureSlug: string;
  domain: string;
  basePort: number;
  processes: ProcessEntry[];
  startedAt: string;
}

export interface RunningState {
  features: RunningFeature[];
}

export interface PortsMap {
  allocations: PortAllocation[];
}
