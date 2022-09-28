const express = require('express')
const path = require('path')
const bodyParser = require('body-parser');

const PORT = process.env.PORT || 5000

const { Pool } = require('pg');
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: {rejectUnauthorized: false}
});

express()
  .use(bodyParser.json())
  .get('/', async (req, res) => {
    // Display all the database content in web page
    try {
      const client = await pool.connect();

      // Get all data from the database
      const result = await client.query('SELECT id, sensor, location, temperature, humidity, pressure, altitude, timestamp FROM readings');
      const results = result.rows;
      
      // Make the web page using the data
      var readings =``;
      results.forEach(elm => {
        readings +=  `
        <tr>
          <td>${elm.id}</td>
          <td>${elm.sensor}</td>
          <td>${elm.location}</td>
          <td>${elm.temperature}</td>
          <td>${elm.humidity}</td>
          <td>${elm.pressure}</td>
	  <td>${elm.altitude}</td>
          <td>${elm.timestamp}</td>
        </tr>`
      });

      var content = `
      <!DOCTYPE html>
      <html>
        <head>
        </head>
      <body>
        <div class="container">
          <h2>Database Results</h2>
          <table cellspacing="5" cellpadding="5">
            <tr>
              <th>ID</th>
              <th>Sensor</th>
              <th>Location</th>
              <th>Temperature (°C)</th>
              <th>Humidity (%)</th>
              <th>Pressure (Pa)</th>
	      <th>Altitude (m)</th>
              <th>Timestamp</th>
            </tr>
            ${readings}
          </table>
        </div>
      </body>
      </html>
      `;

      res.send(content);
      client.release();
    } catch (err) {
      console.error(err);
      res.status(500).send("Error " + err);
      client.release();
    }
  })
  .post('/dbpost', async (req, res) => {
    // Receive incoming requests from the ESP32 and insert the data into a PostgreSQL database
    try {
      const client = await pool.connect();

      var sensor = req.body.sensor;
      var location = req.body.location;
      var temperature = req.body.temperature;
      var humidity = req.body.humidity;
      var pressure = req.body.pressure;
      var altitude = req.body.altitude;
      
      var timestamp = await client.query("SELECT (CURRENT_TIMESTAMP(0) AT TIME ZONE 'CXT')::text;");
      var ts = timestamp.rows[0].timezone;

      client.query(`INSERT INTO readings (sensor,location,temperature,humidity,pressure,altitude,timestamp) VALUES ('${sensor}', '${location}', '${temperature}', '${humidity}', '${pressure}', '${altitude}', '${ts}');`
      , (err, res) => {
        try {
          if (err) throw err;
        } catch {
          console.error("Can't insert the data to database");
        }
      });
      res.sendStatus(200);
      client.release();
    } catch (err) {
      console.error(err);
      res.status(500).send("Error " + err);
      client.release();
    }
  })
  .listen(PORT, () => console.log(`Listening on ${ PORT }`));