export type RdfsComment =
  | string
  | {
      '@language': string;
      '@value': string;
    };
