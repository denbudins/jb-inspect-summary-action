"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.default = jsonReportToJs;
const glob = __importStar(require("@actions/glob"));
const fs_1 = __importDefault(require("fs"));
const path_1 = __importDefault(require("path"));
function parseReportFile(reportFile) {
    const reportPath = path_1.default.resolve(reportFile);
    if (!fs_1.default.existsSync(reportPath))
        throw new Error(`The report-json file "${reportFile}" could not be resolved.`);
    try {
        const reportContents = fs_1.default.readFileSync(reportPath, 'utf-8');
        return JSON.parse(reportContents);
    }
    catch (error) {
        throw new Error(`Error parsing the report-json file "${reportFile}".`);
    }
}
/**
 * Converts a dotnet format report JSON file to an array of JavaScript objects
 * @param reportFile path to a dotnet format JSON file
 */
async function jsonReportToJs(reportFile) {
    const globber = await glob.create(reportFile);
    const files = await globber.glob();
    if (files.length === 0)
        throw new Error(`No files matched pattern: ${reportFile}`);
    // Parse all files
    const reports = files.map(parseReportFile);
    if (reports.length === 1)
        return reports[0];
    // Merge all runs into one DotnetFormatTypes object
    const base = reports[0];
    const mergedRuns = reports.flatMap(r => r.runs);
    return {
        ...base,
        runs: mergedRuns,
    };
}
