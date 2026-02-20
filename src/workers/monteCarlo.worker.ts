/**
 * Web Worker for Monte Carlo simulation.
 * Receives UserInputs + MonteCarloOptions via postMessage,
 * returns MonteCarloResult (or null) when complete.
 *
 * Runs in a separate thread so the UI stays responsive during simulation.
 */
declare const self: DedicatedWorkerGlobalScope;

import { runMonteCarlo } from '../lib/monteCarlo';
import type { UserInputs } from '../lib/types';
import type { MonteCarloOptions } from '../lib/monteCarlo';

interface WorkerRequest {
  inputs: UserInputs;
  options: MonteCarloOptions;
}

self.onmessage = (event: MessageEvent<WorkerRequest>) => {
  const { inputs, options } = event.data;
  const result = runMonteCarlo(inputs, options);
  self.postMessage(result);
};
