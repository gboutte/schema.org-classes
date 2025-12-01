import {describe, expect, test} from '@jest/globals';
import {StructuredDataService} from "../services/structured-data.services";
import {
    EventAttendanceModeEnumeration,
    EventSchema,
    EventStatusType,
    ItemAvailability,
    OfferSchema,
    PersonSchema,
    PlaceSchema,
    PostalAddressSchema
} from "../out";

describe('Event schema', () => {

    const service = new StructuredDataService();

    test('Basic', () => {
        const schema :EventSchema = new EventSchema();

        schema.name = 'Event Name';
        schema.performer = new PersonSchema();
        schema.performer.name = 'Performer Name';
        schema.description = 'Event Description';
        schema.image ='https://example.com/image.jpg';
        schema.eventStatus = EventStatusType.EventScheduled;
        schema.startDate = new Date("2025-12-01T11:00:00.000Z");

        const jsonString:string = service.getStructuredDataJsonString(schema)
        const jsonData:any = service.getStructuredData(schema)

        const jsonStringified = JSON.stringify(jsonData)

        expect(jsonStringified).toEqual(jsonString)

        expect(jsonData).toEqual(
            expect.objectContaining({
                '@context': expect.any(String),
                'name': expect.any(String),
                'description': expect.any(String),
                'image': expect.any(String),
                'eventStatus': expect.any(String),
                'startDate': expect.any(Date),
            })
        );

        const jsonParsed = JSON.parse(jsonString)
        const expectedObject = {
            '@context': 'https://schema.org',
            '@type': 'Event',
            'description': 'Event Description',
            'eventStatus': 'https://schema.org/EventScheduled',
            'image': 'https://example.com/image.jpg',
            'name': 'Event Name',
            'performer': {
                'name': 'Performer Name',
                '@type': 'Person'
            },
            'startDate': '2025-12-01T11:00:00.000Z'
        }

        expect(jsonParsed).toEqual(expectedObject)



        const expectedJsonString = `{"@context":"https://schema.org","@type":"Event","description":"Event Description","eventStatus":"https://schema.org/EventScheduled","image":"https://example.com/image.jpg","name":"Event Name","performer":{"name":"Performer Name","@type":"Person"},"startDate":"2025-12-01T11:00:00.000Z"}`;


        expect(jsonString).toEqual(expectedJsonString)
    })


    test('Full options', () => {



        const schema :EventSchema = new EventSchema();

        schema.name = 'Event Name';
        schema.performer = new PersonSchema();
        schema.performer.name = 'Performer Name';
        schema.description = 'Event Description';
        schema.image ='https://example.com/image.jpg';
        schema.eventStatus = EventStatusType.EventScheduled;
        schema.startDate = new Date("2025-12-01T20:00:00.000Z");

        const offer = new OfferSchema();
        offer.price = 100;
        offer.priceCurrency = "EUR";
        offer.validFrom = new Date("2025-12-01T11:50:00.000Z");
        offer.url = 'http://google.fr';
        offer.availability = ItemAvailability.InStock;

        schema.offers = [offer];

        const location = new PlaceSchema();
        location.name = 'Offline Event';
        location.address = new PostalAddressSchema();
        location.address.streetAddress = '123 Main St';
        location.address.addressLocality = 'Springfield';
        location.address.addressRegion = 'IL';
        location.address.postalCode = '62701';
        location.address.addressCountry = 'US';

        schema.location = location;

        schema.eventAttendanceMode = EventAttendanceModeEnumeration.OfflineEventAttendanceMode;


        const jsonString:string = service.getStructuredDataJsonString(schema)
        const jsonData:any = service.getStructuredData(schema)
        const jsonParsed = JSON.parse(jsonString)
        const jsonStringified = JSON.stringify(jsonData)

        expect(jsonStringified).toEqual(jsonString)

        console.log(jsonString)

        const expectedObject = {
            '@context': 'https://schema.org',
            '@type': 'Event',
            'description': 'Event Description',
            'eventAttendanceMode': 'https://schema.org/OfflineEventAttendanceMode',
            'eventStatus': 'https://schema.org/EventScheduled',
            'image': 'https://example.com/image.jpg',
            'location': {
                '@type': 'Place',
                'name': 'Offline Event',
                'address': {
                    '@type': 'PostalAddress',
                    'streetAddress': '123 Main St',
                    'addressLocality': 'Springfield',
                    'addressRegion': 'IL',
                    'postalCode': '62701',
                    'addressCountry': 'US'
                }
            },
            'offers': [
                {
                    '@type': 'Offer',
                    'price': 100,
                    'priceCurrency': 'EUR',
                    'validFrom': '2025-12-01T11:50:00.000Z',
                    'url': 'http://google.fr',
                    'availability': 'https://schema.org/InStock'
                }
            ],
            'name': 'Event Name',
            'performer': {
                'name': 'Performer Name',
                '@type': 'Person'
            },
            'startDate': '2025-12-01T20:00:00.000Z'
        }

        expect(jsonParsed).toEqual(expectedObject)

        const expectedJsonString = `{"@context":"https://schema.org","@type":"Event","description":"Event Description","eventAttendanceMode":"https://schema.org/OfflineEventAttendanceMode","eventStatus":"https://schema.org/EventScheduled","image":"https://example.com/image.jpg","location":{"name":"Offline Event","address":{"streetAddress":"123 Main St","addressLocality":"Springfield","addressRegion":"IL","postalCode":"62701","addressCountry":"US","@type":"PostalAddress"},"@type":"Place"},"name":"Event Name","offers":[{"price":100,"priceCurrency":"EUR","validFrom":"2025-12-01T11:50:00.000Z","url":"http://google.fr","availability":"https://schema.org/InStock","@type":"Offer"}],"performer":{"name":"Performer Name","@type":"Person"},"startDate":"2025-12-01T20:00:00.000Z"}`;

        expect(jsonString).toEqual(expectedJsonString)


    });
});
