import type { SchemaInterface } from '../classes/schema.interface';

export class StructuredDataService {
  //eslint-disable-next-line @typescript-eslint/no-explicit-any
  private getJsonProperties(schema: SchemaInterface): Record<string, any> {
    const keys: string[] = Object.keys(schema);
    //eslint-disable-next-line @typescript-eslint/no-explicit-any
    const jsonProperties: any = {};
    for (const key of keys) {
      //eslint-disable-next-line @typescript-eslint/no-explicit-any
      const value: any = schema[key as keyof typeof schema];
      if (value !== undefined && key !== 'schema_metadata') {
        // Check if value is an array
        if (Array.isArray(value)) {
          //eslint-disable-next-line @typescript-eslint/no-explicit-any
          jsonProperties[key] = value.map((item: any) => {
            // Check if array item implements SchemaInterface
            if (this.isSchemaInterface(item)) {
              return this.getJsonProperties(item);
            }
            return item;
          });
        }
        // Check if value also implements SchemaInterface
        else if (this.isSchemaInterface(value)) {
          jsonProperties[key] = this.getJsonProperties(value);
        } else {
          jsonProperties[key] = value;
        }
      }
    }
    jsonProperties['@type'] = schema.schema_metadata.label;
    return jsonProperties;
  }

  /**
   * Check if a value implements SchemaInterface
   */
  //eslint-disable-next-line @typescript-eslint/no-explicit-any
  private isSchemaInterface(value: any): value is SchemaInterface {
    return (
      value !== null &&
      typeof value === 'object' &&
      'schema_metadata' in value &&
      typeof value.schema_metadata === 'object' &&
      'id' in value.schema_metadata
    );
  }

  //eslint-disable-next-line @typescript-eslint/no-explicit-any
  public getStructuredData(schema: SchemaInterface): any {
    //eslint-disable-next-line @typescript-eslint/no-explicit-any
    const jsonData: Record<string, any> = this.getJsonProperties(schema);
    jsonData['@context'] = 'https://schema.org';

    //Order data
    //eslint-disable-next-line @typescript-eslint/no-explicit-any
    const orderedData: any = {};
    const orderedKeys: string[] = Object.keys(jsonData).sort();
    for (const key of orderedKeys) {
      orderedData[key] = jsonData[key];
    }

    return orderedData;
  }
  public getStructuredDataJsonString(schema: SchemaInterface): string {
    return JSON.stringify(this.getStructuredData(schema));
  }
}
