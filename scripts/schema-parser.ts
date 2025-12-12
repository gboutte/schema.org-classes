import type {GraphClassItem} from "./types/graph-class-item";
import type {GraphPropertyItem} from "./types/graph-property-item";
import type {GraphEnumItem} from "./types/graph-enum-item";
import type {SchemaEnum} from "./types/schema-enum";
import type {SchemaProperty} from "./types/schema-property";
import fs from "node:fs";
import type {SchemaClass} from "./types/schema-class";
import type {GraphReference} from "./types/graph-reference";
import type {ParsedJsonSchema} from "./types/parsed-json-schema";
import type {RdfsLabel} from "./types/rdfs-label";

export class SchemaParser{

    async parse(file: string):Promise<ParsedJsonSchema> {
        if (!fs.existsSync(file)) {
            throw new Error(`Input file not found: ${file}`);
        }

        console.log('Reading schema.org JSON-LD file...');
        const raw = await fs.promises.readFile(file, {encoding: 'utf8'});
        const data = JSON.parse(raw);
        const graph: (GraphPropertyItem | GraphClassItem | GraphEnumItem)[] = data['@graph'];


        console.log('Parsing properties and classes...');
        const enumValues = this.parseEnums(graph);
        const propertiesRecord = this.parseProperties(graph);
        const classes = this.parseClasses(graph, propertiesRecord,enumValues);

        return {
            enums: enumValues,
            properties: propertiesRecord,
            classes: classes,
        }

    }
    parseClasses(
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

            const name = this.extractName(graphSchemaClass["rdfs:label"], graphSchemaClass['@id']);
            const isEnum = this.isEnumeration(graphSchemaClass,classes);

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


    parseEnums(graphItems:(GraphClassItem|GraphPropertyItem|GraphEnumItem)[]):Record<string, SchemaEnum[]>{
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
                label: this.extractName(oneEnum["rdfs:label"], classId),
                comment: oneEnum['rdfs:comment'] || '',
            })
        }

        return classEnumsMap
    }

    /**
     * Primitive type mappings from schema.org to TypeScript
     */
    parseProperties(graphItems:(GraphClassItem|GraphPropertyItem|GraphEnumItem)[]):Record<string, SchemaProperty[]>{
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

                const name = this.extractName(prop["rdfs:label"], prop['@id']);

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


    /**
     * Check if a class is an enumeration
     */
    private isEnumeration(graphClass: GraphClassItem, allClasses: GraphClassItem[]): boolean {
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
        const isParentEnum = parentsClassesItems.some(parent => this.isEnumeration(parent,allClasses));


        return isClass && (isEnum || isParentEnum);
    }
    /**
     * Extract name from rdfs:label or fallback to @id
     */
    private extractName(label: RdfsLabel | undefined, id: string): string {
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
        return this.sanitizeClassName(name);
    }


    /**
     * Sanitize a class name to be a valid TypeScript identifier
     * Prefixes names that start with a number with an underscore
     */
    private sanitizeClassName(name: string): string {
        // Check if the name starts with a digit
        if (/^[0-9]/.test(name)) {
            return '_' + name;
        }
        return name;
    }

}