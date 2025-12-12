import type { SchemaClass } from './schema-class';
import type { SchemaEnum } from './schema-enum';
import type { SchemaProperty } from './schema-property';

export type ParsedJsonSchema = {
  enums: Record<string, SchemaEnum[]>;
  properties: Record<string, SchemaProperty[]>;
  classes: Record<string, SchemaClass>;
};
