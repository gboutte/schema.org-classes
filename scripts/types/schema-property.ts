import type { GraphReference } from './graph-reference';

export type SchemaProperty = {
  name: string;
  id: string;
  comment: string;
  type: GraphReference[] | string;
};
