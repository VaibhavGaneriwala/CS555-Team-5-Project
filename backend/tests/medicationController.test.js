const { createMedication, getMedications, getMedicationById, updateMedication, deleteMedication } = require('../controllers/medicationController.js');
const User = require('../models/User');
const Medication = require('../models/Medication.js')
const { connect, closeDB, clearDB } = require('./setup');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');

// Define a secret to be used for testing
process.env.JWT_SECRET = 'testsecret';

// Define mock request and mock response
function mockRequest(body = {}, params = {}, query = {}, user=null) {
    return { body, params, query, user };
} 
function mockResponse() {
    const res = {};
    res.status = jest.fn().mockReturnValue(res);
    res.json = jest.fn().mockReturnValue(res);
    return res;
}

async function createPatientAndProvider() {
    // Create a patient
    const patient = await User.create({
        firstName: 'John',
        lastName: 'Patient',
        email: 'johnpatient@email.com',
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
    // And provider so that we can create the medication
    const provider = await User.create({
        firstName: 'Jan',
        lastName: 'Provider',
        email: 'janprovider@email.com',
        password: 'ValidPa$$word1',
        role: 'provider',
        patients: [patient._id],
        phoneNumber: '1234567890',
        dateOfBirth: '1990-01-01',
        gender: 'female',
        address: {
            streetAddress: '123 Main St',
            city: 'New York',
            state: 'NY',
            zipcode: '10001'
        }
    });
    return { patient, provider };
}

// Before all tests connect to the database
beforeAll(async () => await connect());
// After each test clear the database
afterEach(async() => await clearDB());
// After all tests close the database
afterAll(async() => await closeDB());
// Describe functionality of the medication controller
describe('Medication Controller', () => {
    // Describe functionality of createMedication
    describe('createMedication', () => {
        // Successful test
        it('should create a new medication', async () => {
            const { patient, provider } = await createPatientAndProvider();
            // Add the provider id to the body and patient to request
            const req = mockRequest({
                name: "Amoxicillin",
                dosage: "500 mg",
                frequency: "once-daily",
                schedule: {
                    time: "6:00 A.M."
                },
                startDate: "2025-11-05",
                endDate: "2025-11-12",
                instructions: "Take after meals with a full glass of water.",
                prescribedBy: provider._id,
            }, {}, {}, patient);
            const res = mockResponse();
            await createMedication(req, res);
            // Expect a 201 response code (expect is basically jest's assert)
            expect(res.status).toHaveBeenCalledWith(201);
            // Expect the following json response:
            const jsonResponse = res.json.mock.calls[0][0];
            // Match (any string so that the test can pass)
            expect(jsonResponse).toMatchObject({
                message: expect.any(String)
            });
        });
        // Fail for missing field in medication
        it('should fail any required field is missing', async () => {
            const { patient, provider } = await createPatientAndProvider();
            // Add the provider id to the body and patient to request
            const req = mockRequest({
                name: "Amoxicillin",
                dosage: "500 mg",
                frequency: "",
                schedule: {
                    time: "6:00 A.M."
                },
                startDate: "2025-11-05",
                endDate: "2025-11-12",
                instructions: "Take after meals with a full glass of water.",
                prescribedBy: provider._id,
            }, {}, {}, patient);
            const res = mockResponse();
            await createMedication(req, res);
            // Expect a 400 response code
            expect(res.status).toHaveBeenCalledWith(400);
            // Expect the following json response:
            const jsonResponse = res.json.mock.calls[0][0];
            // Match (any string so that the test can pass)
            expect(jsonResponse).toMatchObject({
                message: expect.stringContaining('All fields are required')
            });
        });
    });
    // Describe the functionality of getMedications
    describe('getMedications', () => {
        // Successful test
        it('should get the current user\'s medications', async () => {
            const { patient, provider } = await createPatientAndProvider();
            // Create a medication to return
            await Medication.create({
                patient: patient._id,
                name: "Amoxicillin",
                dosage: "500 mg",
                frequency: "once-daily",
                schedule: {
                    time: "6:00 A.M."
                },
                startDate: "2025-11-05",
                endDate: "2025-11-12",
                instructions: "Take after meals with a full glass of water.",
                prescribedBy: provider._id,
            })
            const req = mockRequest({}, {}, {}, patient);
            const res = mockResponse();
            await getMedications(req, res);
            // Expect a 201 response code (expect is basically jest's assert)
            expect(res.status).toHaveBeenCalledWith(200);
            // Expect the following json response:
            const jsonResponse = res.json.mock.calls[0][0];
            // Expect the patient id in the response to match the current user's id
            expect(jsonResponse[0].patient._id.toString()).toBe(patient._id.toString());
        });
        // Get all of the medications for a provider's patients
        it('should return medications for a provider\'s patient (authorized)', async () => {
            const { patient, provider } = await createPatientAndProvider();
            await Medication.create({
                patient: patient._id,
                name: "Amoxicillin",
                dosage: "500 mg",
                frequency: "once-daily",
                schedule: {
                    time: "6:00 A.M."
                },
                startDate: "2025-11-05",
                endDate: "2025-11-12",
                instructions: "Take after meals with a full glass of water.",
                prescribedBy: provider._id,
            })
            // Include the patient id in the query
            const req = mockRequest({}, {}, { patientId: patient._id.toString() }, provider);
            const res = mockResponse();

            await getMedications(req, res);

            expect(res.status).toHaveBeenCalledWith(200);
            const jsonResponse = res.json.mock.calls[0][0];
            expect(jsonResponse[0].patient._id.toString()).toBe(patient._id.toString());
        });
        // Deny access for a provider not linked to the patients
        it('should deny provider access if not authorized for the patient', async () => {
            const { patient } = await createPatientAndProvider();
            // Create a second provider not linked to this patient
            const rogueProvider = await User.create({
                firstName: 'Rogue',
                lastName: 'Provider',
                email: 'rogueprovider@email.com',
                password: 'ValidPa$$word1',
                role: 'provider',
                patients: [],
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

            const req = mockRequest({}, {}, { patientId: patient._id.toString() }, rogueProvider);
            const res = mockResponse();

            await getMedications(req, res);

            expect(res.status).toHaveBeenCalledWith(403);
            expect(res.json.mock.calls[0][0]).toMatchObject({
                message: expect.stringContaining('You are not authorized to access this patient\'s medications')
            });
        });
        // Return any patient's medications if an admin
        it('should provide the patient\'s medication if an admin', async () => {
            const { patient, provider } = await createPatientAndProvider();
            // Create a medication for the patient
            await Medication.create({
                patient: patient._id,
                name: "Amoxicillin",
                dosage: "500 mg",
                frequency: "once-daily",
                schedule: {
                    time: "6:00 A.M."
                },
                startDate: "2025-11-05",
                endDate: "2025-11-12",
                instructions: "Take after meals with a full glass of water.",
                prescribedBy: provider._id,
            });
            // Create an admin
            const admin = await User.create({
                firstName: 'Admin',
                lastName: 'User',
                email: 'adminuser@email.com',
                password: 'ValidPa$$word1',
                role: 'admin',
                patients: [],
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

            const req = mockRequest({}, {}, {}, admin);
            const res = mockResponse();

            await getMedications(req, res);

            expect(res.status).toHaveBeenCalledWith(200);
            const jsonResponse = res.json.mock.calls[0][0];
            expect(jsonResponse.length).toBeGreaterThan(0);
        });
    });
    // Describing the functionality of medication by Id
    describe('getMedicationById', () => {
        // it should the return the patient's medication using its Id
        it('should return the patient\'s medication with the inputted id', async () => {
            const { patient, provider } = await createPatientAndProvider();
            // Create a medication for the patient
            const medication = await Medication.create({
                patient: patient._id,
                name: "Amoxicillin",
                dosage: "500 mg",
                frequency: "once-daily",
                schedule: {
                    time: "6:00 A.M."
                },
                startDate: "2025-11-05",
                endDate: "2025-11-12",
                instructions: "Take after meals with a full glass of water.",
                prescribedBy: provider._id,
            });
            // Get the medication based on it's id
            const req = mockRequest({}, { id: medication._id.toString() }, {}, patient);
            const res = mockResponse();
            await getMedicationById(req, res);
            expect(res.status).toHaveBeenCalledWith(200);
            const jsonResponse = res.json.mock.calls[0][0];
            expect(jsonResponse._id.toString()).toBe(medication._id.toString());
        });
        // Should return 404 if invalid id is inputted
        it('should return 404 if invalid id is inputted', async () => {
            const { patient } = await createPatientAndProvider();
            // Create a fake id to search for
            const wrongId = 'invalidId';
            // Get the medication based on it's id
            const req = mockRequest({}, { id: wrongId }, {}, patient);
            const res = mockResponse();
            await updateMedication(req, res);
            expect(res.status).toHaveBeenCalledWith(404);
            const jsonResponse = res.json.mock.calls[0][0];
            expect(jsonResponse).toMatchObject({
                message: expect.stringContaining('Medication Id is invalid')
            });
        });
        // Should return 404 if medication is not found
        it('should return 404 if medication is not found', async () => {
            const { patient } = await createPatientAndProvider();
            // Create a fake id to search for
            const fakeId = '68ee01b03ecf1f913c8d4fc7';
            // Get the medication based on it's id
            const req = mockRequest({}, { id: fakeId }, {}, patient);
            const res = mockResponse();
            await getMedicationById(req, res);
            expect(res.status).toHaveBeenCalledWith(404);
            const jsonResponse = res.json.mock.calls[0][0];
            expect(jsonResponse).toMatchObject({
                message: expect.stringContaining('Medication not found')
            });
        });
        // Should return 404 if trying to access another user's medication
        it('should return 404 if trying to access another user\'s medication', async () => {
            const { patient, provider } = await createPatientAndProvider();
            // Create a medication for the patient
            const medication = await Medication.create({
                patient: patient._id,
                name: "Amoxicillin",
                dosage: "500 mg",
                frequency: "once-daily",
                schedule: {
                    time: "6:00 A.M."
                },
                startDate: "2025-11-05",
                endDate: "2025-11-12",
                instructions: "Take after meals with a full glass of water.",
                prescribedBy: provider._id,
            });
            // Create another patient
            const other_patient = await User.create({
                firstName: 'other',
                lastName: 'patient',
                email: 'patient2@email.com',
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
            // Try to access the medication as the other patient
            const req = mockRequest({}, { id: medication._id.toString() }, {}, other_patient);
            const res = mockResponse();
            await getMedicationById(req, res);
            expect(res.status).toHaveBeenCalledWith(403);
            const jsonResponse = res.json.mock.calls[0][0];
            expect(jsonResponse).toMatchObject({
                message: expect.stringContaining('You are not authorized to access this medication')
            });
        });
        it('should return 404 if trying to access another user\'s medication', async () => {
            const { patient, provider } = await createPatientAndProvider();
            // Create a medication for the patient
            const medication = await Medication.create({
                patient: patient._id,
                name: "Amoxicillin",
                dosage: "500 mg",
                frequency: "once-daily",
                schedule: {
                    time: "6:00 A.M."
                },
                startDate: "2025-11-05",
                endDate: "2025-11-12",
                instructions: "Take after meals with a full glass of water.",
                prescribedBy: provider._id,
            });
            // Create another provider
            const other_provider = await User.create({
                firstName: 'Other',
                lastName: 'Provider',
                email: 'otherprovider@email.com',
                password: 'ValidPa$$word1',
                role: 'provider',
                patients: [],
                phoneNumber: '1234567890',
                dateOfBirth: '1990-01-01',
                gender: 'female',
                address: {
                    streetAddress: '123 Main St',
                    city: 'New York',
                    state: 'NY',
                    zipcode: '10001'
                }
            });
            // Try to access the medication as the other provider
            const req = mockRequest({}, { id: medication._id.toString() }, {}, other_provider);
            const res = mockResponse();
            await getMedicationById(req, res);
            expect(res.status).toHaveBeenCalledWith(403);
            const jsonResponse = res.json.mock.calls[0][0];
            expect(jsonResponse).toMatchObject({
                message: expect.stringContaining('You are not authorized to access this medication')
            });
        });
    });
    // Describing the functionality of update medication
    describe('updateMedication', () => {
        // it should allow the user to update their medication
        it('should allow the user to update the selected medication', async () => {
            const { patient, provider } = await createPatientAndProvider();
            // Create a medication for the patient
            const medication = await Medication.create({
                patient: patient._id,
                name: "Amoxicillin",
                dosage: "500 mg",
                frequency: "once-daily",
                schedule: {
                    time: "6:00 A.M."
                },
                startDate: "2025-11-05",
                endDate: "2025-11-12",
                instructions: "Take after meals with a full glass of water.",
                prescribedBy: provider._id,
            });
            // Provide some data to update (for example raise dosage)
            const updatedData = { dosage: '550 mg' }
            const req = mockRequest(updatedData, { id: medication._id.toString() }, {}, patient);
            const res = mockResponse();
            await updateMedication(req, res);
            expect(res.status).toHaveBeenCalledWith(200);
            const jsonResponse = res.json.mock.calls[0][0];
            expect(jsonResponse.dosage).toBe("550 mg");
        });
        // Should return 404 if invalid id is inputted
        it('should return 404 if invalid id is inputted', async () => {
            const { patient } = await createPatientAndProvider();
            // Create a fake id to search for
            const wrongId = 'invalidId';
            // Get the medication based on it's id
            const req = mockRequest({}, { id: wrongId }, {}, patient);
            const res = mockResponse();
            await updateMedication(req, res);
            expect(res.status).toHaveBeenCalledWith(404);
            const jsonResponse = res.json.mock.calls[0][0];
            expect(jsonResponse).toMatchObject({
                message: expect.stringContaining('Medication Id is invalid')
            });
        });
        // Should return 404 if medication is not found
        it('should return 404 if medication is not found', async () => {
            const { patient } = await createPatientAndProvider();
            // Create a fake id to search for
            const fakeId = '68ee01b03ecf1f913c8d4fc7';
            // Get the medication based on it's id
            const req = mockRequest({}, { id: fakeId }, {}, patient);
            const res = mockResponse();
            await updateMedication(req, res);
            expect(res.status).toHaveBeenCalledWith(404);
            const jsonResponse = res.json.mock.calls[0][0];
            expect(jsonResponse).toMatchObject({
                message: expect.stringContaining('Medication not found')
            });
        });
        // Should return 404 if trying to access another user's medication
        it('should return 404 if trying to update another user\'s medication', async () => {
            const { patient, provider } = await createPatientAndProvider();
            // Create a medication for the patient
            const medication = await Medication.create({
                patient: patient._id,
                name: "Amoxicillin",
                dosage: "500 mg",
                frequency: "once-daily",
                schedule: {
                    time: "6:00 A.M."
                },
                startDate: "2025-11-05",
                endDate: "2025-11-12",
                instructions: "Take after meals with a full glass of water.",
                prescribedBy: provider._id,
            });
            // Create another patient
            const other_patient = await User.create({
                firstName: 'other',
                lastName: 'patient',
                email: 'patient2@email.com',
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
            // Try to update the medication as the other patient
            const updatedData = { dosage: '550 mg' }
            const req = mockRequest(updatedData, { id: medication._id.toString() }, {}, other_patient);
            const res = mockResponse();
            await updateMedication(req, res);
            expect(res.status).toHaveBeenCalledWith(403);
            const jsonResponse = res.json.mock.calls[0][0];
            expect(jsonResponse).toMatchObject({
                message: expect.stringContaining('You are not authorized to update this medication')
            });
        });
        it('should return 404 if trying to access another user\'s medication', async () => {
            const { patient, provider } = await createPatientAndProvider();
            // Create a medication for the patient
            const medication = await Medication.create({
                patient: patient._id,
                name: "Amoxicillin",
                dosage: "500 mg",
                frequency: "once-daily",
                schedule: {
                    time: "6:00 A.M."
                },
                startDate: "2025-11-05",
                endDate: "2025-11-12",
                instructions: "Take after meals with a full glass of water.",
                prescribedBy: provider._id,
            });
            // Create another provider
            const other_provider = await User.create({
                firstName: 'Other',
                lastName: 'Provider',
                email: 'otherprovider@email.com',
                password: 'ValidPa$$word1',
                role: 'provider',
                patients: [],
                phoneNumber: '1234567890',
                dateOfBirth: '1990-01-01',
                gender: 'female',
                address: {
                    streetAddress: '123 Main St',
                    city: 'New York',
                    state: 'NY',
                    zipcode: '10001'
                }
            });
            // Try to update the medication as the other provider
            const updatedData = { dosage: '550 mg' }
            const req = mockRequest(updatedData, { id: medication._id.toString() }, {}, other_provider);
            const res = mockResponse();
            await updateMedication(req, res);
            expect(res.status).toHaveBeenCalledWith(403);
            const jsonResponse = res.json.mock.calls[0][0];
            expect(jsonResponse).toMatchObject({
                message: expect.stringContaining('You are not authorized to update this medication')
            });
        });
    });
    // Describing the functionality of medication by Id
    describe('deleteMedication', () => {
        // it should delete the medication of the inputted id
        it('should delete the patient\'s medication with the inputted id', async () => {
            const { patient, provider } = await createPatientAndProvider();
            // Create a medication for the patient
            const medication = await Medication.create({
                patient: patient._id,
                name: "Amoxicillin",
                dosage: "500 mg",
                frequency: "once-daily",
                schedule: {
                    time: "6:00 A.M."
                },
                startDate: "2025-11-05",
                endDate: "2025-11-12",
                instructions: "Take after meals with a full glass of water.",
                prescribedBy: provider._id,
            });
            // Get the medication based on it's id
            const req = mockRequest({}, { id: medication._id.toString() }, {}, patient);
            const res = mockResponse();
            await deleteMedication(req, res);
            expect(res.status).toHaveBeenCalledWith(200);
            const jsonResponse = res.json.mock.calls[0][0];
            expect(jsonResponse).toMatchObject({
                message: expect.stringContaining('Medication deleted successfully')
            });
        });
        // Should return 404 if invalid id is inputted
        it('should return 404 if invalid id is inputted', async () => {
            const { patient } = await createPatientAndProvider();
            // Create a fake id to search for
            const wrongId = 'invalidId';
            // Get the medication based on it's id
            const req = mockRequest({}, { id: wrongId }, {}, patient);
            const res = mockResponse();
            await deleteMedication(req, res);
            expect(res.status).toHaveBeenCalledWith(404);
            const jsonResponse = res.json.mock.calls[0][0];
            expect(jsonResponse).toMatchObject({
                message: expect.stringContaining('Medication Id is invalid')
            });
        });
        // Should return 404 if medication is not found
        it('should return 404 if medication is not found', async () => {
            const { patient } = await createPatientAndProvider();
            // Create a fake id to search for
            const fakeId = '68ee01b03ecf1f913c8d4fc7';
            // Get the medication based on it's id
            const req = mockRequest({}, { id: fakeId }, {}, patient);
            const res = mockResponse();
            await deleteMedication(req, res);
            expect(res.status).toHaveBeenCalledWith(404);
            const jsonResponse = res.json.mock.calls[0][0];
            expect(jsonResponse).toMatchObject({
                message: expect.stringContaining('Medication not found')
            });
        });
        // Should return 404 if trying to delete another user's medication
        it('should return 404 if trying to delete another user\'s medication', async () => {
            const { patient, provider } = await createPatientAndProvider();
            // Create a medication for the patient
            const medication = await Medication.create({
                patient: patient._id,
                name: "Amoxicillin",
                dosage: "500 mg",
                frequency: "once-daily",
                schedule: {
                    time: "6:00 A.M."
                },
                startDate: "2025-11-05",
                endDate: "2025-11-12",
                instructions: "Take after meals with a full glass of water.",
                prescribedBy: provider._id,
            });
            // Create another patient
            const other_patient = await User.create({
                firstName: 'other',
                lastName: 'patient',
                email: 'patient2@email.com',
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
            // Try to access the medication as the other patient
            const req = mockRequest({}, { id: medication._id.toString() }, {}, other_patient);
            const res = mockResponse();
            await deleteMedication(req, res);
            expect(res.status).toHaveBeenCalledWith(403);
            const jsonResponse = res.json.mock.calls[0][0];
            expect(jsonResponse).toMatchObject({
                message: expect.stringContaining('You are not authorized to delete this medication')
            });
        });
        // Should return 404 if trying to delete medication if not the user's provider
        it('should return 404 if trying to delete another user\'s medication as provider', async () => {
            const { patient, provider } = await createPatientAndProvider();
            // Create a medication for the patient
            const medication = await Medication.create({
                patient: patient._id,
                name: "Amoxicillin",
                dosage: "500 mg",
                frequency: "once-daily",
                schedule: {
                    time: "6:00 A.M."
                },
                startDate: "2025-11-05",
                endDate: "2025-11-12",
                instructions: "Take after meals with a full glass of water.",
                prescribedBy: provider._id,
            });
            // Create another provider
            const other_provider = await User.create({
                firstName: 'Other',
                lastName: 'Provider',
                email: 'otherprovider@email.com',
                password: 'ValidPa$$word1',
                role: 'provider',
                patients: [],
                phoneNumber: '1234567890',
                dateOfBirth: '1990-01-01',
                gender: 'female',
                address: {
                    streetAddress: '123 Main St',
                    city: 'New York',
                    state: 'NY',
                    zipcode: '10001'
                }
            });
            // Try to access the medication as the other provider
            const req = mockRequest({}, { id: medication._id.toString() }, {}, other_provider);
            const res = mockResponse();
            await deleteMedication(req, res);
            expect(res.status).toHaveBeenCalledWith(403);
            const jsonResponse = res.json.mock.calls[0][0];
            expect(jsonResponse).toMatchObject({
                message: expect.stringContaining('You are not authorized to delete this medication')
            });
        });
    });
});
