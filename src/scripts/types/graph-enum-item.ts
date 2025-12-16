import type { RdfsLabel } from './rdfs-label';

export type GraphEnumItem = {
  '@id': string;
  '@type': string;
  'rdfs:label'?: RdfsLabel;
  'rdfs:comment'?: string;
};
