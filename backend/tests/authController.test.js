import { registerUser, loginUser } from "../controllers/authController.js";
import User from '../models/User.js';
import { connect, closeDB, clearDB } from './setup.js'
import { jest } from '@jest/globals';

// Define a secret to be used for testing
process.env.JWT_SECRET = 'testsecret';

// Define mock request and mock response
function mockRequest(body = {}, params = {}, query = {}) {
    return { body, params, query };
} 
function mockResponse() {
    const res = {};
    res.status = jest.fn().mockReturnValue(res);
    res.json = jest.fn().mockReturnValue(res);
    return res;
}

// Before all tests connect to the database
beforeAll(async () => await connect());
// After each test clear the database
afterEach(async() => await clearDB());
// After all tests close the database
afterAll(async() => await closeDB());
// Describe functionality of the auth controller
describe('Auth Controller', () => {
    // Describe functionality of register user
    describe('registerUser', () => {
        // Successful test
        it('should register a new user', async () => {
            const req = mockRequest({
                name: 'TestUser',
                email: 'Test@email.com',
                password: 'Password1!'
            });
            const res = mockResponse();
            await registerUser(req, res);
            // Expect a 201 response code (expect is basically jest's assert)
            expect(res.status).toHaveBeenCalledWith(201);
            // Expect the following json response:
            const jsonResponse = res.json.mock.calls[0][0];
            // Match (less string so that the test can pass)
            expect(jsonResponse).toMatchObject({
                _id: expect.any(String),
                name: 'TestUser',
                email: 'Test@email.com',
                message: 'Registered successfully!'
            });
        });
        // Fail for existing user
        it('should fail is email has been registered', async () => {
            // Create an existing user
            await User.create({
                name: 'Existing',
                email: 'existing@email.com',
                password: 'ValidPa$$word1'
            });
            const req = mockRequest({
                name: 'NewUser',
                email: 'existing@email.com',
                password: 'ValidPa$$word2'
            });
            const res = mockResponse();
            await registerUser(req, res);
            // 400 call if user already exists with that email
            expect(res.status).toHaveBeenCalledWith(400);
            expect(res.json).toHaveBeenCalledWith(
                expect.objectContaining({
                    message: 'Email already registered'
                })
            );
        });
        // Fail if password is invalid
        it('should fail if the password is invalid', async () => {
            const req = mockRequest({
                name: 'TestUser',
                email: 'Test@email.com',
                // invalid password
                password: 'invalidPwd'
            });
            const res = mockResponse();
            await registerUser(req, res);
            // 400 call if the password is invalid
            expect(res.status).toHaveBeenCalledWith(400);
            expect(res.json).toHaveBeenCalledWith(
                expect.objectContaining({
                    message: expect.any(String)
                })
            );
        });
    });
    // Describe functionality of login user
    describe('loginUser', () => {
        // it should log in if credentials are valid
        it('should log the user in if credentials are valid', async () => {
            // Create an existing user
            await User.create({
                name: 'Existing',
                email: 'existing@email.com',
                password: 'ValidPa$$word1'
            });
            // Log in with same credentials
            const req = mockRequest({
                email: 'existing@email.com',
                password: 'ValidPa$$word1'
            });
            const res = mockResponse();
            await loginUser(req, res);
            // 200 call if successful
            expect(res.status).toHaveBeenCalledWith(200);
            const jsonResponse = res.json.mock.calls[0][0];
            expect(jsonResponse).toMatchObject({
                    _id: expect.any(String),
                    name: 'Existing',
                    email: 'existing@email.com',
                    token: expect.any(String),
                    message: 'Logged in successfully!'
            });
        })
        // it should fail if the credentials are invalid
        it('should fail to log the user in if the credentials are invalid', async () => {
            // Create an existing user
            await User.create({
                name: 'Existing',
                email: 'existing@email.com',
                password: 'ValidPa$$word1'
            });
            // Log in with wrong credentials
            const req = mockRequest({
                email: 'existing@email.com',
                password: 'wrongpassword'
            });
            const res = mockResponse();
            await loginUser(req, res);
            // 401 call if fails
            expect(res.status).toHaveBeenCalledWith(401);
            expect(res.json).toHaveBeenCalledWith(
                expect.objectContaining({
                    message: 'Invalid credentials!'
                })
            );
        })
    });
});
