import type { SchemaInterface } from '../classes/schema.interface';

export class StructuredDataService {
  private getJsonProperties(schema: SchemaInterface) {
    const keys = Object.keys(schema);
    const jsonProperties: any = {};
    for (const key of keys) {
      const value: any = schema[key as keyof typeof schema];
      if (value !== undefined && key !== 'schema_metadata') {
        // Check if value is an array
        if (Array.isArray(value)) {
          jsonProperties[key] = value.map((item) => {
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
  private isSchemaInterface(value: any): value is SchemaInterface {
    return (
      value !== null &&
      typeof value === 'object' &&
      'schema_metadata' in value &&
      typeof value.schema_metadata === 'object' &&
      'id' in value.schema_metadata
    );
  }

  getStructuredData(schema: SchemaInterface): any {
    const jsonData = this.getJsonProperties(schema);
    jsonData['@context'] = 'https://schema.org';

    //Order data
    const orderedData: any = {};
    const orderedKeys = Object.keys(jsonData).sort();
    for (const key of orderedKeys) {
      orderedData[key] = jsonData[key];
    }

    return orderedData;
  }
  getStructuredDataJsonString(schema: SchemaInterface): string {
    return JSON.stringify(this.getStructuredData(schema));
  }
}
