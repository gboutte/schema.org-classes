export type RdfsLabel =
  | string
  | {
      '@language': string;
      '@value': string;
    };
