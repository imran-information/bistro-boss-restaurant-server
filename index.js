const express = require('express');
const cors = require('cors');
const app = express()
const jwt = require('jsonwebtoken');
require('dotenv').config()
const { MongoClient, ServerApiVersion, ObjectId } = require('mongodb');
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
        const usersCollection = database.collection('users');
        const menusCollection = database.collection('menus');
        const reviewsCollection = database.collection('reviews');
        const cartsCollection = database.collection('carts');


        // jtw related apis 
        app.post('/jwt', async (req, res) => {
            const userEmail = req.body;
            jwt.sign({ email: userEmail }, process.env.SECRET_KEY_TOKEN, { expiresIn: '1d' })
            res.send({
                success: true
            })
        })

        // save user data 
        app.post('/users', async (req, res) => {
            const user = req.body;
            const query = { email: user.email }
            console.log(user, query);
            const alreadyExist = await usersCollection.findOne(query);
            if (alreadyExist) {
                return res.send({ message: 'User already exist..!' })
            }
            const result = await usersCollection.insertOne(user)
            res.send(result)
        });

        app.get('/users', async (req, res) => {
            const result = await usersCollection.find().toArray()
            res.send(result)
        });
        app.delete('/users/:id', async (req, res) => {
            const userId = req.params.id;
            const filter = { _id: new ObjectId(userId) }
            const result = await usersCollection.deleteOne(filter);
            res.send(result)
        });

        app.patch('/users/admin/:id', async (req, res) => {
            const id = req.params.id;
            const filter = { _id: new ObjectId(id) }
            const updatedDoc = {
                $set: {
                    role: 'admin',
                }
            }
            const result = await usersCollection.updateOne(filter, updatedDoc)
            res.send(result)
        })


        // get the all menus data in DB
        app.get('/menus', async (req, res) => {
            const result = await menusCollection.find().toArray()
            res.send(result)
        })
        app.get('/reviews', async (req, res) => {
            const result = await reviewsCollection.find().toArray()
            res.send(result)
        })

        // add to the cart 
        app.post('/carts', async (req, res) => {
            const cartInfo = req.body;
            const result = await cartsCollection.insertOne(cartInfo)
            res.send(result)
        })

        app.get('/carts', async (req, res) => {
            const email = req.query.email;
            const query = { email: email }
            const result = await cartsCollection.find(query).toArray();
            res.send(result)
        });
        app.delete('/carts/:id', async (req, res) => {
            const id = req.params.id;
            const query = { _id: new ObjectId(id) }
            const result = await cartsCollection.deleteOne(query);
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