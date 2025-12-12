import * as fs from 'node:fs';
import * as path from 'node:path';
import type { GenerateFileResult } from './types/generate-file-result';
import type { GraphReference } from './types/graph-reference';
import type { SchemaClass } from './types/schema-class';
import type { SchemaProperty } from './types/schema-property';

export class SchemaClassBuilder {
  public async generateTypeScript(
    parsedClasses: Record<string, SchemaClass>,
    pathToSave: string,
  ): Promise<GenerateFileResult> {
    const projectRootDirectory: string = path.dirname(
      require.main?.filename ?? __dirname,
    );
    const outDir: string = path.resolve(projectRootDirectory, pathToSave);
    const outDirIface: string = path.join(outDir, 'interfaces');
    const outDirClasses: string = path.join(outDir, 'classes');

    // Create output directory
    await fs.promises.mkdir(outDir, { recursive: true });
    await fs.promises.mkdir(outDirIface, { recursive: true });
    await fs.promises.mkdir(outDirClasses, { recursive: true });

    let classesCount: number = 0;
    let enumsCount: number = 0;
    let interfacesCount: number = 0;

    const classes: Record<string, SchemaClass> = parsedClasses;

    const classKeys: string[] = Object.keys(classes);
    console.log(`Generating ${classKeys.length} TypeScript class files...`);

    // Write files in parallel for better performance
    const writePromises: Promise<void>[] = classKeys.map(
      async (key: string): Promise<void> => {
        const classObj: SchemaClass | undefined = classes[key];
        if (classObj !== undefined) {
          const filePath: string = path.join(
            outDirIface,
            `${classObj.name}.ts`,
          );
          const filePathClass: string = path.join(
            outDirClasses,
            `${classObj.name}.schema.ts`,
          );
          try {
            if (classObj.isEnumeration) {
              if (classObj.enumValues.length > 0) {
                const enumDef: string = this.generateEnumTs(classObj);
                await fs.promises.writeFile(filePath, enumDef, {
                  encoding: 'utf-8',
                });
                enumsCount++;
              }
            } else {
              const ifaceDef: string = this.generateInterfaceTs(
                classObj,
                classes,
              );
              await fs.promises.writeFile(filePath, ifaceDef, {
                encoding: 'utf-8',
              });

              interfacesCount++;

              const classDef: string = this.generateClasseTs(classObj, classes);
              await fs.promises.writeFile(filePathClass, classDef, {
                encoding: 'utf-8',
              });

              classesCount++;
            }
            //eslint-disable-next-line @typescript-eslint/no-explicit-any
          } catch (error: any) {
            console.error(
              `Error generating class for ${classObj.name}:`,
              error?.message,
            );
            throw error;
          }
        }
      },
    );

    await Promise.all(writePromises);
    // Generate index file for easy imports
    console.log('Generating index file...');
    const indexContent: string = this.generateIndexFile(classes);
    await fs.promises.writeFile(path.join(outDir, 'index.ts'), indexContent, {
      encoding: 'utf-8',
    });

    return {
      classes: classesCount,
      enums: enumsCount,
      interfaces: interfacesCount,
    };
  }

  /**
   * Generate an index.ts file that exports all classes
   */
  private generateIndexFile(classes: Record<string, SchemaClass>): string {
    let content: string = '/**\n';
    content += ' * Auto-generated index file for schema.org classes\n';
    content +=
      ' * This file exports all generated schema.org TypeScript classes\n';
    content += ' */\n\n';

    content += '\n\n/**\n';
    content += ' * Interfaces\n';
    content += ' */\n';
    for (const schemaClass of Object.values(classes)) {
      if (!schemaClass.isEnumeration) {
        content += `export type { ${schemaClass.name} } from './interfaces/${schemaClass.name}';\n`;
      }
    }
    content += '\n\n/**\n';
    content += ' * Schema classes\n';
    content += ' */\n';
    for (const schemaClass of Object.values(classes)) {
      if (!schemaClass.isEnumeration) {
        content += `export { ${schemaClass.name}Schema } from './classes/${schemaClass.name}.schema';\n`;
      }
    }
    content += '\n\n/**\n';
    content += ' * Enums\n';
    content += ' */\n';
    for (const schemaClass of Object.values(classes)) {
      if (schemaClass.isEnumeration && schemaClass.enumValues.length > 0) {
        content += `export { ${schemaClass.name} } from './interfaces/${schemaClass.name}';\n`;
      }
    }

    return content;
  }

  private generateClasseTs(
    classObj: SchemaClass,
    allClasses: Record<string, SchemaClass>,
  ): string {
    const name: string = classObj.name;
    const listToImport: string[] = [];

    if (typeof name !== 'string') {
      throw new Error(`Class name is not a string: ${JSON.stringify(name)}`);
    }

    // Get ALL properties including inherited ones from all parent interfaces
    const allProps: SchemaProperty[] = this.getAllProperties(
      classObj,
      allClasses,
    );

    let code: string = '';
    code += `/**\n * ${classObj.comment || ''}\n */\n`;

    listToImport.push(
      this.generateImport(
        'SchemaInterface',
        '../../classes/schema.interface',
        true,
      ),
    );
    listToImport.push(
      this.generateImport(
        'SchemaMetadata',
        '../../classes/schema-metadata',
        true,
      ),
    );
    listToImport.push(this.generateImport(name, `../interfaces/${name}`));

    code += `export class ${name}Schema`;

    const implementClasses: string[] = [];
    implementClasses.push('SchemaInterface');
    implementClasses.push(name);

    code += ` implements ${implementClasses.join(', ')}`;

    code += ` {\n`;

    code += `  public schema_metadata: SchemaMetadata = {\n`;
    code += `    id: '${classObj.id}',\n`;
    code += `    label: '${classObj.name}',\n`;
    code += `    subClassOf: [${classObj.parent?.map((parent: GraphReference): string => `'${parent['@id']}'`).join(',') || ''}],\n`;
    code += `  };\n\n`;

    // Add all properties from the interface (including inherited ones)
    for (const prop of allProps) {
      if (typeof prop.name !== 'string') {
        throw new Error(
          `Property name is not a string: ${JSON.stringify(prop.name)}`,
        );
      }

      const typeStr: string = this.generatePropertyType(
        prop.type,
        name,
        allClasses,
        listToImport,
        `../interfaces/`,
      );

      // Use JSDoc format for better IDE support
      code += `  /**\n   * ${prop.comment || 'No description available'}\n   */\n`;
      // Make properties optional (schema.org properties are typically optional)
      code += `  public ${prop.name}?: ${typeStr};\n\n`;
    }

    code += '}\n';

    // Remove duplicates, sort, and filter self-imports
    const uniqueImports: string[] = Array.from(new Set(listToImport)).sort();

    if (uniqueImports.length > 0) {
      code = uniqueImports.join('\n') + '\n\n' + code;
    }

    return code;
  }
  private generateEnumTs(classObj: SchemaClass): string {
    const name: string = classObj.name;
    if (typeof name !== 'string') {
      throw new Error(`Class name is not a string: ${JSON.stringify(name)}`);
    }
    let code: string = '';

    // Handle enumerations differently
    if (classObj.isEnumeration) {
      // For enumerations, we could generate a type alias or keep as class
      // Keeping as class for consistency, but marking it clearly
      code += `/** @enumeration */\n`;
    }

    code += `export enum ${name}`;
    code += ` {\n`;

    for (const enumValue of classObj.enumValues) {
      code += `  ${enumValue.label}= 'https://schema.org/${enumValue.label}',\n`;
    }
    code += `}\n`;
    return code;
  }
  private generateInterfaceTs(
    classObj: SchemaClass,
    allClasses: Record<string, SchemaClass>,
  ): string {
    const name: string = classObj.name;
    const allProps: SchemaProperty[] = classObj.properties || [];
    const listToImport: string[] = [];

    if (typeof name !== 'string') {
      throw new Error(`Class name is not a string: ${JSON.stringify(name)}`);
    }

    // Filter out properties that are inherited from parent classes
    const inheritedProp: Set<SchemaProperty> = this.getInheritedPropertyNames(
      classObj,
      allClasses,
    );
    const inheritedPropNames: Set<string> = new Set(
      Array.from(inheritedProp).map((prop: SchemaProperty) => prop.name),
    );
    const props: SchemaProperty[] = allProps.filter(
      (prop: SchemaProperty): boolean => !inheritedPropNames.has(prop.name),
    );

    let code: string = '';
    code += `/**\n * ${classObj.comment || ''}\n */\n`;

    // Handle enumerations differently
    if (classObj.isEnumeration) {
      // For enumerations, we could generate a type alias or keep as class
      // Keeping as class for consistency, but marking it clearly
      code += `/** @enumeration */\n`;
    }

    code += `export interface ${name}`;

    if (classObj.parent !== null) {
      const parents: GraphReference[] = classObj.parent;
      const parentClasses: string[] = [];
      for (const parent of parents) {
        const parentObj: SchemaClass | undefined = allClasses[parent['@id']];
        if (parentObj !== undefined) {
          // Don't extend Enumeration base class
          if (parentObj.name !== 'Enumeration') {
            parentClasses.push(parentObj.name);
            listToImport.push(
              this.generateImport(parentObj.name, `./${parentObj.name}`),
            );
          }
        } else {
          if (this.schemaTypeToPrimitive(parent['@id']) === null) {
            console.warn(
              `Parent class ${parent['@id']} not found for class ${name}`,
            );
          }
        }
      }

      if (parentClasses.length > 0) {
        code += ` extends ${parentClasses.join(', ')}`;
      }
    }

    code += ` {\n`;

    for (const prop of props) {
      if (typeof prop.name !== 'string') {
        throw new Error(
          `Property name is not a string: ${JSON.stringify(prop.name)}`,
        );
      }

      const typeStr: string = this.generatePropertyType(
        prop.type,
        name,
        allClasses,
        listToImport,
        null,
      );

      // Use JSDoc format for better IDE support
      code += `\n  /**\n   * ${prop.comment || 'No description available'}\n   */\n`;
      // Make properties optional (schema.org properties are typically optional)
      code += `  ${prop.name}?: ${typeStr};\n`;
    }

    code += '}\n';

    // Remove duplicates, sort, and filter self-imports
    const uniqueImports: string[] = Array.from(new Set(listToImport)).sort();

    if (uniqueImports.length > 0) {
      code = uniqueImports.join('\n') + '\n\n' + code;
    }

    return code;
  }

  /**
   * Get all properties including inherited ones from parent classes
   */
  private getAllProperties(
    classObj: SchemaClass,
    allClasses: Record<string, SchemaClass>,
  ): SchemaProperty[] {
    const allPropsMap: Map<string, SchemaProperty> = new Map<
      string,
      SchemaProperty
    >();

    const inheritedProps: Set<SchemaProperty> = this.getInheritedPropertyNames(
      classObj,
      allClasses,
    );
    for (const prop of inheritedProps) {
      allPropsMap.set(prop.name, prop);
    }

    // Add own properties (these take precedence)
    for (const prop of classObj.properties) {
      allPropsMap.set(prop.name, prop);
    }

    return Array.from(allPropsMap.values());
  }
  private schemaTypeToPrimitive(typeId: string): string | null {
    switch (typeId) {
      case 'schema:Text':
        return 'string';
      case 'schema:Number':
        return 'number';
      case 'schema:Integer':
        return 'number';
      case 'schema:Float':
        return 'number';
      case 'schema:Boolean':
        return 'boolean';
      case 'schema:Date':
      case 'schema:DateTime':
        return 'Date';
      case 'schema:Time':
        return 'string';
      case 'schema:URL':
        return 'string';
      case 'schema:CssSelectorType':
        return 'string';
      case 'schema:XPathType':
        return 'string';
      case 'schema:PronounceableText':
        return 'string';
      case 'schema:DataTypeSchema':
        return 'string';
      default:
        return null; // Return as is for non-primitive types
    }
  }

  /**
   * Generate property type string with support for arrays
   * For class types, generates: ClassName | ClassName[]
   * For primitives, generates: primitive | primitive[]
   */
  private generatePropertyType(
    propType: GraphReference[] | string,
    currentClassName: string,
    allClasses: Record<string, SchemaClass>,
    listToImport: string[],
    importPath: string | null = null,
  ): string {
    if (Array.isArray(propType)) {
      const types: string[] = propType
        .map((ref: GraphReference): string | undefined => {
          const primitive: string | null = this.schemaTypeToPrimitive(
            ref['@id'],
          );
          if (primitive !== null) {
            // For primitives, allow both single value and array
            return `${primitive} | ${primitive}[]`;
          } else {
            const classData: SchemaClass = allClasses[
              ref['@id']
            ] as SchemaClass;
            const className: string = classData?.name;
            const isEnum: boolean = classData?.isEnumeration ?? false;
            if (className === undefined) {
              console.error('Type not found for reference:', ref);
              return undefined;
            } else {
              if (
                currentClassName !== className &&
                (!classData.isEnumeration || classData.enumValues.length > 0)
              ) {
                listToImport.push(
                  this.generateImport(
                    className,
                    importPath ? importPath + className : null,
                  ),
                );
              }
            }
            if (isEnum) {
              const parents: GraphReference[] = this.getAllParents(
                classData as SchemaClass,
                allClasses,
              );
              const children: GraphReference[] = this.getAllChildren(
                classData as SchemaClass,
                allClasses,
              );

              const enumParents: string[] = parents
                .filter((parent: GraphReference): boolean => {
                  const classData: SchemaClass | undefined =
                    allClasses[parent['@id']];
                  return (
                    classData !== undefined &&
                    classData.isEnumeration &&
                    classData.enumValues.length > 0
                  );
                })
                .map(
                  (parent: GraphReference): string | undefined =>
                    allClasses[parent['@id']]?.name,
                )
                .filter(
                  (classname: string | undefined): classname is string =>
                    classname !== undefined,
                );

              const enumChildren: string[] = children
                .filter((child: GraphReference): boolean => {
                  const classData: SchemaClass | undefined =
                    allClasses[child['@id']];

                  return (
                    classData !== undefined &&
                    classData.isEnumeration &&
                    classData.enumValues.length > 0
                  );
                })
                .map(
                  (child: GraphReference): string | undefined =>
                    allClasses[child['@id']]?.name,
                )
                .filter(
                  (classname: string | undefined): classname is string =>
                    classname !== undefined,
                );

              // We get the parents enum also
              const types: string[] = [...enumParents, ...enumChildren];

              for (const typeToImport of types) {
                listToImport.push(
                  this.generateImport(
                    typeToImport,
                    importPath ? importPath + typeToImport : null,
                  ),
                );
              }

              if (classData && classData.enumValues.length > 0) {
                types.push(className);
              }

              if (types.length === 0) {
                return 'any';
              }

              return types.join(' | ');
            } else {
              // For class types, allow both single instance and array
              return `${className} | ${className}[]`;
            }
          }
        })
        .filter(
          (typeStr: string | undefined): typeStr is string =>
            typeStr !== undefined,
        );

      // Remove duplicates from union types
      const uniqueTypes: string[] = Array.from(new Set(types));
      const typeStr: string = uniqueTypes.join(' | ');

      if (typeStr === '') {
        console.warn(`Type empty for property`);
        return 'any';
      }
      return typeStr;
    } else {
      return propType;
    }
  }

  private generateImport(
    className: string,
    from: string | null = null,
    isType: boolean = true,
  ): string {
    const fromString: string = from === null ? `./${className}` : from;

    return `import ${isType ? 'type ' : ''}{ ${className} } from '${fromString}';`;
  }

  /**
   * Get all inherited property names from parent classes
   */
  private getInheritedPropertyNames(
    classObj: SchemaClass,
    allClasses: Record<string, SchemaClass>,
  ): Set<SchemaProperty> {
    const inheritedProps: Set<SchemaProperty> = new Set<SchemaProperty>();
    const allParents: GraphReference[] = this.getAllParents(
      classObj,
      allClasses,
    );
    for (const parent of allParents) {
      const parentClass: SchemaClass | undefined = allClasses[parent['@id']];
      if (parentClass) {
        for (const prop of parentClass.properties) {
          inheritedProps.add(prop);
        }
      }
    }

    return inheritedProps;
  }

  private getAllParents(
    classObj: SchemaClass,
    allClasses: Record<string, SchemaClass>,
  ): GraphReference[] {
    const allParents: GraphReference[] = [];
    const parents: GraphReference[] | null = classObj.parent;
    if (parents) {
      allParents.push(...parents);
      for (const parent of parents) {
        const parentClass: SchemaClass | undefined = allClasses[parent['@id']];
        if (!parentClass) break;

        const parentParents: GraphReference[] = this.getAllParents(
          parentClass,
          allClasses,
        );
        allParents.push(...parentParents);
      }
    }

    return Array.from(new Set(allParents)).sort();
  }

  private getAllChildren(
    classObj: SchemaClass,
    allClasses: Record<string, SchemaClass>,
  ): GraphReference[] {
    const allChildren: GraphReference[] = [];

    for (const schemaClass of Object.values(allClasses)) {
      const parents: GraphReference[] | null = schemaClass.parent;
      if (parents) {
        if (
          parents.some(
            (parent: GraphReference): boolean => parent['@id'] === classObj.id,
          )
        ) {
          allChildren.push({
            '@id': schemaClass.id,
          });
          allChildren.push(...this.getAllChildren(schemaClass, allClasses));
        }
      }
    }

    return allChildren;
  }
}
