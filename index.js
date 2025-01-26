const express = require('express');
const cors = require('cors');
const app = express()
const jwt = require('jsonwebtoken');
const stripe = require('stripe')('sk_test_51QfP2KQTZ65dHD6JNijXUm4DkrdfZ5wRqUIIzYt2qy6W6FhGDh5HhnsHzXb7hEEVeNRFz7Ied8sATtIOcP9bNtH800oGODJKOx')
require('dotenv').config()
const { MongoClient, ServerApiVersion, ObjectId } = require('mongodb');
const qs = require('qs');
const { default: axios } = require('axios');
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
        const paymentsCollection = database.collection('payments');

        // middleware verifyToken
        const verifyToken = (req, res, next) => {
            if (!req.headers.authorization) {
                return res.status(401).send({ message: 'forbidden access' });
            }
            const token = req.headers.authorization.split(' ')[1]
            jwt.verify(token, process.env.SECRET_KEY_TOKEN, (err, decoded) => {
                if (err) {
                    return res.status(401).send({ message: 'forbidden access' });
                }
                req.decoded = decoded;
                next()
            })
        }

        // middleware verifyToken
        const verifyAdmin = async (req, res, next) => {
            // const decodedEmail = req.decoded.email;
            console.log(req.decoded.email);
            const query = { email: req.decoded.email }
            const user = await usersCollection.findOne(query)
            const isAdmin = user?.role === 'admin';
            if (!isAdmin) {
                return res.status(403).send({ message: 'forbidden access' });

            }
            next()
        }



        // jtw related apis 
        app.post('/jwt', async (req, res) => {
            const user = req.body;
            const token = jwt.sign(user, process.env.SECRET_KEY_TOKEN, { expiresIn: '1d' })
            res.send({ token })
        })

        // save user data 
        app.post('/users', async (req, res) => {
            const user = req.body;
            const query = { email: user.email }
            // console.log(user, query);
            const alreadyExist = await usersCollection.findOne(query);
            if (alreadyExist) {
                return res.send({ message: 'User already exist..!' })
            }
            const result = await usersCollection.insertOne(user)
            res.send(result)
        });

        app.get('/users', verifyToken, verifyAdmin, async (req, res) => {
            const result = await usersCollection.find().toArray()
            res.send(result)
        });
        app.delete('/users/:id', verifyToken, verifyAdmin, async (req, res) => {
            const userId = req.params.id;
            const filter = { _id: new ObjectId(userId) }
            const result = await usersCollection.deleteOne(filter);
            res.send(result)
        });

        app.patch('/users/admin/:id', verifyToken, verifyAdmin, async (req, res) => {
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

        // check admin 
        app.get('/users/admin/:email', verifyToken, async (req, res) => {
            const email = req.params.email;
            if (email !== req.decoded.email) {
                return res.status(403).send({ message: 'unauthorized access' });
            }
            const query = { email: email }
            const user = await usersCollection.findOne(query)
            let admin = false
            if (user) {
                admin = user?.role === 'admin'
            }
            res.send({ admin })
        })


        // get the all menus data in DB
        app.get('/menus', async (req, res) => {
            const result = await menusCollection.find().toArray()
            res.send(result)
        });

        app.get('/menus/:id', async (req, res) => {
            const id = req.params.id;
            console.log(id);
            const query = { _id: new ObjectId(id) }
            const result = await menusCollection.findOne(query);
            res.send(result)
        })

        app.patch('/menus/:id', async (req, res) => {
            const id = req.params.id;
            const updatedInfo = req.body;
            const filter = { _id: new ObjectId(id) }
            const updatedDoc = {
                $set: {
                    name: updatedInfo.name,
                    price: updatedInfo.price,
                    recipe: updatedInfo.recipe,
                    category: updatedInfo.category,
                    image: updatedInfo.image,
                }
            }
            const result = await menusCollection.updateOne(filter, updatedDoc)
            res.send(result)
        })

        app.post('/menus', verifyToken, verifyAdmin, async (req, res) => {
            const menuInfo = req.body;
            // console.log(menuInfo);
            const result = await menusCollection.insertOne(menuInfo);
            res.send(result)
        });
        app.delete('/menus/:id', verifyToken, verifyAdmin, async (req, res) => {
            const id = req.params.id;
            const query = { _id: new ObjectId(id) }
            const result = await menusCollection.deleteOne(query);
            res.send(result)
        })





        // review related apis 
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

        // Payment intent related apis
        app.post('/create-payment-intent', async (req, res) => {
            const { price } = req.body;
            const amount = parseInt(price * 100);
            const paymentIntent = await stripe.paymentIntents.create({
                amount: amount,
                currency: 'usd',
                payment_method_types: ['card']
            })
            res.send({
                clientSecret: paymentIntent?.client_secret
            })
        })

        app.post('/payments', async (req, res) => {
            const paymentInfo = req.body;
            const paymentResult = await paymentsCollection.insertOne(paymentInfo);
            // DONE: remove payment Cart items
            const query = {
                _id: {
                    $in: paymentInfo.cartIds.map(cartId => new ObjectId(cartId))
                }
            }
            const cartRemoveResult = await cartsCollection.deleteMany(query);
            res.send({ paymentResult, cartRemoveResult })
        })

        app.get('/payments/:email', verifyToken, async (req, res) => {
            const email = req.params.email;
            const decodedEmail = req.decoded.email;
            if (decodedEmail !== email) {
                return res.status(403).send({ message: 'forbidden access' })
            }
            const query = { email: email }
            const result = await paymentsCollection.find(query).toArray()
            res.send(result)
        })
        // generate SSL Payment 
        app.post('/ssl-payment', async (req, res) => {
            const tranId = new ObjectId().toString()
            const paymentInfo = req.body;
            // console.log(paymentInfo);
            const paymentInitiate = {
                store_id: 'bistr67961999ab597',
                store_passwd: 'bistr67961999ab597@ssl',
                total_amount: paymentInfo.price,
                currency: 'BDT',
                tran_id: tranId, // use unique tran_id for each api call
                success_url: 'http://localhost:5000/success-payment',
                fail_url: 'http://localhost:5173/fail',
                cancel_url: 'http://localhost:5173/cancel',
                ipn_url: 'http://localhost:5000/ipn-success-payment',
                shipping_method: 'Courier',
                product_name: 'Computer.',
                product_category: 'Electronic',
                product_profile: 'general',
                cus_name: 'Customer Name',
                cus_email: `${paymentInfo.email}`,
                cus_add1: 'Dhaka',
                cus_add2: 'Dhaka',
                cus_city: 'Dhaka',
                cus_state: 'Dhaka',
                cus_postcode: '1000',
                cus_country: 'Bangladesh',
                cus_phone: '01711111111',
                cus_fax: '01711111111',
                ship_name: 'Customer Name',
                ship_add1: 'Dhaka',
                ship_add2: 'Dhaka',
                ship_city: 'Dhaka',
                ship_state: 'Dhaka',
                ship_postcode: 1000,
                ship_country: 'Bangladesh',
            }

            const initiateResponse = await axios({
                url: 'https://sandbox.sslcommerz.com/gwprocess/v4/api.php',
                method: "POST",
                data: paymentInitiate,
                headers: {
                    "Content-Type": "application/x-www-form-urlencoded"
                }


            });

            // console.log("Response Data:", initiateResponse.data.redirectGatewayURL);
            const gatewayUrl = initiateResponse.data.redirectGatewayURL
            res.send(gatewayUrl)


        })


        // Admin Dashboard related  apis 
        app.get('/admin-dashboard', verifyToken, verifyAdmin, async (req, res) => {
            const totalCustomer = await usersCollection.estimatedDocumentCount();
            const totalMenuItems = await menusCollection.estimatedDocumentCount();
            const totalOrder = await paymentsCollection.estimatedDocumentCount();

            // bad way to .....collection  sum value 
            // const totalPrice = await menusCollection.find().toArray()
            // const result = totalPrice.reduce((total, menu) => total + menu.price, 0)

            // better wye  
            const totalPrice = await menusCollection.aggregate([
                {
                    $group: {
                        _id: null,
                        total: { $sum: "$price" },
                    },
                },
            ]).toArray()

            const total = totalPrice.length > 0 ? totalPrice[0].total : 0;
            res.send({
                totalCustomer,
                totalMenuItems,
                totalOrder,
                // result,
                total
            })
        });


        app.get('/order-stats', verifyToken, verifyAdmin, async (req, res) => {
            const result = await paymentsCollection.aggregate([
                {
                    $unwind: "$itemIds"
                },
                {
                    $lookup: {
                        from: 'menus',
                        localField: 'itemIds',
                        foreignField: '_id',
                        as: 'menuItems'
                    }
                },
                {
                    $unwind: "$menuItems"
                },
                {
                    $group: {
                        _id: '$menuItems.category',
                        quantity: { $sum: 1 },
                        revenue: { $sum: '$menuItems.price' }
                    }
                },
                {
                    $project: {
                        _id: 0,
                        category: "$_id",
                        quantity: "$quantity",
                        revenue: '$revenue'
                    }
                }
            ]).toArray();
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