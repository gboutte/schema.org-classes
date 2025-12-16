import type { GraphReference } from './graph-reference';
import type { RdfsComment } from './rdfs-comment';

export type SchemaProperty = {
  name: string;
  id: string;
  comment: RdfsComment;
  type: GraphReference[] | string;
};
