// MongoDB Connection API
import mongoose from 'mongoose';

const buildConnStr = () => {
    // get the username and pwd from process.env
    const user = process.env.MONGO_DB_USER
    const pwd = process.env.MONGO_DB_PWD

    // throw error if missing
    if (!user || !pwd) {
        throw new Error('Missing username or password');
    }
    // build conn string
    const connStr = `mongodb+srv://${encodeURIComponent(user)}:${encodeURIComponent(pwd)}@555cluster.gganvur.mongodb.net/?retryWrites=true&w=majority&appName=555cluster`;
    return connStr
};

const connectDB = async () => {
    try {
        const connStr = buildConnStr();
        const conn = await mongoose.connect(connStr);
        console.log(`Successfully connected to database`);
    } catch (error) {
        // maybe add better error logging later
        console.log(`Error connecting to DB: ${error.message}`)
        process.exit(1)
    }
};

export default connectDB