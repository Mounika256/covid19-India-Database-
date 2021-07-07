const express = require("express");
const path = require("path");
const { open } = require("sqlite");
const sqlite3 = require("sqlite3");

const dbPath = path.join(__dirname, "covid19India.db");

const app = express();
app.use(express.json());

let db = null;
const initializeDbAndServer = async () => {
  try {
    db = await open({
      filename: dbPath,
      driver: sqlite3.Database,
    });
    app.listen(3000, () =>
      console.log("Server is running at http://localhost:3000/")
    );
  } catch (e) {
    console.log("DB Error: ${e.message}");
    process.exit(1);
  }
};
initializeDbAndServer();

const convertStatesDbToResponseObj = (dbObject) => {
  return {
    stateId: dbObject.state_id,
    stateName: dbObject.state_name,
    population: dbObject.population,
  };
};

const convertDistrictsDbToResponseObj = (dbObject) => {
  return {
    districtId: dbObject.district_id,
    districtName: dbObject.district_name,
    stateId: dbObject.state_id,
    cases: dbObject.cases,
    cured: dbObject.cured,
    active: dbObject.active,
    deaths: dbObject.deaths,
  };
};

//Get all states in state table
app.get("/states/", async (request, response) => {
  const dbStatesQuery = `SELECT * FROM state;`;
  const responseStates = await db.all(dbStatesQuery);
  response.send(
    responseStates.map((eachQuery) => convertStatesDbToResponseObj(eachQuery))
  );
});

//Get State in state table
app.get("/states/:stateId/", async (request, response) => {
  const { stateId } = request.params;
  const dbStateQuery = `SELECT * FROM state WHERE state_id = ${stateId};`;
  const responseStateDb = await db.get(dbStateQuery);
  response.send(convertStatesDbToResponseObj(responseStateDb));
});

//Create District in district table
app.post("/districts/", async (request, response) => {
  const { stateId, districtName, cases, cured, active, deaths } = request.body;
  const createDistrictQuery = `INSERT INTO district (district_name, state_id, cases,cured,active,deaths)
                                    VALUES (${districtName},${stateId}, ${cases},${cured},${active},${deaths})`;
  await db.run(createDistrictQuery);
  response.send("District Successfully Added");
});

//Get district in district table
app.get("/districts/:districtId/", async (request, response) => {
  const { districtId } = request.params;
  const getDistrictQuery = `SELECT * FROM district WHERE district_id = ${districtId};`;
  const responseDistrictDb = await db.get(getDistrictQuery);
  response.send(convertDistrictsDbToResponseObj(responseDistrictDb));
});

//Delete district in district table
app.delete("/districts/:districtId/", async (request, response) => {
  const { districtId } = request.params;
  const deleteDistrictQuery = `DELETE FROM district WHERE district_id = ${districtId};`;
  await db.run(deleteDistrictQuery);
  response.send("District Removed");
});

//Update District in district table
app.put("/districts/:districtId/", async (request, response) => {
  const { districtId } = request.params;
  const { districtName, stateId, cases, cured, active, deaths } = request.body;
  const updateDistrictQuery = `UPDATE district SET 
                                    district_name = ${districtName},
                                    state_id = ${stateId},
                                    cases = ${cases},
                                    cured = ${cured},
                                    active = ${active},
                                    deaths = ${deaths}
                                    WHERE district_id = ${districtId};`;
  await db.run(updateDistrictQuery);
  response.send("District Details Updated");
});

app.get("/states/:stateId/stats/", async (request, response) => {
  const { stateId } = request.params;
  const getStateStatusQuery = `
    SELECT
      SUM(cases),
      SUM(cured),
      SUM(active),
      SUM(deaths)
    FROM
      district
    WHERE
      state_id=${stateId};`;
  const responseDbStatus = await db.get(getStateStatusQuery);
  response.send({
    totalCases: responseDbStatus["SUM(cases)"],
    totalCured: responseDbStatus["SUM(cured)"],
    totalActive: responseDbStatus["SUM(active)"],
    totalDeaths: responseDbStatus["SUM(deaths)"],
  });
});

app.get("/districts/:districtId/details/", async (request, response) => {
  const { districtId } = request.params;
  const stateNameQuery = `
    SELECT
      state_name
    FROM
      district
    NATURAL JOIN
      state
    WHERE 
      district_id=${districtId};`;
  const state = await db.get(stateNameQuery);
  response.send({ stateName: state.state_name });
});

module.exports = app;
