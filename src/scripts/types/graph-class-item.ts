import type { GraphReference } from './graph-reference';
import type { RdfsComment } from './rdfs-comment';
import type { RdfsLabel } from './rdfs-label';

export type GraphClassItem = {
  '@id': string;
  '@type': string | string[];
  'rdfs:label'?: RdfsLabel;
  'rdfs:comment'?: RdfsComment;
  'rdfs:subClassOf'?: GraphReference[] | GraphReference;
  'schema:domainIncludes'?: GraphReference[] | GraphReference;
  'schema:rangeIncludes'?: GraphReference[] | GraphReference;
  'schema:supersededBy'?: GraphReference[] | GraphReference;
  'schema:isPartOf'?: GraphReference[] | GraphReference;
  'schema:inverseOf'?: GraphReference[] | GraphReference;
  'schema:contributor'?: GraphReference[] | GraphReference;
  'schema:source'?: GraphReference[] | GraphReference;
  'owl:equivalentClass'?: GraphReference[] | GraphReference;
  'skos:exactMatch'?: GraphReference[] | GraphReference;
  'skos:closeMatch'?: GraphReference[] | GraphReference;
};
