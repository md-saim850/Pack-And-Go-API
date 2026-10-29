import express from 'express';
import { MongoClient, ObjectId } from 'mongodb';
import 'dotenv/config'
import cors from "cors";
import { createRemoteJWKSet, jwtVerify } from 'jose';

const app = express();
const port = 4000;

app.use(cors())
app.use(express.json());

const client = new MongoClient(process.env.MONGODB_URI);
const db = client.db("pack_and_go_db");

const travelPackage = db.collection("travel_package");
const myBooking = db.collection("my_booking");


const middleware = async(req, res, next) =>{
  const authHeaders = req.headers.authorization

  if(!authHeaders){
    return res.status(401).send({message:"Unauthorized!"})
  }

  const token = authHeaders.split(" ")[1];
  
  const JWKS = createRemoteJWKSet(
    new URL(`${process.env.CLEINT_URL}/api/auth/jwks`)
  )

  try{
    const{payload} = await jwtVerify(token, JWKS);
    next();
  }catch(error){
    return res.status(500).send({message:"Server Error!"}); 
  }
  
}


export async function connectToMongoDB() {
  try {
    await client.connect();
    console.log("You successfully connected to MongoDB!");
    return client;

  } catch (err) {
    console.dir(err);

  }
}

connectToMongoDB();

// Get all packages
app.get('/all-packages', async(req, res) => {
  try{
    const packages = await travelPackage.find({}).toArray();
    return res.json(packages);

  }catch(error){
    console.log(error);
    return res.status(500).json({message: "Failed to fetch all packages!"})

  }
});

//GET specifice package
app.get('/all-packages/:id', middleware, async(req, res) => {
  try{

    const id = req.params.id
    const packageData = await travelPackage.findOne({
      _id:new ObjectId(id)
    })

    if(!packageData){
      res.status(201).json({
        message:"Package not found!"
      })
    }

    return res.json(packageData);

  }catch(error){
    console.log(error);
    return res.status(500).json({message: "Failed to fetch package!"})

  }
});

// Add package
app.post('/all-packages', middleware, async(req, res) =>{
  try{
    const data = req.body;
    const result = await travelPackage.insertOne({data});
  
    return res.status(201).json({
      message:"Package added successfully.",
      insertedID: result.insertedId
    })

  }catch(error){
    console.log(error);
    return res.status(500).json({message: "Failed to add package!"})
  }
})

// Get My Booking packages
app.get("/my-booking", middleware, async(req, res) => {
  try{
    const result = await myBooking.find({}).toArray();
    return res.json(result);
  }catch(error){
    console.log(error);
    return res.status(500).json({message: "Failed to fetch my booking!"})
  }
})

// Add package in My Booking
app.post("/my-booking/:id", middleware, async(req, res)=>{
  try{
    const {id} = req.params;

    if (!ObjectId.isValid(id)) {
      return res.status(400).json({ error: 'Invalid ID format' });
    }

    const exists = await myBooking.findOne({"data._id": new ObjectId(id)});

    if(exists){
      return res.status(409).json({
        message: 'Booking already exists with this ID',
        exists: true,
      });
    }
    
    const data = await travelPackage.findOne({_id: new ObjectId(id)});
    
    const result = await myBooking.insertOne({data});

    return res.status(201).json({
      message: 'Package added successfully in My Booking.',
      insertedId: result.insertedId,
    });

  }catch(error){
    console.error(error);
    return res.status(500).json({ error: error.message });

  }
})

app.delete("/my-booking/:id", middleware, async(req, res) => {
  try{
    const {id} = req.params
    
    const result = await myBooking.deleteOne({
      _id: new ObjectId(id)
    })

    if(result.deletedCount === 0){
      return res.status(404).send({
        message: "Booking not found"
      });   
    }

    res.send({
      message: "Booking deleted successfully"
    });

  }catch(error){
    console.log(error);
    res.status(500).send({
      message: "Failed to delete booking"
    });
    
  }
})


app.listen(port, ()=> {
  console.log(`${port} Running...`);
});


export default app;