export interface WorkloadScenario {
  vus?: number;
  stages?: { target?: number }[];
}

export function peakWorkloadVUs(scenarios: Record<string, unknown>): number {
  return Math.max(
    0,
    ...Object.entries(scenarios)
      .filter(([name]) => name !== "login")
      .map(([, rawScenario]) => {
        const scenario = rawScenario as WorkloadScenario;
        return Math.max(scenario.vus ?? 0, ...(scenario.stages?.map((stage) => stage.target ?? 0) ?? [0]));
      })
  );
}
