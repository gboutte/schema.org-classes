import type {SchemaEnum} from "./schema-enum";
import type {SchemaProperty} from "./schema-property";
import type {SchemaClass} from "./schema-class";

export type ParsedJsonSchema = {
    enums:Record<string, SchemaEnum[]>;
    properties:Record<string, SchemaProperty[]>;
    classes:Record<string, SchemaClass>;
}