import { SchemaClassBuilder } from './scripts/schema-class-builder';
import { SchemaParser } from './scripts/schema-parser';
import type { ParsedJsonSchema } from './scripts/types/parsed-json-schema';

async function main() {
  const jsonldPath = 'schemaorg-current-https.jsonld';

  const parser = new SchemaParser();
  const parsedData: ParsedJsonSchema = await parser.parse(jsonldPath);

  const builder = new SchemaClassBuilder();
  builder.generateTypeScript(parsedData, 'out');

  //
  // console.log(`✓ Done: ${classKeys.length} TypeScript class files generated in ./out`);
  // console.log(`✓ Index file created for easy imports`);
}

main().catch(console.error);
