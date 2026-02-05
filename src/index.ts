import * as core from '@actions/core';
// import * as fs from 'fs';
import jsonReportToJs from './jsonReportToJs';
import getAnalyzedReport from './getAnalyzedReport';
// import { parseReport } from './parser';
// import { toMarkdown } from './markdown';

async function run() {
  try {
    const reportPath = core.getInput('report-path', { required: true });
    const reportJS = await jsonReportToJs(reportPath);
    const analyzedReport = getAnalyzedReport(reportJS);
    core.summary.addRaw(analyzedReport?.markdown || '');
    await core.summary.write();
  } catch (err: any) {
    core.setFailed(err.message);
  }

  process.exit(0);
}

run();
