import * as glob from '@actions/glob';
import fs from 'fs';
import path from 'path';

import type { DotnetFormatTypes, Run } from './types/dotnet-format';

function parseReportFile(reportFile: string): DotnetFormatTypes {
  const reportPath = path.resolve(reportFile);

  if (!fs.existsSync(reportPath)) throw new Error(`The report-json file "${reportFile}" could not be resolved.`);

  try {
    const reportContents = fs.readFileSync(reportPath, 'utf-8');
    return JSON.parse(reportContents);
  } catch (error) {
    throw new Error(`Error parsing the report-json file "${reportFile}".`);
  }
}

/**
 * Converts a dotnet format report JSON file to an array of JavaScript objects
 * @param reportFile path to a dotnet format JSON file
 */
export default async function jsonReportToJs(reportFile: string): Promise<DotnetFormatTypes> {
  const globber = await glob.create(reportFile);
  const files = await globber.glob();
  if (files.length === 0) throw new Error(`No files matched pattern: ${reportFile}`);

  // Parse all files
  const reports = files.map(parseReportFile);

  if (reports.length === 1) return reports[0];

  // Merge all runs into one DotnetFormatTypes object
  const base = reports[0];
  const mergedRuns: Run[] = reports.flatMap(r => r.runs);
  return {
    ...base,
    runs: mergedRuns,
  };
}
