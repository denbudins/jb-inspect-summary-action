import * as core from '@actions/core';
import jsonReportToJs from './jsonReportToJs';
import getAnalyzedReport from './getAnalyzedReport';
async function run() {
  try {
    const reportPath = core.getInput('report-path', { required: true });
    const failOnWarning = core.getInput('fail-on-warning') === 'true';
    const failOnError = core.getInput('fail-on-error') === 'true';
    const reportJS = await jsonReportToJs(reportPath);
    const analyzedReport = getAnalyzedReport(reportJS, failOnWarning, failOnError);
    core.summary.addRaw(analyzedReport?.markdown || '');
    await core.summary.write();

    if (analyzedReport?.success == false) {
      core.setFailed(`${analyzedReport.errorCount} errors and ${analyzedReport.warningCount} warnings`);
      process.exit(1);
    }
  } catch (err: any) {
    core.setFailed(err.message);
  }

  process.exit(0);
}

run();
