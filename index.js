const express = require('express');
const cors = require('cors');
const app = express()
require('dotenv').config()
const { MongoClient, ServerApiVersion } = require('mongodb');
const port = process.env.PORT || 5000;

// middleware 
app.use(cors())
app.use(express.json())


const uri = `mongodb+srv://${process.env.DB_USER}:${process.env.DB_PASS}@cluster0.eedxn.mongodb.net/?retryWrites=true&w=majority&appName=Cluster0`;

// Create a MongoClient with a MongoClientOptions object to set the Stable API version
const client = new MongoClient(uri, {
    serverApi: {
        version: ServerApiVersion.v1,
        strict: true,
        deprecationErrors: true,
    }
});

async function run() {
    try {
        // DB bistro-restaurant
        const database = client.db('bistro-restaurant');
        const menusCollection = database.collection('menus');
        const reviewsCollection = database.collection('reviews');

        // get the all menus data in DB
        app.get('/menus', async (req, res) => {
            const result = await menusCollection.find().toArray()
            res.send(result)
        })
        app.get('/reviews', async (req, res) => {
            const result = await reviewsCollection.find().toArray()
            res.send(result)
        })


        console.log("Pinged your deployment. You successfully connected to MongoDB!");
    } finally {
        // Ensures that the client will close when you finish/error
        // await client.close();
    }
}
run().catch(console.dir);











app.get('/', async (req, res) => {
    res.send('Bistro Boos server is running ')
})

app.listen(port, () => {
    console.log(`Bistro Boos server is running port on ${port}`);

})