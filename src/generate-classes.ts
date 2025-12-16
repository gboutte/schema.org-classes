import type {GenerateFileResult} from "./scripts/types/generate-file-result";
import {SchemaClassBuilder} from "./scripts/schema-class-builder";
import {SchemaParser} from "./scripts/schema-parser";
import type {SchemaClass} from "./scripts/types/schema-class";

async function main(): Promise<void> {
  const jsonldPath: string = 'schemaorg-current-https.jsonld';

  const parser: SchemaParser = new SchemaParser();
  const parsedData: Record<string, SchemaClass> =
    await parser.parse(jsonldPath);

  const builder: SchemaClassBuilder = new SchemaClassBuilder();
  const result: GenerateFileResult = await builder.generateTypeScript(
    parsedData,
    'out',
  );

  console.log(
    `✓ Done: ${result.classes} classes,${result.interfaces} interfaces, ${result.enums} enums generated in ./out`,
  );
}

main().catch(console.error);
