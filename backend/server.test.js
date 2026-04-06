// server.test.js
const request = require('supertest');
const app = require('./server');

// OWNER TESTS

test('TC1: valid lot is saved', async () => {
  const res = await request(app)
    .post('/lots')
    .send({
      name: 'City Center Lot',
      address: '123 Main St Downtown',
      carType: 'Sedan',
      rate: 5,
      spots: 20,
    });

  expect(res.status).toBe(201);
  expect(res.body).toHaveProperty('id');
  expect(res.body.name).toBe('City Center Lot');
});

test('TC2: missing lot name returns error', async () => {
  const res = await request(app)
    .post('/lots')
    .send({
      name: '',
      address: '123 Main St',
      carType: 'Sedan',
      rate: 5,
      spots: 20,
    });

  expect(res.status).toBe(400);
  expect(res.body.errors).toContain('Lot name is required');
});

test('TC3: negative hourly rate returns error', async () => {
  const res = await request(app)
    .post('/lots')
    .send({
      name: 'Bad Rate Lot',
      address: '123 Main St',
      carType: 'Sedan',
      rate: -1,
      spots: 10,
    });

  expect(res.status).toBe(400);
  expect(res.body.errors).toContain('Hourly rate must be positive');
});

test('TC4: zero spots returns error', async () => {
  const res = await request(app)
    .post('/lots')
    .send({
      name: 'Zero Spots',
      address: '123 Main St',
      carType: 'Sedan',
      rate: 3,
      spots: 0,
    });

  expect(res.status).toBe(400);
  expect(res.body.errors).toContain('Spots must be at least 1');
});

test('TC5: invalid car type returns error', async () => {
  const res = await request(app)
    .post('/lots')
    .send({
      name: 'Weird Lot',
      address: '123 Main St',
      carType: 'Spaceship',
      rate: 3,
      spots: 5,
    });

  expect(res.status).toBe(400);
  expect(res.body.errors).toContain('Invalid car type');
});

// DRIVER TESTS

test('TC7: find lot by location and car type', async () => {
  const res = await request(app)
    .get('/lots/search')
    .query({ location: 'Downtown', carType: 'Sedan' });

  expect(res.status).toBe(200);
  expect(res.body.results.length).toBeGreaterThan(0);
});

test('TC8: unsupported car type returns empty list with message', async () => {
  const res = await request(app)
    .get('/lots/search')
    .query({ location: 'Downtown', carType: 'Truck' });

  expect(res.status).toBe(200);
  expect(res.body.results.length).toBe(0);
  expect(res.body.message).toBe('No parking lots found');
});

test('TC9: empty location returns validation error', async () => {
  const res = await request(app)
    .get('/lots/search')
    .query({ location: '', carType: 'Sedan' });

  expect(res.status).toBe(400);
  expect(res.body.error).toBe('Location is required');
});

test('TC10: empty car type returns validation error', async () => {
  const res = await request(app)
    .get('/lots/search')
    .query({ location: 'Downtown', carType: '' });

  expect(res.status).toBe(400);
  expect(res.body.error).toBe('Car type is required');
});

test('TC11: location with no lots returns empty results', async () => {
  const res = await request(app)
    .get('/lots/search')
    .query({ location: 'NowhereTown', carType: 'Sedan' });

  expect(res.status).toBe(200);
  expect(res.body.results.length).toBe(0);
  expect(res.body.message).toBe('No parking lots found');
});