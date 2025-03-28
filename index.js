const express = require('express');
const bodyParser = require('body-parser');
const mustacheExpress = require('mustache-express');
const { parse } = require('pg-connection-string');
const { Client } = require('pg');

const app = express();
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));
app.engine('html', mustacheExpress());
app.set('view engine', 'html');
app.set('views', __dirname + '/views');

let client = null;
let dbReady = false;

const PORT = process.env.PORT || 8080;

const run = async () => {
  try {
    if (process.env.DATABASE_URL) {
      const config = parse(process.env.DATABASE_URL);
      if (config.host.includes('amazonaws.com')) {
        config.ssl = { rejectUnauthorized: false };
      }

      client = new Client(config);
      await client.connect();
      dbReady = true;
      console.log('Database connected successfully');
    } else {
      console.warn('DATABASE_URL not set. Running without database.');
    }

    app.listen(PORT, () => {
      console.log(Server started on port ${PORT});
    });
  } catch (err) {
    console.error('Startup failed:', err);
    process.exit(1);
  }
};

// Health check
app.get('/healthz', (req, res) => res.status(200).send('OK'));

// Home
app.get('/', async (req, res) => {
  if (!dbReady) {
    return res.status(503).send('Database not configured.');
  }

  try {
    const result = await client.query('SELECT DESCRIPTION FROM TASKS');
    res.render('main', { tasks: result.rows });
    console.log(Displaying ${result.rows.length} tasks.);
  } catch (e) {
    console.error(e);
    res.status(500).send('Error fetching tasks');
  }
});

// Add task
app.post('/task', async (req, res) => {
  if (!dbReady) {
    return res.status(503).send('Database not configured.');
  }

  const taskDescription = req.body.task;
  try {
    await client.query('INSERT INTO tasks (DESCRIPTION) VALUES ($1)', [taskDescription]);
    console.log(Added task "${taskDescription}");
    res.redirect('/');
  } catch (e) {
    console.error(e);
    res.status(500).send('Failed to add task');
  }
});

run();
