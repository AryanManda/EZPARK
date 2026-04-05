const request = require("supertest");
const app = require("./backend/server");

describe("Parking API", () => {

  test("Valid parking search", async () => {
    const res = await request(app).get("/api/parking?location=Downtown");
    expect(res.statusCode).toBe(200);
  });

  test("Invalid location", async () => {
    const res = await request(app).get("/api/parking");
    expect(res.statusCode).toBe(400);
  });

  test("Register parking lot success", async () => {
    const res = await request(app)
      .post("/api/register")
      .send({ name: "Lot X", location: "City", price: 5 });

    expect(res.statusCode).toBe(200);
  });

  test("Register parking invalid data", async () => {
    const res = await request(app)
      .post("/api/register")
      .send({ name: "" });

    expect(res.statusCode).toBe(400);
  });

});