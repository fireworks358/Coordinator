// src/firebase.js
// Import the functions you need from the SDKs you need
import { initializeApp } from "firebase/app";
import { getDatabase } from "firebase/database";

// Your web app's Firebase configuration
const firebaseConfig = {
  apiKey: "AIzaSyA--HBs-ISse4IlSDXBk_iKLlnNHqoEj84",
  authDomain: "coordinator-94e3a.firebaseapp.com",
  databaseURL: "https://coordinator-94e3a-default-rtdb.europe-west1.firebasedatabase.app",
  projectId: "coordinator-94e3a",
  storageBucket: "coordinator-94e3a.firebasestorage.app",
  messagingSenderId: "948525627672",
  appId: "1:948525627672:web:99447cd8fab0b38626c66d"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);

// Initialize Realtime Database
const database = getDatabase(app);

export { app, database };