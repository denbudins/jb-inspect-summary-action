import path from 'path';
import fs from 'fs';
import jsonReportToJs from '../src/jsonReportToJs';
import type { DotnetFormatTypes } from '../src/types/dotnet-format';
import { beforeAll, describe, expect, it } from 'vitest';

describe('jsonReportToJs', () => {
  let jsonReport: string;

  beforeAll(async () => {
    const sarifPath = path.join(__dirname, 'jb-report.sarif');

    // Skip test if file does not exist
    if (!fs.existsSync(sarifPath)) return;

    jsonReport = sarifPath;
  });

  it('parses jb-report.sarif without throwing', async () => {
    let error: Error | undefined;
    try {
      let result: DotnetFormatTypes = await jsonReportToJs(jsonReport);
      expect(result).toBeDefined();
      expect(typeof result).toBe('object');
      expect(result.runs.length).toBeGreaterThan(0);
      expect(result).toHaveProperty('$schema');
      expect(result).toHaveProperty('version');
      expect(result).toHaveProperty('runs');
    } catch (e) {
      error = e as Error;
    }

    expect(error).toBeUndefined();
  });
});
