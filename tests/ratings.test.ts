import { describe, expect, test } from '@jest/globals';
import {
  AggregateOfferSchema,
  AggregateRatingSchema,
  ItemAvailability,
  OfferSchema,
  WebApplicationSchema,
} from '../out';
import { StructuredDataService } from '../services/structured-data.services';
/* eslint-disable @typescript-eslint/no-explicit-any */
describe('Event schema', () => {
  const service: StructuredDataService = new StructuredDataService();

  test('Aggregate rating', () => {
    const schema: WebApplicationSchema = new WebApplicationSchema();
    schema.name = 'Application name';
    schema.url = 'https://example.com';
    schema.description = 'Application description';
    schema.image = 'https://example.com/image.jpg';
    schema.applicationCategory = 'BusinessApplication';

    const aggregateRating: AggregateRatingSchema = new AggregateRatingSchema();
    aggregateRating.ratingValue = 4.5;
    aggregateRating.reviewCount = 10;
    aggregateRating.bestRating = 5;
    aggregateRating.worstRating = 1;
    schema.aggregateRating = aggregateRating;

    const jsonString: string = service.getStructuredDataJsonString(schema);

    const jsonData: any = service.getStructuredData(schema);
    const jsonStringified: string = JSON.stringify(jsonData);

    expect(jsonStringified).toEqual(jsonString);

    const jsonParsed: any = JSON.parse(jsonString);

    const expectedObject: any = {
      '@context': 'https://schema.org',
      '@type': 'WebApplication',
      description: 'Application description',
      aggregateRating: {
        '@type': 'AggregateRating',
        ratingValue: 4.5,
        reviewCount: 10,
        bestRating: 5,
        worstRating: 1,
      },
      applicationCategory: 'BusinessApplication',
      image: 'https://example.com/image.jpg',
      name: 'Application name',
      url: 'https://example.com',
    };

    expect(jsonParsed).toEqual(expectedObject);
  });

  test('Aggregate rating  offers', () => {
    const schema: WebApplicationSchema = new WebApplicationSchema();
    schema.name = 'Application name';
    schema.url = 'https://example.com';
    schema.description = 'Application description';
    schema.image = 'https://example.com/image.jpg';
    schema.applicationCategory = 'BusinessApplication';

    const aggregateRating: AggregateRatingSchema = new AggregateRatingSchema();
    aggregateRating.ratingValue = 4.5;
    aggregateRating.reviewCount = 10;
    aggregateRating.bestRating = 5;
    aggregateRating.worstRating = 1;
    schema.aggregateRating = aggregateRating;

    const offers: OfferSchema[] = [];

    const offer: OfferSchema = new OfferSchema();
    offer.price = 100;
    offer.priceCurrency = 'EUR';
    offer.validFrom = new Date('2025-12-01T11:50:00.000Z');
    offer.url = 'http://google.fr';
    offer.availability = ItemAvailability.InStock;
    offers.push(offer);

    schema.offers = offers;

    const jsonString: string = service.getStructuredDataJsonString(schema);
    const jsonData: any = service.getStructuredData(schema);
    const jsonStringified: string = JSON.stringify(jsonData);

    expect(jsonStringified).toEqual(jsonString);

    const jsonParsed: any = JSON.parse(jsonString);

    const expectedObject: any = {
      '@context': 'https://schema.org',
      '@type': 'WebApplication',
      description: 'Application description',
      aggregateRating: {
        '@type': 'AggregateRating',
        ratingValue: 4.5,
        reviewCount: 10,
        bestRating: 5,
        worstRating: 1,
      },
      applicationCategory: 'BusinessApplication',
      image: 'https://example.com/image.jpg',
      name: 'Application name',
      url: 'https://example.com',
      offers: [
        {
          '@type': 'Offer',
          price: 100,
          priceCurrency: 'EUR',
          validFrom: '2025-12-01T11:50:00.000Z',
          url: 'http://google.fr',
          availability: 'https://schema.org/InStock',
        },
      ],
    };

    expect(jsonParsed).toEqual(expectedObject);
  });

  test('Aggregate rating + Aggregate offers', () => {
    const schema: WebApplicationSchema = new WebApplicationSchema();
    schema.name = 'Application name';
    schema.url = 'https://example.com';
    schema.description = 'Application description';
    schema.image = 'https://example.com/image.jpg';
    schema.applicationCategory = 'BusinessApplication';

    const aggregateRating: AggregateRatingSchema = new AggregateRatingSchema();
    aggregateRating.ratingValue = 4.5;
    aggregateRating.reviewCount = 10;
    aggregateRating.bestRating = 5;
    aggregateRating.worstRating = 1;
    schema.aggregateRating = aggregateRating;

    const offer: AggregateOfferSchema = new AggregateOfferSchema();
    offer.priceCurrency = 'EUR';
    offer.highPrice = 50.1;
    offer.lowPrice = 10.1;

    schema.offers = offer;

    const jsonString: string = service.getStructuredDataJsonString(schema);
    const jsonData: any = service.getStructuredData(schema);
    const jsonStringified: any = JSON.stringify(jsonData);

    expect(jsonStringified).toEqual(jsonString);

    const jsonParsed: any = JSON.parse(jsonString);

    const expectedObject: any = {
      '@context': 'https://schema.org',
      '@type': 'WebApplication',
      description: 'Application description',
      aggregateRating: {
        '@type': 'AggregateRating',
        ratingValue: 4.5,
        reviewCount: 10,
        bestRating: 5,
        worstRating: 1,
      },
      applicationCategory: 'BusinessApplication',
      image: 'https://example.com/image.jpg',
      name: 'Application name',
      url: 'https://example.com',
      offers: {
        '@type': 'AggregateOffer',
        priceCurrency: 'EUR',
        highPrice: 50.1,
        lowPrice: 10.1,
      },
    };

    expect(jsonParsed).toEqual(expectedObject);
  });
});
