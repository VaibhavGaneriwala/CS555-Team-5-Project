import mongoose from 'mongoose';
import { MongoMemoryServer } from 'mongodb-memory-server';

// Set up in memory server/database for testing
let mongoServer;

// Connect to the test server
export const connect = async () => {
    mongoServer = await MongoMemoryServer.create();
    // get the server uri
    const uri = mongoServer.getUri();
    // connect to the server
    await mongoose.connect(uri);
};

// Close the database
export const closeDB = async () => {
    await mongoose.connection.dropDatabase();
    await mongoose.connection.close();
    await mongoServer.stop();
};

// Clear the database
export const clearDB = async() => {
    const collections = mongoose.connection.collections;
    for (const key in collections) {
        await collections[key].deleteMany();
    }
};