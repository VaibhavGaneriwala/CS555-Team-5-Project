# 💊 Medication Adherence Tracker (Team 5 — CS 555 Project)

## 📌 Project Overview
**Medication Adherence Tracker (MAT)** is a cross-platform health application that helps patients track, manage, and adhere to their prescribed medications.
The system delivers automated reminders, allows medication **logging and monitoring**, and ensures **secure data management** through a robust **Node.js + MongoDB** backend.

MAT promotes improved patient outcomes through timely notifications and intuitive medication tracking.



## 🚀 Key Features
- 🔐 **User Authentication:** Secure registration and login using JSON Web Tokens (JWT).  
- 💊 **Medication Management:** Add, update, and delete medications with dosage and schedule details.  
- ⏰ **Smart Reminders:** Automated notifications to ensure timely dosage intake.  
- 📈 **Adherence Tracking:** Track missed and completed doses for progress analysis.  
- ☁️ **Cloud Integration:** Data stored securely using **MongoDB**.
- 🧩 **RESTful APIs:** Modular Express controllers and routes for users, medications, and adherence logs.  
- 💬 **Team Collaboration:** Managed via GitHub, Slack, and Jira for continuous integration and Agile workflow.  



## 🧠 System Architecture
```bash
Frontend (React Native / Flutter)
│
▼
Express.js API
│
▼
MongoDB Services
├── MongoDB (DB)
├── Authentication
└── Cloud Storage
```


## 🛠️ Technologies Used
| Category | Tools & Technologies |
|-----------|----------------------|
| **Backend** | Node.js, Express.js |
| **Database & Cloud** | MongoDB |
| **Version Control** | GitHub (Team Repository) |
| **Project Management** | Jira / Excel (User Stories, Burndown, Velocity) |
| **Communication** | Slack (Team & Instructor Updates) |
| **Languages** | JavaScript, JSON, REST API |



## ⚙️ How It Works
1. 🧾 **User Registration & Login:** Users authenticate securely.  
2. 💊 **Medication Entry:** Users input medicine name, dosage, and schedule.  
3. ⏰ **Reminders Triggered:** System sends alerts at the scheduled times.  
4. 📊 **Adherence Monitoring:** Tracks intake behavior and displays completion stats.  
5. ☁️ **Data Stored in Firestore:** Ensures secure, real-time cloud storage for all records.


## 🧩 Folder Structure
```bash
Medication-Adherence-Tracker/
│
├── backend/
│   ├── config/
│   │   └── db.js
│   ├── controllers/
│   │   ├── authController.js
│   │   ├── medicationController.js
│   │   └── adherenceController.js
│   ├── middleware/
│   │   └── auth.js
│   ├── models/
│   │   ├── User.js
│   │   ├── Medication.js
│   │   └── AdherenceLog.js
│   ├── routes/
│   │   ├── auth.js
│   │   ├── medications.js
│   │   └── adherence.js
│   ├── utils/
│   │   └── reminderScheduler.js
│   ├── server.js
│   └── package.json
│
├── frontend/
│   ├── app/
│   │   ├── (patient)/
│   │   │   ├── MedicationCalendar.tsx
│   │   │   ├── EditMedication.tsx
│   │   │   └── PatientHome.tsx
│   │   ├── (provider)/
│   │   ├── (admin)/
│   │   └── utils/
│   │       └── notifications.ts
│   ├── assets/
│   ├── app.json
│   └── package.json
│
└── README.md
```


## 💡 API Overview
| Endpoint | Method | Description |
|-----------|--------|-------------|
| `/api/user/register` | POST | Register a new user |
| `/api/user/login` | POST | Authenticate and login user |
| `/api/medication/add` | POST | Add new medication entry |
| `/api/medication/get/:uid` | GET | Fetch all medications for user |
| `/api/medication/update/:id` | PUT | Update existing medication record |
| `/api/medication/delete/:id` | DELETE | Remove a medication entry |



## 📊 Sprint 1 Deliverables
✅ Firebase backend setup and integration  
✅ RESTful APIs for users and medications  
✅ Successful connection between backend and Firebase  
✅ GitHub commits from all team members  
✅ Jira updates with user stories and burndown chart  
✅ Slack communication logs with demo link  

## 📊 Sprint 2 Deliverables
✅ Migrated backend to MongoDB
✅ Implemented automated reminder scheduler (node-cron)
✅ Integrated frontend notification system (Expo Notifications)
✅ Role-based access for admin & provider
✅ Continuous integration with GitHub actions and manual testing



## 🧮 Installation & Setup
### 🔧 Prerequisites
- Node.js v16+  
- Firebase Project & Service Account Key  
- `.env` file with configuration:
  ```bash
  PORT=3000
  MONGODB_URI=your_mongo_connection_string
  JWT_SECRET=your_jwt_secret
  ```

### 🧱 Setup Steps
```bash
# Clone the repository
git clone https://github.com/ParthGadekar0631/Medication-Adherence-Tracker.git
```
```bash
# Navigate to backend
cd backend
```

```bash
# Install dependencies
npm install
```

```bash
# Run the server
node server.js
```
## 📱 Frontend Setup
```bash
cd frontend
npm install
npx expo start -c
```

## 🎯 Future Enhancements

- 🤖 Voice-Assistant Integration (Siri / Google Assistant)  
- 📱 Push Notifications & Smart Reminders  
- 🩺 Doctor Dashboard for Prescription Monitoring  
- 📊 AI-based Adherence Analytics  
- 🌐 Full Web Dashboard for Admin and Providers  


## 🤝 Team 5 — Contributors

| Name | Role | Responsibility |
|------|------|----------------|
| **Parth Gadekar** | Backend Developer | Firebase Integration, API Development |
| **Vaibhav Ganeriwala** | Database Engineer | Data Schema & Firestore Design |
| **Daniel Storms** | Frontend Developer | UI/UX and Mobile App |
| **Jared Simonetti** | Scrum Master | Jira, Sprint Management, Review |


## 🧭 Agile Workflow Tools

- **Jira:** Sprint planning, story tracking, burndown chart  
- **Slack:** Daily team communication, sprint demos  
- **GitHub:** Version control, CI/CD integration  
- **Confluence / Docs:** Sprint reviews and retrospectives  

## 📄 License

This project is released under the **MIT License** — free to use, modify, and distribute.

 
