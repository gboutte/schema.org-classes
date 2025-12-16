# schema.org-classes

This project generates TypeScript classes from the schema.org JSON-LD file.

I did not use Google [schema-dts library](https://github.com/google/schema-dts) because I wanted to remove some parts that we needed to fill, like the type of `@context`, that I could auto-fill with the class used.

This project create 3 types of files: 
- enums: lists of values for some properties
- interfaces: the definitions of the properties needed by the schemas, some schemas have multiples parent, so it needed to be interfaces
- classes: the final classes that extends the interfaces and add some metadata used to generate the json ld. Theses classes are what should be used to generate the json ld.


## Usage

All the schema have a class that can be used, for example `Event` have a class called `EventSchema`.

```typescript
const service: StructuredDataService = new StructuredDataService();
const schema: EventSchema = new EventSchema();

schema.name = 'Event Name';
schema.performer = new PersonSchema();
schema.performer.name = 'Performer Name';
schema.description = 'Event Description';
schema.image = 'https://example.com/image.jpg';
schema.eventStatus = EventStatusType.EventScheduled;
schema.startDate = new Date('2025-12-01T11:00:00.000Z');

const jsonString: string = service.getStructuredDataJsonString(schema);

```

## Development

Generate all files:
```bash
npm run start
```