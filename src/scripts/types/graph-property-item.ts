import type { GraphReference } from './graph-reference';
import type { RdfsLabel } from './rdfs-label';

export type GraphPropertyItem = {
  '@id': string;
  '@type': string | string[];
  'rdfs:label'?: RdfsLabel;
  'rdfs:comment'?: string;
  'schema:domainIncludes'?: GraphReference[] | GraphReference;
  'schema:rangeIncludes'?: GraphReference[] | GraphReference;
  'rdfs:subPropertyOf'?: GraphReference[] | GraphReference;
  'schema:supersededBy'?: GraphReference[] | GraphReference;
  'schema:isPartOf'?: GraphReference[] | GraphReference;
  'schema:inverseOf'?: GraphReference[] | GraphReference;
  'schema:contributor'?: GraphReference[] | GraphReference;
  'schema:source'?: GraphReference[] | GraphReference;
  'owl:equivalentProperty'?: GraphReference[] | GraphReference;
  'skos:exactMatch'?: GraphReference[] | GraphReference;
  'skos:closeMatch'?: GraphReference[] | GraphReference;
};
