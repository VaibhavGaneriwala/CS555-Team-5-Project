const { register, login, getMe } = require('../controllers/authController');
const User = require('../models/User');
const { connect, closeDB, clearDB } = require('./setup');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');

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
    describe('register', () => {
        // Successful test
        it('should register a new user', async () => {
            const req = mockRequest({
                firstName: 'John',
                lastName: 'Doe',
                email: 'testuser@gmail.com',
                password: 'MySecurePassword123!',
                role: 'patient',
                phoneNumber: '1234567890',
                dateOfBirth: '1990-01-01',
                gender: 'male',
                address: {
                    streetAddress: '123 Main Street',
                    city: 'New York',
                    state: 'NY',
                    zipcode: '10001'
                }
            });
            const res = mockResponse();
            await register(req, res);
            // Expect a 201 response code (expect is basically jest's assert)
            expect(res.status).toHaveBeenCalledWith(201);
            // Expect the following json response:
            const jsonResponse = res.json.mock.calls[0][0];
            // Match (any string so that the test can pass)
            expect(jsonResponse).toMatchObject({
                _id: expect.any(String),
                firstName: 'John',
                lastName: 'Doe',
                email: 'testuser@gmail.com',
                role: 'patient',
                token: expect.any(String)
            });
        });
        // Fail for existing user
        it('should fail is email has been registered', async () => {
            // Create an existing user
            await User.create({
                firstName: 'Existing',
                lastName: 'User',
                email: 'existing@email.com',
                password: 'ValidPa$$word1',
                role: 'patient',
                phoneNumber: '1234567890',
                dateOfBirth: '1990-01-01',
                gender: 'male',
                address: {
                    streetAddress: '123 Main St',
                    city: 'New York',
                    state: 'NY',
                    zipcode: '10001'
                }
            });
            const req = mockRequest({
                firstName: 'New',
                lastName: 'User',
                email: 'existing@email.com',
                password: 'ValidPa$$word2',
                role: 'patient',
                phoneNumber: '0987654321',
                dateOfBirth: '1992-02-02',
                gender: 'female',
                address: {
                    streetAddress: '456 Oak St',
                    city: 'Boston',
                    state: 'MA',
                    zipcode: '02101'
                }
            });
            const res = mockResponse();
            await register(req, res);
            // 400 call if user already exists with that email
            expect(res.status).toHaveBeenCalledWith(400);
            expect(res.json).toHaveBeenCalledWith(
                expect.objectContaining({
                    message: 'User already exists'
                })
            );
        });
        // Fail if password is invalid
        it('should fail if the password is invalid', async () => {
            const req = mockRequest({
                firstName: 'Existing',
                lastName: 'User',
                email: 'existing@email.com',
                // Invalid password
                password: 'invalidpwd',
                role: 'patient',
                phoneNumber: '1234567890',
                dateOfBirth: '1990-01-01',
                gender: 'male',
                address: {
                    streetAddress: '123 Main St',
                    city: 'New York',
                    state: 'NY',
                    zipcode: '10001'
                }
            });
            const res = mockResponse();
            await register(req, res);
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
    describe('login', () => {
        // it should log in if credentials are valid
        it('should log the user in if credentials are valid', async () => {
            // Hash the password so the compare function succeeds
            const hashedPassword = await bcrypt.hash('ValidPa$$word1', 10);
            // Create an existing user
            await User.create({
                firstName: 'Existing',
                lastName: 'User',
                email: 'existing@email.com',
                password: hashedPassword,
                role: 'patient',
                phoneNumber: '1234567890',
                dateOfBirth: '1990-01-01',
                gender: 'male',
                address: {
                    streetAddress: '123 Main St',
                    city: 'New York',
                    state: 'NY',
                    zipcode: '10001'
                }
            });
            // Log in with same credentials
            const req = mockRequest({
                email: 'existing@email.com',
                password: 'ValidPa$$word1'
            });
            const res = mockResponse();
            await login(req, res);
            // 200 call if successful
            expect(res.status).toHaveBeenCalledWith(200);
            const jsonResponse = res.json.mock.calls[0][0];
            expect(jsonResponse).toMatchObject({
                _id: expect.any(String),
                firstName: 'Existing',
                lastName: 'User',
                email: 'existing@email.com',
                role: 'patient',
                token: expect.any(String)
            });
        })
        // it should fail if the credentials are invalid
        it('should fail to log the user in if the credentials are invalid', async () => {
            // Create an existing user
            await User.create({
                firstName: 'Existing',
                lastName: 'User',
                email: 'existing@email.com',
                password: 'ValidPa$$word1',
                role: 'patient',
                phoneNumber: '1234567890',
                dateOfBirth: '1990-01-01',
                gender: 'male',
                address: {
                    streetAddress: '123 Main St',
                    city: 'New York',
                    state: 'NY',
                    zipcode: '10001'
                }
            });
            // Log in with wrong credentials
            const req = mockRequest({
                email: 'existing@email.com',
                password: 'wrongpassword'
            });
            const res = mockResponse();
            await login(req, res);
            // 401 call if fails
            expect(res.status).toHaveBeenCalledWith(401);
            expect(res.json).toHaveBeenCalledWith(
                expect.objectContaining({
                    message: 'Invalid credentials'
                })
            );
        })
    });
    describe('getMe', () => {
        // it should return the user if logged in
        it('should return the user if logged in (valid token)', async () => {
            // Hash the password for comparison
            const hashedPassword = await bcrypt.hash('ValidPa$$word', 10);
            const user = await User.create({
                firstName: 'John',
                lastName: 'Doe',
                email: 'testuser@gmail.com',
                password: hashedPassword,
                role: 'patient',
                phoneNumber: '1234567890',
                dateOfBirth: '1990-01-01',
                gender: 'male',
                address: {
                    streetAddress: '123 Main St',
                    city: 'New York',
                    state: 'NY',
                    zipcode: '10001'
                },
                isActive: true
            });
            const token = jwt.sign({ id: user._id }, process.env.JWT_SECRET, { expiresIn: '30d' });
            const req = mockRequest({}, {}, {});
            req.headers = {
                authorization: `Bearer ${token}`
            };
            const res = mockResponse();

            await getMe(req, res);

            expect(res.status).toHaveBeenCalledWith(200);
            expect(res.json).toHaveBeenCalledWith(expect.objectContaining({
                    firstName: 'John',
                    lastName: 'Doe',
                    email: 'testuser@gmail.com',
                    role: 'patient'
                }));
            }),
            // it should return 401 if token is missing
            it('should return 401 if no token is provided', async () => {
                // Request with no headers
                const req = mockRequest();
                const res = mockResponse();

                await getMe(req, res);

                expect(res.status).toHaveBeenCalledWith(401);
                expect(res.json).toHaveBeenCalledWith(
                    expect.objectContaining({ message: 'Not authorized, no token provided' })
                );
            }),
            // it should return 401 if the token is invalid
            it('should return 401 if token is invalid', async () => {
                const req = mockRequest();
                // Attach an invalid token
                req.headers = {
                    authorization: 'Bearer invalidtoken'
                };
                const res = mockResponse();

                await getMe(req, res);

                expect(res.status).toHaveBeenCalledWith(401);
                expect(res.json).toHaveBeenCalledWith(
                    expect.objectContaining({ message: 'Not authorized, token failed' })
                );
            })
        })
});
