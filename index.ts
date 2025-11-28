import * as path from "node:path";
import * as fs from "node:fs";


type SchemaProperty = {
    name: string;
    id: string;
    comment: string;
    type: GraphReference[]|string;
};

type SchemaClass = {
    name: string;
    id: string;
    comment: string;
    parent: GraphReference|null;
    properties: SchemaProperty[];
}


type GraphClassItem = {
    "@id": string;
    "@type": string;
    "rdfs:label"?: string;
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
    "@type": string;
    "rdfs:label"?: string;
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


type GraphReference = {
    "@id": string;
}

function parseClass(graphItems:(GraphClassItem|GraphPropertyItem)[],properties:Record<string, SchemaProperty[]> ){
    const classes:GraphClassItem[] = graphItems.filter(el => el['@type'] === 'rdfs:Class');



    const classIdMap: Record<string, SchemaClass> = {};
    for (const graphSchemaClass of classes) {
        let parent:GraphReference|null = null;
        if(graphSchemaClass['rdfs:subClassOf'] !== undefined){

            if(Array.isArray(graphSchemaClass['rdfs:subClassOf'])){
                // @ts-ignore
                parent = graphSchemaClass['rdfs:subClassOf'][0];

                //@todo gerer les cas multiple
                // exemple https://schema.org/LocalBusiness
                // Faire des sous dossier ?
            }else{
                parent = graphSchemaClass['rdfs:subClassOf'];
            }
        }

        classIdMap[graphSchemaClass['@id']] ={
            name: graphSchemaClass["rdfs:label"] || graphSchemaClass['@id'] || '',
            id: graphSchemaClass['@id'] || '',
            comment: graphSchemaClass['rdfs:comment'] || '',
            parent: parent,
            properties: properties[graphSchemaClass['@id']] || [],

        }

    }

    return classIdMap
}

/**
 * Primitive type:
 * schema:Text -> string
 * schema:Number -> number
 * schema:Boolean -> boolean
 * schema:Date -> Date
 * schema:DateTime -> Date
 * schema:Time -> string
 * schema:URL -> string
 * schema:Enumeration -> enum a voir comment les gerer
 *
 * a faire lister les type dans le json (class / preperty / enum), voir si il y en a d'autre
 */


function parseProperties(graphItems:(GraphClassItem|GraphPropertyItem)[]):Record<string, SchemaProperty[]>{

    const properties:GraphPropertyItem[] = graphItems.filter(el => el['@type'] === 'rdf:Property');


    const classPropsMap: Record<string, SchemaProperty[]> = {};

    for (const prop of properties) {
        const domain = prop['schema:domainIncludes'];
        if (!domain) continue;
        const domains = Array.isArray(domain) ? domain : [domain];
        for (const domain of domains) {
            if (!domain['@id']) continue;
            const classId = domain['@id'];
            if (!classPropsMap[classId]) classPropsMap[classId] = [];
            classPropsMap[classId].push({
                name: prop['rdfs:label'] || prop['@id'] || '',
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


function buildImport(className:string):string{
    return `import { ${className} } from './${className}';`;
}

function generateClassTs(classObj: SchemaClass,allClasses:Record<string, SchemaClass>): string {
    const name = classObj.name;
    const props = classObj.properties || [];
    const listToImport:string[] = [];


    if(typeof name !== 'string'){
        throw new Error(`Class name is not a string: ${JSON.stringify(name)}`);
    }
    let code = '';
    code += `/**\n${classObj.comment || ''}\n*/\n`;
    code += `export class ${name}`
    if(
        classObj.parent !== null
    ){
        const parent:SchemaClass|undefined = allClasses[classObj.parent['@id']];

        if(parent !== undefined) {
            code += ` extends ${parent.name}`;
            listToImport.push(buildImport(parent.name));
        }else{
            if(schemaTypeToPrimitive(classObj.parent['@id']) === null){
            console.warn(`Parent class ${classObj.parent['@id']} not found for class ${name}`);
            }
        }
    }
    code += `{\n`;
    for (const prop of props) {
        let typeStr = '';
        if(Array.isArray(prop.type)){

            typeStr = prop.type.map(ref => {

                const primitive = schemaTypeToPrimitive(ref['@id']);
                if(primitive !== null){
                    return primitive;
                }else {
                    const className = allClasses[ref['@id']]?.name;
                    if (className === undefined) {
                        console.error('Type not found for reference (prop : ' + prop.name + '):', ref);

                    }else {
                        if(name !== className) {
                            listToImport.push(buildImport(className));
                        }
                    }
                    return className;
                }
            }).filter((typeStr) => typeStr !== undefined).join(' | ');
            //@todo avant de join voir pour eviter les doublons ex dans Place: keywords
            // Peut etre que le type primitif n'est pas bon
            // check le additionalType dans Thing, peut etre pas un primitif mais un Class, genre il faudrai créer une class parent ? a tout ?



            if(typeStr === ''){
                console.warn(`Type empty for property ${prop.name} in class ${name}`);
            }

        }else{
            typeStr = prop.type;
        }
        if(typeof prop.name !== 'string'){
            throw new Error(`Property name is not a string: ${JSON.stringify(prop.name)}`);
        }

        code += `\n\n  /** ${prop.comment} */\n`;
        code += `  public ${prop.name}!: ${typeStr};\n`;
    }
    code += '}\n';

    // Remove duplicates and self-imports
    const uniqueImports = Array.from(new Set(listToImport));

    code = uniqueImports.join('\n') + '\n\n' + code;

    return code;
}
function schemaTypeToPrimitive(typeId:string):string|null{
    switch (typeId){
        case 'schema:Text':
            return 'string';
        case 'schema:Number':
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
        default:
            return null; // Return as is for non-primitive types
    }
}

async function main() {
    const jsonldPath = 'schemaorg-current-https.jsonld';
    const outDir = path.resolve(__dirname, 'out');
    const raw = fs.readFileSync(jsonldPath, { encoding: 'utf8', flag: 'r' });
    const data = JSON.parse(raw);
    const graph: (GraphPropertyItem|GraphClassItem)[] = data['@graph'];

    const propertiesRecord = parseProperties(graph);
    const classes = parseClass(graph,propertiesRecord);


    // Write files
    fs.mkdirSync(outDir, { recursive: true });
    const classKeys = Object.keys(classes);
    for (const key of classKeys) {
        const classObj:SchemaClass|undefined = classes[key];
        if(classObj !== undefined) {
            const filePath = path.join(outDir, `${classObj.name}.ts`);
            try{
                const classDef = generateClassTs(classObj, classes);
                fs.writeFileSync(filePath, classDef, {encoding: 'utf-8'});
            }catch (error:any){
                console.error(`Error generating class for ${classObj.name}:`, error?.message);
            }
        }
    }
    console.log(`Done: ${classes.length} TypeScript class files generated in ./out`);
}

main().catch(console.error);
