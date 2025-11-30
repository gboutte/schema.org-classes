import * as path from "node:path";
import * as fs from "node:fs";


type SchemaProperty = {
    name: string;
    id: string;
    comment: string;
    type: GraphReference[]|string;
};

type SchemaEnum = {
    id:string;
    type:string;
    label:string;
    comment:string;
    }

type SchemaClass = {
    name: string;
    id: string;
    comment: string;
    parent: GraphReference[]|null;
    properties: SchemaProperty[];
    isEnumeration: boolean;
    enumValues: SchemaEnum[];
}

type RdfsLabel = string | {
    "@language": string,
    "@value": string
}
type GraphClassItem = {
    "@id": string;
    "@type": string|string[];
    "rdfs:label"?: RdfsLabel;
    "rdfs:comment"?: string;
    "rdfs:subClassOf"?:GraphReference[]|GraphReference;
    "schema:domainIncludes"?: GraphReference[]|GraphReference;
    "schema:rangeIncludes"?: GraphReference[]|GraphReference;
    "schema:supersededBy"?: GraphReference[]|GraphReference;
    "schema:isPartOf"?: GraphReference[]|GraphReference;
    "schema:inverseOf"?: GraphReference[]|GraphReference;
    "schema:contributor"?: GraphReference[]|GraphReference;
    "schema:source"?: GraphReference[]|GraphReference;
    "owl:equivalentClass"?: GraphReference[]|GraphReference;
    "skos:exactMatch"?: GraphReference[]|GraphReference;
    "skos:closeMatch"?: GraphReference[]|GraphReference;
};
type GraphPropertyItem = {
    "@id": string;
    "@type": string|string[];
    "rdfs:label"?: RdfsLabel;
    "rdfs:comment"?: string;
    "schema:domainIncludes"?: GraphReference[]|GraphReference;
    "schema:rangeIncludes"?: GraphReference[]|GraphReference;
    "rdfs:subPropertyOf"?: GraphReference[]|GraphReference;
    "schema:supersededBy"?: GraphReference[]|GraphReference;
    "schema:isPartOf"?: GraphReference[]|GraphReference;
    "schema:inverseOf"?: GraphReference[]|GraphReference;
    "schema:contributor"?: GraphReference[]|GraphReference;
    "schema:source"?: GraphReference[]|GraphReference;
    "owl:equivalentProperty"?: GraphReference[]|GraphReference;
    "skos:exactMatch"?: GraphReference[]|GraphReference;
    "skos:closeMatch"?: GraphReference[]|GraphReference;
};

type GraphEnumItem = {
    "@id": string;
    "@type": string;
    "rdfs:label"?: RdfsLabel;
    "rdfs:comment"?: string;
};


type GraphReference = {
    "@id": string;
}

/**
 * Sanitize a class name to be a valid TypeScript identifier
 * Prefixes names that start with a number with an underscore
 */
function sanitizeClassName(name: string): string {
    // Check if the name starts with a digit
    if (/^[0-9]/.test(name)) {
        return '_' + name;
    }
    return name;
}

/**
 * Extract name from rdfs:label or fallback to @id
 */
function extractName(label: RdfsLabel | undefined, id: string): string {
    let name: string;
    if (label) {
        if (typeof label === 'string') {
            name = label;
        } else {
            name = label['@value'];
        }
    } else {
        name = id;
    }
    return sanitizeClassName(name);
}

/**
 * Check if a class is an enumeration
 */
function isEnumeration(graphClass: GraphClassItem, allClasses: GraphClassItem[]): boolean {
    const types = Array.isArray(graphClass['@type']) ? graphClass['@type'] : [graphClass['@type']];

    const isClass = types.includes('rdfs:Class');

    const subClassOf = graphClass['rdfs:subClassOf'];

    let parents : GraphReference[];
    if(subClassOf !== undefined){
        if(Array.isArray(subClassOf)){
            parents = subClassOf;
        }else{
            parents = [subClassOf];
        }
    }else{
        parents = [];
    }

    const parentsClassesItems : GraphClassItem[] = [];
    for (const parent of parents) {
        const parentClass = allClasses.find(el => el['@id'] === parent['@id']);
        if (parentClass) {
            parentsClassesItems.push(parentClass);
        }
    }

    const isEnum = parents.some((parent) => parent['@id'] === 'schema:Enumeration')
    const isParentEnum = parentsClassesItems.some(parent => isEnumeration(parent,allClasses));


    return isClass && (isEnum || isParentEnum);
}

function parseClass(
    graphItems:(GraphClassItem|GraphPropertyItem|GraphEnumItem)[],
    properties:Record<string, SchemaProperty[]> ,
    enums:Record<string, SchemaEnum[]> ,
){
    const classes:GraphClassItem[] = graphItems.filter(el => {
        const types = Array.isArray(el['@type']) ? el['@type'] : [el['@type']];
        return types.includes('rdfs:Class');
    });

    const classIdMap: Record<string, SchemaClass> = {};
    for (const graphSchemaClass of classes) {
        let parent:GraphReference[]|null = null;
        if(graphSchemaClass['rdfs:subClassOf'] !== undefined){

            if(Array.isArray(graphSchemaClass['rdfs:subClassOf'])){
                parent = graphSchemaClass['rdfs:subClassOf'];
            }else{
                parent = [graphSchemaClass['rdfs:subClassOf']];
            }
        }

        const name = extractName(graphSchemaClass["rdfs:label"], graphSchemaClass['@id']);
        const isEnum = isEnumeration(graphSchemaClass,classes);

        classIdMap[graphSchemaClass['@id']] ={
            name: name,
            id: graphSchemaClass['@id'] || '',
            comment: graphSchemaClass['rdfs:comment'] || '',
            parent: parent,
            properties: properties[graphSchemaClass['@id']] || [],
            isEnumeration: isEnum,
            enumValues: enums[graphSchemaClass['@id']] || [],
        }
    }

    return classIdMap
}

function parseEnum(graphItems:(GraphClassItem|GraphPropertyItem|GraphEnumItem)[]):Record<string, SchemaEnum[]>{
    const enums:GraphEnumItem[] = graphItems.filter(el => {
        const types = Array.isArray(el['@type']) ? el['@type'] : [el['@type']];
        return types.find((type)=> type.startsWith('schema')) && types.length === 1
    }) as GraphEnumItem[];


    const classEnumsMap: Record<string, SchemaEnum[]> = {};

    for (const oneEnum of enums) {
        const classId = oneEnum['@id'];
        const type = oneEnum['@type'];
        if (!classEnumsMap[type]) classEnumsMap[type] = [];
        classEnumsMap[type].push({
            id: classId,
            type: oneEnum['@type'],
            label: extractName(oneEnum["rdfs:label"], classId),
            comment: oneEnum['rdfs:comment'] || '',
        })
    }

    return classEnumsMap
}


/**
 * Primitive type mappings from schema.org to TypeScript
 */
function parseProperties(graphItems:(GraphClassItem|GraphPropertyItem|GraphEnumItem)[]):Record<string, SchemaProperty[]>{
    const properties:GraphPropertyItem[] = graphItems.filter(el => {
        const types = Array.isArray(el['@type']) ? el['@type'] : [el['@type']];
        return types.includes('rdf:Property');
    });

    const classPropsMap: Record<string, SchemaProperty[]> = {};

    for (const prop of properties) {
        const domain = prop['schema:domainIncludes'];
        if (!domain) continue;
        const domains = Array.isArray(domain) ? domain : [domain];
        for (const domain of domains) {
            if (!domain['@id']) continue;
            const classId = domain['@id'];
            if (!classPropsMap[classId]) classPropsMap[classId] = [];

            const name = extractName(prop["rdfs:label"], prop['@id']);

            classPropsMap[classId].push({
                name: name,
                id: prop['@id'],
                comment: prop['rdfs:comment'] || '',
                type: prop['schema:rangeIncludes'] ? (
                    Array.isArray(prop['schema:rangeIncludes']) ?
                        prop['schema:rangeIncludes']
                        : [prop['schema:rangeIncludes']]
                ) : 'any',
            });
        }
    }
    return classPropsMap
}


function buildImport(className:string,from:string|null = null,isType:boolean = true):string{

    const fromString:string = from === null ?`./${className}` : from;

    return `import ${isType ? 'type ' : ''}{ ${className} } from '${fromString}';`;
}

/**
 * Generate property type string with support for arrays
 * For class types, generates: ClassName | ClassName[]
 * For primitives, generates: primitive | primitive[]
 */
function generatePropertyType(propType: GraphReference[] | string, currentClassName: string, allClasses: Record<string, SchemaClass>, listToImport: string[], importPath: string|null = null): string {
    if (Array.isArray(propType)) {
        const types = propType.map(ref => {

            const primitive = schemaTypeToPrimitive(ref['@id']);
            if (primitive !== null) {
                // For primitives, allow both single value and array
                return `${primitive} | ${primitive}[]`;
            } else {

                const classData:SchemaClass =  allClasses[ref['@id']] as SchemaClass;
                const className =classData?.name;
                const isEnum = classData?.isEnumeration ?? false;
                if (className === undefined) {
                    console.error('Type not found for reference:', ref);
                    return undefined;
                } else {
                    if (currentClassName !== className && (!classData.isEnumeration || classData.enumValues.length > 0)) {
                        listToImport.push(buildImport(className,importPath ? importPath+className : null));
                    }
                }
                if(isEnum){
                    const parents = getAllParents(classData as SchemaClass,allClasses);
                    const children = getAllChildren(classData as SchemaClass,allClasses);

                    const enumParents = parents
                        .filter(parent => {
                            const classData = allClasses[parent['@id']];
                            return classData && classData.isEnumeration && classData.enumValues.length > 0
                        })
                        .map(parent => allClasses[parent['@id']]?.name);

                    const enumChildren = children
                        .filter(child =>{
                            const classData = allClasses[child['@id']];

                            return classData && classData.isEnumeration && classData.enumValues.length > 0
                        })
                        .map(child => allClasses[child['@id']]?.name);


                    // We get the parents enum also
                    const types = [...enumParents,...enumChildren].filter((classname) => classname !== undefined);

                    for(const typeToImport of types){

                        listToImport.push(buildImport(typeToImport,importPath ? importPath+typeToImport : null));
                    }

                    if(classData && classData.enumValues.length > 0){
                        types.push(className)
                    }

                    if(types.length === 0){
                        return 'any';
                    }

                    return types.join(' | ');
                }else {
                    // For class types, allow both single instance and array
                    return `${className} | ${className}[]`;
                }
            }
        }).filter((typeStr) => typeStr !== undefined);

        // Remove duplicates from union types
        const uniqueTypes = Array.from(new Set(types));
        const typeStr = uniqueTypes.join(' | ');

        if (typeStr === '') {
            console.warn(`Type empty for property`);
            return 'any';
        }
        return typeStr;
    } else {
        return propType;
    }
}

function getAllParents(classObj: SchemaClass, allClasses: Record<string, SchemaClass>):GraphReference[]{

    const allParents:GraphReference[] = []
    const parents = classObj.parent;
    if(parents) {
        allParents.push(...parents);
        for (let parent of parents) {
            const parentClass:SchemaClass|undefined = allClasses[parent['@id']];
            if (!parentClass) break;

            const parentParents = getAllParents(parentClass, allClasses);
            allParents.push(...parentParents);
        }
    }

    return Array.from(new Set(allParents)).sort();;
}

function getAllChildren(classObj: SchemaClass, allClasses: Record<string, SchemaClass>):GraphReference[]{
    const allChildren:GraphReference[] = [];

    for(const schemaClass of Object.values(allClasses)){
        const parents = schemaClass.parent;
        if(parents){
            if(parents.some(parent => parent['@id'] === classObj.id)){
                allChildren.push({
                    '@id': schemaClass.id,
                });
                allChildren.push(...getAllChildren(schemaClass,allClasses))
            }
        }
    }


    return allChildren;
}


/**
 * Get all inherited property names from parent classes
 */
function getInheritedPropertyNames(classObj: SchemaClass, allClasses: Record<string, SchemaClass>): Set<SchemaProperty> {
    const inheritedProps = new Set<SchemaProperty>();
    const allParents:GraphReference[] = getAllParents(classObj, allClasses);
    for (let parent of allParents) {

        const parentClass:SchemaClass|undefined = allClasses[parent['@id']];
        if(parentClass) {
            for (const prop of parentClass.properties) {
                inheritedProps.add(prop);
            }
        }
    }

    return inheritedProps;
}

/**
 * Get all properties including inherited ones from parent classes
 */
function getAllProperties(classObj: SchemaClass, allClasses: Record<string, SchemaClass>): SchemaProperty[] {
    const allPropsMap = new Map<string, SchemaProperty>();

    const inheritedProps = getInheritedPropertyNames(classObj, allClasses);
    for (const prop of inheritedProps) {
        allPropsMap.set(prop.name, prop);
    }

    // Add own properties (these take precedence)
    for (const prop of classObj.properties) {
        allPropsMap.set(prop.name, prop);
    }

    return Array.from(allPropsMap.values());
}

function generateClasseTs(classObj: SchemaClass,allClasses:Record<string, SchemaClass>): string {
    const name = classObj.name;
    const listToImport:string[] = [];

    if(typeof name !== 'string'){
        throw new Error(`Class name is not a string: ${JSON.stringify(name)}`);
    }

    // Get ALL properties including inherited ones from all parent interfaces
    const allProps = getAllProperties(classObj, allClasses);

    let code = '';
    code += `/**\n * ${classObj.comment || ''}\n */\n`;


    listToImport.push(buildImport('SchemaInterface','../../classes/schema.interface',true));
    listToImport.push(buildImport('SchemaMetadata','../../classes/schema-metadata',true));
    listToImport.push(buildImport(name,`../interfaces/${name}`));

    code += `export class ${name}Schema`;

    const implementClasses:string[] = [];
    implementClasses.push('SchemaInterface')
    implementClasses.push(name)


    code += ` implements ${implementClasses.join(', ')}`;

    code += ` {\n`;

    code += `  public schema_metadata: SchemaMetadata = {\n`;
    code += `    id: '${classObj.id}',\n`;
    code += `    label: '${classObj.name}',\n`;
    code += `    subClassOf: [${(classObj.parent?.map((parent)=> `'${parent["@id"]}'`).join(',')) || ''}],\n`;
    code += `  };\n\n`;

    // Add all properties from the interface (including inherited ones)
    for (const prop of allProps) {
        if(typeof prop.name !== 'string'){
            throw new Error(`Property name is not a string: ${JSON.stringify(prop.name)}`);
        }

        const typeStr = generatePropertyType(prop.type, name, allClasses, listToImport, `../interfaces/`);

        // Use JSDoc format for better IDE support
        code += `  /**\n   * ${prop.comment || 'No description available'}\n   */\n`;
        // Make properties optional (schema.org properties are typically optional)
        code += `  public ${prop.name}?: ${typeStr};\n\n`;
    }

    code += '}\n';

    // Remove duplicates, sort, and filter self-imports
    const uniqueImports = Array.from(new Set(listToImport)).sort();

    if (uniqueImports.length > 0) {
        code = uniqueImports.join('\n') + '\n\n' + code;
    }

    return code;
}
function generateEnumTs(classObj: SchemaClass,allClasses:Record<string, SchemaClass>): string {
    const name = classObj.name;
    const allProps = classObj.properties || [];
    const listToImport:string[] = [];
    if(typeof name !== 'string'){
        throw new Error(`Class name is not a string: ${JSON.stringify(name)}`);
    }
    let code = '';


    // Handle enumerations differently
    if (classObj.isEnumeration) {
        // For enumerations, we could generate a type alias or keep as class
        // Keeping as class for consistency, but marking it clearly
        code += `/** @enumeration */\n`;
    }


    // listToImport.push(buildImport('SchemaInterface','classes/schema.interface',true));
    // listToImport.push(buildImport('SchemaMetadata','classes/schema-metadata',true));

    code += `export enum ${name}`;
    code += ` {\n`;

    if(classObj.enumValues.length === 0){
        //@todo some enums are empty because it's parents for other enums
        // console.log(name)
    }

    for (const enumValue of classObj.enumValues) {
        code += `  ${enumValue.label}= 'https://schema.org/${enumValue.label}',\n`;
    }
    code += `}\n`;
    return code;

}
function generateInterfaceTs(classObj: SchemaClass,allClasses:Record<string, SchemaClass>): string {
    const name = classObj.name;
    const allProps = classObj.properties || [];
    const listToImport:string[] = [];

    if(typeof name !== 'string'){
        throw new Error(`Class name is not a string: ${JSON.stringify(name)}`);
    }

    // Filter out properties that are inherited from parent classes
    const inheritedProp:Set<SchemaProperty> = getInheritedPropertyNames(classObj, allClasses);
    const inheritedPropNames:Set<string> = new Set(Array.from(inheritedProp).map(prop => prop.name));
    const props = allProps.filter(prop => !inheritedPropNames.has(prop.name));

    let code = '';
    code += `/**\n * ${classObj.comment || ''}\n */\n`;

    // Handle enumerations differently
    if (classObj.isEnumeration) {
        // For enumerations, we could generate a type alias or keep as class
        // Keeping as class for consistency, but marking it clearly
        code += `/** @enumeration */\n`;
    }


    // listToImport.push(buildImport('SchemaInterface','classes/schema.interface',true));
    // listToImport.push(buildImport('SchemaMetadata','classes/schema-metadata',true));

    code += `export interface ${name}`;

    if(classObj.parent !== null){
        const parents = classObj.parent;
        const parentClasses:string[] = [];
        for(let parent of parents){
            const parentObj:SchemaClass|undefined = allClasses[parent['@id']];
            if(parentObj !== undefined) {
                // Don't extend Enumeration base class
                if (parentObj.name !== 'Enumeration') {
                    parentClasses.push(parentObj.name)
                    // listToImport.push(buildImport(parentObj.name));
                    listToImport.push(buildImport(parentObj.name,`./${parentObj.name}`));
                }
            }else{
                if(schemaTypeToPrimitive(parent['@id']) === null){
                    console.warn(`Parent class ${parent['@id']} not found for class ${name}`);
                }
            }
        }

        if(parentClasses.length > 0) {
            code += ` extends ${parentClasses.join(', ')}`;
        }


    }

    code += ` {\n`;


    // code += `  public schema_metadata: SchemaMetadata = {\n`;
    // code += `    id: '${classObj.id}',\n`;
    // code += `    label: '${classObj.name}',\n`;
    // code += `    subClassOf: '${classObj.parent?.["@id"]}',\n`;
    // code += `  };\n`;

    for (const prop of props) {
        if(typeof prop.name !== 'string'){
            throw new Error(`Property name is not a string: ${JSON.stringify(prop.name)}`);
        }

        const typeStr = generatePropertyType(prop.type, name, allClasses, listToImport, null);

        // Use JSDoc format for better IDE support
        code += `\n  /**\n   * ${prop.comment || 'No description available'}\n   */\n`;
        // Make properties optional (schema.org properties are typically optional)
        code += `  ${prop.name}?: ${typeStr};\n`;
    }

    code += '}\n';

    // Remove duplicates, sort, and filter self-imports
    const uniqueImports = Array.from(new Set(listToImport)).sort();

    if (uniqueImports.length > 0) {
        code = uniqueImports.join('\n') + '\n\n' + code;
    }

    return code;
}
function schemaTypeToPrimitive(typeId:string):string|null{
    switch (typeId){
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

async function main() {
    const jsonldPath = 'schemaorg-current-https.jsonld';
    const outDir = path.resolve(__dirname, 'out');
    const outDirIface = path.join(outDir, 'interfaces');
    const outDirClasses = path.join(outDir, 'classes');

    // Check if input file exists
    if (!fs.existsSync(jsonldPath)) {
        throw new Error(`Input file not found: ${jsonldPath}`);
    }

    console.log('Reading schema.org JSON-LD file...');
    const raw = await fs.promises.readFile(jsonldPath, { encoding: 'utf8' });
    const data = JSON.parse(raw);
    const graph: (GraphPropertyItem|GraphClassItem|GraphEnumItem)[] = data['@graph'];

    console.log('Parsing properties and classes...');
    const enumValues = parseEnum(graph);
    const propertiesRecord = parseProperties(graph);
    const classes = parseClass(graph, propertiesRecord,enumValues);


    // Create output directory
    await fs.promises.mkdir(outDir, { recursive: true });
    await fs.promises.mkdir(outDirIface, { recursive: true });
    await fs.promises.mkdir(outDirClasses, { recursive: true });

    const classKeys = Object.keys(classes);
    console.log(`Generating ${classKeys.length} TypeScript class files...`);

    // Write files in parallel for better performance
    const writePromises = classKeys.map(async (key) => {
        const classObj = classes[key];
        if (classObj !== undefined) {
            const filePath = path.join(outDirIface, `${classObj.name}.ts`);
            const filePathClass = path.join(outDirClasses, `${classObj.name}.schema.ts`);
            try {
                if(classObj.isEnumeration){
                    if(classObj.enumValues.length > 0) {
                        const enumDef = generateEnumTs(classObj, classes);
                        await fs.promises.writeFile(filePath, enumDef, {encoding: 'utf-8'});
                    }

                }else{
                    const ifaceDef = generateInterfaceTs(classObj, classes);
                    await fs.promises.writeFile(filePath, ifaceDef, { encoding: 'utf-8' });

                    const classDef = generateClasseTs(classObj, classes);
                    await fs.promises.writeFile(filePathClass, classDef, { encoding: 'utf-8' });

                }

            } catch (error: any) {
                console.error(`Error generating class for ${classObj.name}:`, error?.message);
                throw error;
            }
        }
    });

    await Promise.all(writePromises);

    // Generate index file for easy imports
    console.log('Generating index file...');
    const indexContent = generateIndexFile(classes);
    await fs.promises.writeFile(path.join(outDir, 'index.ts'), indexContent, { encoding: 'utf-8' });

    console.log(`✓ Done: ${classKeys.length} TypeScript class files generated in ./out`);
    console.log(`✓ Index file created for easy imports`);
}

/**
 * Generate an index.ts file that exports all classes
 */
function generateIndexFile(classes: Record<string, SchemaClass>): string {
    const classNames = Object.values(classes)
        .map(c => c.name)
        .filter(name => typeof name === 'string')
        .sort();

    let content = '/**\n';
    content += ' * Auto-generated index file for schema.org classes\n';
    content += ' * This file exports all generated schema.org TypeScript classes\n';
    content += ' */\n\n';
    //
    // for (const className of classNames) {
    //     content += `export type { ${className} } from './interfaces/${className}';\n`;
    // }

    content += '\n\n/**\n';
    content += ' * Interfaces\n';
    content += ' */\n';
    for(const schemaClass of Object.values(classes)){
        if(!schemaClass.isEnumeration){
            content += `export type { ${schemaClass.name} } from './interfaces/${schemaClass.name}';\n`;
        }
    }
    content += '\n\n/**\n';
    content += ' * Schema classes\n';
    content += ' */\n';
    for(const schemaClass of Object.values(classes)){
        if(!schemaClass.isEnumeration){
            content += `export { ${schemaClass.name}Schema } from './classes/${schemaClass.name}.schema';\n`;
        }
    }
    content += '\n\n/**\n';
    content += ' * Enums\n';
    content += ' */\n';
    for(const schemaClass of Object.values(classes)){
        if(schemaClass.isEnumeration && schemaClass.enumValues.length > 0){
            content += `export { ${schemaClass.name} } from './interfaces/${schemaClass.name}';\n`;
        }
    }

    return content;
}

main().catch(console.error);
