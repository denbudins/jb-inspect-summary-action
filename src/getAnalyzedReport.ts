import { AnalyzedReport } from './types/analyzed-report';
import { DotnetFormatTypes, Level } from './types/dotnet-format';

/**
 * Analyzes a dotnet format report JS object and returns a report
 * @param files a JavaScript representation of a dotnet format JSON report
 */
export default function getAnalyzedReport(files: DotnetFormatTypes): AnalyzedReport | undefined {
  // Create markdown placeholder
  let markdownText = '';
  // Start the error and warning counts at 0
  let errorCount = 0;
  let warningCount = 0;
  // Create text string placeholders
  let errorText = '';
  let warningText = '';

  // Loop through each file
  for (const file of files.runs) {
    const { results } = file;

    for (const result of results) {
      const { level, message, locations } = result;
      const { physicalLocation } = locations[0];
      const filePath = physicalLocation.artifactLocation.uri;
      const startLine = physicalLocation.region.startLine;
      const endLine = physicalLocation.region.endLine || physicalLocation.region.startLine;
      let isWarning = true;

      // Increment error or warning count based on level
      if (level === Level.Error) {
        errorCount++;
        isWarning = false;
      } else if (level === Level.Warning) {
        warningCount++;
      } else {
        continue; // Skip if not error or warning
      }

      let messageText = `### ${filePath}\` line \`${startLine.toString()}\n`;
      messageText += `- Start Line:  ${startLine.toString()}\n`;
      messageText += `- End Line: ${endLine.toString()}\n`;
      messageText += `- Message: ${message.text}\n`;

      // Add the markdown text to the appropriate placeholder
      if (isWarning) {
        warningText += messageText;
      } else {
        errorText += messageText;
      }
    }
  }

  // If there is any markdown error text, add it to the markdown output
  if (errorText.length) {
    markdownText += '## ' + errorCount.toString() + ' Error(s):\n';
    markdownText += errorText + '\n';
  }

  // If there is any markdown warning text, add it to the markdown output
  if (warningText.length) {
    markdownText += '## ' + warningCount.toString() + ' Warning(s):\n';
    markdownText += warningText + '\n';
  }

  let success = errorCount === 0;
  if (warningCount > 0) {
    success = false;
  }
  return {
    errorCount,
    warningCount,
    markdown: markdownText,
    success,
  };
}
