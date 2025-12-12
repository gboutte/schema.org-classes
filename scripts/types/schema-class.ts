import type {SchemaProperty} from "./schema-property";
import type {GraphReference} from "./graph-reference";
import type {SchemaEnum} from "./schema-enum";

export type SchemaClass = {
    name: string;
    id: string;
    comment: string;
    parent: GraphReference[]|null;
    properties: SchemaProperty[];
    isEnumeration: boolean;
    enumValues: SchemaEnum[];
}
