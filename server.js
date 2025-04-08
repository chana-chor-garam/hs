const express = require('express');
const { MongoClient, ServerApiVersion } = require('mongodb');
const path = require('path');
const app = express();
const PORT = 3000;

// MongoDB connection URI
const uri = "mongodb+srv://lightbolt129:FP3nSKjHJr5h7HkC@hs.rvpyv8d.mongodb.net/?retryWrites=true&w=majority&appName=hs";
const client = new MongoClient(uri, {
  serverApi: {
    version: ServerApiVersion.v1,
    strict: true,
    deprecationErrors: true,
  }
});

// Connect once when the server starts
async function startServer() {
  try {
    await client.connect();
    console.log("Connected to MongoDB");

    app.use(express.static('public'));
    app.use(express.json());

    // Serve the static HTML page
    app.get('/', (req, res) => {
      res.sendFile(path.join(__dirname, 'public', 'index.html'));
    });

    // ---------------------
    //  DOOR ENDPOINTS
    // ---------------------

    // GET all door states
    app.get('/api/doors', async (req, res) => {
      try {
        const doorsCollection = client.db("hs").collection("doors");
        const doors = await doorsCollection.find({}).toArray();
        res.json(doors);
      } catch (err) {
        console.error(err);
        res.status(500).send('Error fetching door states');
      }
    });

    // PUT update a door (lock/unlock, open/close)
    app.put('/api/doors/:doorName', async (req, res) => {
      const doorName = req.params.doorName; // e.g. "main" or "garden"
      const { locked, open } = req.body;    // e.g. { locked: true, open: false }
      try {
        const doorsCollection = client.db("hs").collection("doors");
        const result = await doorsCollection.updateOne(
          { doorName },
          { 
            $set: { 
              locked: locked ?? false,
              open: open ?? false,
              lastActivity: new Date().toISOString()
            }
          },
          { upsert: true }
        );
        res.json({ modifiedCount: result.modifiedCount, upsertedId: result.upsertedId });
      } catch (err) {
        console.error(err);
        res.status(500).send('Error updating door');
      }
    });

    // ---------------------
    //  PEOPLE ENDPOINTS
    // ---------------------

    // GET all people
    app.get('/api/people', async (req, res) => {
      try {
        const collection = client.db("hs").collection("people");
        const people = await collection.find({}).toArray();
        res.json(people);
      } catch (err) {
        console.error(err);
        res.status(500).send('Error fetching people');
      }
    });

    // POST add a new person – now accepts 'doors'
    app.post('/api/people', async (req, res) => {
      const { name, biometricid, doors } = req.body;
      try {
        const collection = client.db("hs").collection("people");
        const result = await collection.insertOne({ name, biometricid, doors });
        res.status(201).json({ insertedId: result.insertedId });
      } catch (err) {
        console.error(err);
        res.status(500).send('Error adding person');
      }
    });

    // PUT update a person – now updates name and door access if provided
    app.put('/api/people/:biometricid', async (req, res) => {
      const biometricid = req.params.biometricid;
      const { name, doors } = req.body;
      try {
        const collection = client.db("hs").collection("people");
        const updateFields = { name };
        if (doors) { 
          updateFields.doors = doors;
        }
        const result = await collection.updateOne(
          { biometricid },
          { $set: updateFields }
        );
        res.json({ modifiedCount: result.modifiedCount });
      } catch (err) {
        console.error(err);
        res.status(500).send('Error updating person');
      }
    });

    // DELETE a person
    app.delete('/api/people/:biometricid', async (req, res) => {
      const biometricid = req.params.biometricid;
      try {
        const collection = client.db("hs").collection("people");
        const result = await collection.deleteOne({ biometricid });
        res.json({ deletedCount: result.deletedCount });
      } catch (err) {
        console.error(err);
        res.status(500).send('Error deleting person');
      }
    });

    // Start server
    app.listen(PORT, () => {
      console.log(`Server running at http://localhost:${PORT}`);
    });
  } catch (error) {
    console.error("Error connecting to MongoDB", error);
  }
}

startServer();
