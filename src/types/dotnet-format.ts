// To parse this data:
//
//   import { Convert, DotnetFormatTypes } from "./file";
//
//   const dotnetFormatTypes = Convert.toDotnetFormatTypes(json);
//
// These functions will throw an error if the JSON doesn't
// match the expected interface, even if the JSON is valid.

export interface DotnetFormatTypes {
  $schema: string;
  version: string;
  runs: Run[];
}

export interface Run {
  results: Result[];
  tool: Tool;
  invocations: Invocation[];
  versionControlProvenance: VersionControlProvenance[];
  originalUriBaseIds: OriginalURIBaseIDS;
  artifacts: Artifact[];
  columnKind: string;
}

export interface Artifact {
  location: ArtifactLocation;
  hashes: Hashes;
}

export interface Hashes {
  md5: string;
  'sha-1': string;
  'sha-256': string;
}

export interface ArtifactLocation {
  uri: string;
  uriBaseId: URIBaseID;
}

export enum URIBaseID {
  SolutionDir = 'solutionDir',
}

export interface Invocation {
  executionSuccessful: boolean;
}

export interface OriginalURIBaseIDS {
  solutionDir: SolutionDir;
}

export interface SolutionDir {
  uri: string;
  description: Description;
}

export interface Description {
  text: string;
}

export interface Result {
  ruleId: string;
  ruleIndex: number;
  level: Level;
  message: Description;
  locations: LocationElement[];
  partialFingerprints: PartialFingerprints;
  properties: Properties;
}

export enum Level {
  Note = 'note',
  Warning = 'warning',
  Error = 'error',
  None = 'none',
}

export interface LocationElement {
  physicalLocation: PhysicalLocation;
}

export interface PhysicalLocation {
  artifactLocation: ArtifactLocationClass;
  region: Region;
}

export interface ArtifactLocationClass {
  uri: string;
  uriBaseId: URIBaseID;
  index: number;
}

export interface Region {
  startLine: number;
  startColumn: number;
  endLine: number;
  endColumn: number;
  charOffset: number;
  charLength: number;
}

export interface PartialFingerprints {
  'contextRegionHash/v1': string;
}

export interface Properties {
  tags: Tag[];
}

export enum Tag {
  C = 'C#',
  Net80 = '.NET 8.0',
}

export interface Tool {
  driver: Driver;
}

export interface Driver {
  name: Name;
  organization: string;
  fullName: string;
  semanticVersion: string;
  informationUri: string;
  rules: Rule[];
  taxa: Taxa[];
}

export enum Name {
  InspectCode = 'InspectCode',
}

export interface Rule {
  id: string;
  fullDescription?: Description;
  help?: Description;
  shortDescription?: Description;
  defaultConfiguration: DefaultConfiguration;
  helpUri?: string;
  relationships?: Relationship[];
}

export interface DefaultConfiguration {
  level: Level;
}

export interface Relationship {
  target: Target;
  kinds: Kind[];
}

export enum Kind {
  Superset = 'superset',
}

export interface Target {
  id: string;
  toolComponent: ToolComponent;
}

export interface ToolComponent {
  name: Name;
}

export interface Taxa {
  id: string;
  name: string;
  relationships?: Relationship[];
}

export interface VersionControlProvenance {
  repositoryUri: string;
  revisionId: string;
  branch: string;
}

// Converts JSON strings to/from your types
// and asserts the results of JSON.parse at runtime
export class Convert {
  public static toDotnetFormatTypes(json: string): DotnetFormatTypes {
    return cast(JSON.parse(json), r('DotnetFormatTypes'));
  }

  public static dotnetFormatTypesToJson(value: DotnetFormatTypes): string {
    return JSON.stringify(uncast(value, r('DotnetFormatTypes')), null, 2);
  }
}

function invalidValue(typ: any, val: any, key: any, parent: any = ''): never {
  const prettyTyp = prettyTypeName(typ);
  const parentText = parent ? ` on ${parent}` : '';
  const keyText = key ? ` for key "${key}"` : '';
  throw Error(`Invalid value${keyText}${parentText}. Expected ${prettyTyp} but got ${JSON.stringify(val)}`);
}

function prettyTypeName(typ: any): string {
  if (Array.isArray(typ)) {
    if (typ.length === 2 && typ[0] === undefined) {
      return `an optional ${prettyTypeName(typ[1])}`;
    } else {
      return `one of [${typ
        .map(a => {
          return prettyTypeName(a);
        })
        .join(', ')}]`;
    }
  } else if (typeof typ === 'object' && typ.literal !== undefined) {
    return typ.literal;
  } else {
    return typeof typ;
  }
}

function jsonToJSProps(typ: any): any {
  if (typ.jsonToJS === undefined) {
    const map: any = {};
    typ.props.forEach((p: any) => (map[p.json] = { key: p.js, typ: p.typ }));
    typ.jsonToJS = map;
  }
  return typ.jsonToJS;
}

function jsToJSONProps(typ: any): any {
  if (typ.jsToJSON === undefined) {
    const map: any = {};
    typ.props.forEach((p: any) => (map[p.js] = { key: p.json, typ: p.typ }));
    typ.jsToJSON = map;
  }
  return typ.jsToJSON;
}

function transform(val: any, typ: any, getProps: any, key: any = '', parent: any = ''): any {
  function transformPrimitive(typ: string, val: any): any {
    if (typeof typ === typeof val) return val;
    return invalidValue(typ, val, key, parent);
  }

  function transformUnion(typs: any[], val: any): any {
    // val must validate against one typ in typs
    const l = typs.length;
    for (let i = 0; i < l; i++) {
      const typ = typs[i];
      try {
        return transform(val, typ, getProps);
      } catch (_) {}
    }
    return invalidValue(typs, val, key, parent);
  }

  function transformEnum(cases: string[], val: any): any {
    if (cases.indexOf(val) !== -1) return val;
    return invalidValue(
      cases.map(a => {
        return l(a);
      }),
      val,
      key,
      parent,
    );
  }

  function transformArray(typ: any, val: any): any {
    // val must be an array with no invalid elements
    if (!Array.isArray(val)) return invalidValue(l('array'), val, key, parent);
    return val.map(el => transform(el, typ, getProps));
  }

  function transformDate(val: any): any {
    if (val === null) {
      return null;
    }
    const d = new Date(val);
    if (isNaN(d.valueOf())) {
      return invalidValue(l('Date'), val, key, parent);
    }
    return d;
  }

  function transformObject(props: { [k: string]: any }, additional: any, val: any): any {
    if (val === null || typeof val !== 'object' || Array.isArray(val)) {
      return invalidValue(l(ref || 'object'), val, key, parent);
    }
    const result: any = {};
    Object.getOwnPropertyNames(props).forEach(key => {
      const prop = props[key];
      const v = Object.prototype.hasOwnProperty.call(val, key) ? val[key] : undefined;
      result[prop.key] = transform(v, prop.typ, getProps, key, ref);
    });
    Object.getOwnPropertyNames(val).forEach(key => {
      if (!Object.prototype.hasOwnProperty.call(props, key)) {
        result[key] = transform(val[key], additional, getProps, key, ref);
      }
    });
    return result;
  }

  if (typ === 'any') return val;
  if (typ === null) {
    if (val === null) return val;
    return invalidValue(typ, val, key, parent);
  }
  if (typ === false) return invalidValue(typ, val, key, parent);
  let ref: any = undefined;
  while (typeof typ === 'object' && typ.ref !== undefined) {
    ref = typ.ref;
    typ = typeMap[typ.ref];
  }
  if (Array.isArray(typ)) return transformEnum(typ, val);
  if (typeof typ === 'object') {
    return typ.hasOwnProperty('unionMembers')
      ? transformUnion(typ.unionMembers, val)
      : typ.hasOwnProperty('arrayItems')
        ? transformArray(typ.arrayItems, val)
        : typ.hasOwnProperty('props')
          ? transformObject(getProps(typ), typ.additional, val)
          : invalidValue(typ, val, key, parent);
  }
  // Numbers can be parsed by Date but shouldn't be.
  if (typ === Date && typeof val !== 'number') return transformDate(val);
  return transformPrimitive(typ, val);
}

function cast<T>(val: any, typ: any): T {
  return transform(val, typ, jsonToJSProps);
}

function uncast<T>(val: T, typ: any): any {
  return transform(val, typ, jsToJSONProps);
}

function l(typ: any) {
  return { literal: typ };
}

function a(typ: any) {
  return { arrayItems: typ };
}

function u(...typs: any[]) {
  return { unionMembers: typs };
}

function o(props: any[], additional: any) {
  return { props, additional };
}


function r(name: string) {
  return { ref: name };
}

const typeMap: any = {
  DotnetFormatTypes: o(
    [
      { json: '$schema', js: '$schema', typ: '' },
      { json: 'version', js: 'version', typ: '' },
      { json: 'runs', js: 'runs', typ: a(r('Run')) },
    ],
    false,
  ),
  Run: o(
    [
      { json: 'results', js: 'results', typ: a(r('Result')) },
      { json: 'tool', js: 'tool', typ: r('Tool') },
      { json: 'invocations', js: 'invocations', typ: a(r('Invocation')) },
      { json: 'versionControlProvenance', js: 'versionControlProvenance', typ: a(r('VersionControlProvenance')) },
      { json: 'originalUriBaseIds', js: 'originalUriBaseIds', typ: r('OriginalURIBaseIDS') },
      { json: 'artifacts', js: 'artifacts', typ: a(r('Artifact')) },
      { json: 'columnKind', js: 'columnKind', typ: '' },
    ],
    false,
  ),
  Artifact: o(
    [
      { json: 'location', js: 'location', typ: r('ArtifactLocation') },
      { json: 'hashes', js: 'hashes', typ: r('Hashes') },
    ],
    false,
  ),
  Hashes: o(
    [
      { json: 'md5', js: 'md5', typ: '' },
      { json: 'sha-1', js: 'sha-1', typ: '' },
      { json: 'sha-256', js: 'sha-256', typ: '' },
    ],
    false,
  ),
  ArtifactLocation: o(
    [
      { json: 'uri', js: 'uri', typ: '' },
      { json: 'uriBaseId', js: 'uriBaseId', typ: r('URIBaseID') },
    ],
    false,
  ),
  Invocation: o([{ json: 'executionSuccessful', js: 'executionSuccessful', typ: true }], false),
  OriginalURIBaseIDS: o([{ json: 'solutionDir', js: 'solutionDir', typ: r('SolutionDir') }], false),
  SolutionDir: o(
    [
      { json: 'uri', js: 'uri', typ: '' },
      { json: 'description', js: 'description', typ: r('Description') },
    ],
    false,
  ),
  Description: o([{ json: 'text', js: 'text', typ: '' }], false),
  Result: o(
    [
      { json: 'ruleId', js: 'ruleId', typ: '' },
      { json: 'ruleIndex', js: 'ruleIndex', typ: 0 },
      { json: 'level', js: 'level', typ: r('Level') },
      { json: 'message', js: 'message', typ: r('Description') },
      { json: 'locations', js: 'locations', typ: a(r('LocationElement')) },
      { json: 'partialFingerprints', js: 'partialFingerprints', typ: r('PartialFingerprints') },
      { json: 'properties', js: 'properties', typ: r('Properties') },
    ],
    false,
  ),
  LocationElement: o([{ json: 'physicalLocation', js: 'physicalLocation', typ: r('PhysicalLocation') }], false),
  PhysicalLocation: o(
    [
      { json: 'artifactLocation', js: 'artifactLocation', typ: r('ArtifactLocationClass') },
      { json: 'region', js: 'region', typ: r('Region') },
    ],
    false,
  ),
  ArtifactLocationClass: o(
    [
      { json: 'uri', js: 'uri', typ: '' },
      { json: 'uriBaseId', js: 'uriBaseId', typ: r('URIBaseID') },
      { json: 'index', js: 'index', typ: 0 },
    ],
    false,
  ),
  Region: o(
    [
      { json: 'startLine', js: 'startLine', typ: 0 },
      { json: 'startColumn', js: 'startColumn', typ: 0 },
      { json: 'endLine', js: 'endLine', typ: 0 },
      { json: 'endColumn', js: 'endColumn', typ: 0 },
      { json: 'charOffset', js: 'charOffset', typ: 0 },
      { json: 'charLength', js: 'charLength', typ: 0 },
    ],
    false,
  ),
  PartialFingerprints: o([{ json: 'contextRegionHash/v1', js: 'contextRegionHash/v1', typ: '' }], false),
  Properties: o([{ json: 'tags', js: 'tags', typ: a(r('Tag')) }], false),
  Tool: o([{ json: 'driver', js: 'driver', typ: r('Driver') }], false),
  Driver: o(
    [
      { json: 'name', js: 'name', typ: r('Name') },
      { json: 'organization', js: 'organization', typ: '' },
      { json: 'fullName', js: 'fullName', typ: '' },
      { json: 'semanticVersion', js: 'semanticVersion', typ: '' },
      { json: 'informationUri', js: 'informationUri', typ: '' },
      { json: 'rules', js: 'rules', typ: a(r('Rule')) },
      { json: 'taxa', js: 'taxa', typ: a(r('Taxa')) },
    ],
    false,
  ),
  Rule: o(
    [
      { json: 'id', js: 'id', typ: '' },
      { json: 'fullDescription', js: 'fullDescription', typ: u(undefined, r('Description')) },
      { json: 'help', js: 'help', typ: u(undefined, r('Description')) },
      { json: 'shortDescription', js: 'shortDescription', typ: u(undefined, r('Description')) },
      { json: 'defaultConfiguration', js: 'defaultConfiguration', typ: r('DefaultConfiguration') },
      { json: 'helpUri', js: 'helpUri', typ: u(undefined, '') },
      { json: 'relationships', js: 'relationships', typ: u(undefined, a(r('Relationship'))) },
    ],
    false,
  ),
  DefaultConfiguration: o([{ json: 'level', js: 'level', typ: r('Level') }], false),
  Relationship: o(
    [
      { json: 'target', js: 'target', typ: r('Target') },
      { json: 'kinds', js: 'kinds', typ: a(r('Kind')) },
    ],
    false,
  ),
  Target: o(
    [
      { json: 'id', js: 'id', typ: '' },
      { json: 'toolComponent', js: 'toolComponent', typ: r('ToolComponent') },
    ],
    false,
  ),
  ToolComponent: o([{ json: 'name', js: 'name', typ: r('Name') }], false),
  Taxa: o(
    [
      { json: 'id', js: 'id', typ: '' },
      { json: 'name', js: 'name', typ: '' },
      { json: 'relationships', js: 'relationships', typ: u(undefined, a(r('Relationship'))) },
    ],
    false,
  ),
  VersionControlProvenance: o(
    [
      { json: 'repositoryUri', js: 'repositoryUri', typ: '' },
      { json: 'revisionId', js: 'revisionId', typ: '' },
      { json: 'branch', js: 'branch', typ: '' },
    ],
    false,
  ),
  URIBaseID: ['solutionDir'],
  Level: ['note', 'warning'],
  Tag: ['C#', '.NET 8.0'],
  Name: ['InspectCode'],
  Kind: ['superset'],
};
