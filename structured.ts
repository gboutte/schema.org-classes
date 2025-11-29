import {StructuredDataService} from "./services/structured-data.services";
import {EventSchema} from "./out/classes/Event.schema";
import {PersonSchema} from "./out/classes/Person.schema";
import {OfferSchema} from "./out/classes/Offer.schema";
import {PostalAddressSchema} from "./out/classes/PostalAddress.schema";
import {EventAttendanceModeEnumeration} from "./out/interfaces/EventAttendanceModeEnumeration";
import {PlaceSchema} from "./out/classes/Place.schema";
import {ItemAvailability} from "./out/interfaces/ItemAvailability";

const service = new StructuredDataService();





const schema :EventSchema = new EventSchema();

schema.name = 'Event Name';
schema.performer = new PersonSchema();
schema.performer.name = 'Performer Name';
schema.description = 'Event Description';
schema.image ='https://example.com/image.jpg';
schema.eventStatus = 'Scheduled';
schema.startDate = new Date();

const offer = new OfferSchema();
offer.price = 100;
offer.priceCurrency = "EUR";
offer.validFrom = new Date();
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




console.log(service.buildStructuredData(schema));

