import React from "react";
import { View, Text, Linking, ScrollView, TouchableOpacity } from "react-native";
import { router } from "expo-router";

export default function AboutPage() {
  return (
    <ScrollView className="flex-1 bg-white dark:bg-gray-900 px-6 py-10">
      
      {/* Project Title */}
      <Text className="text-3xl font-extrabold text-center text-indigo-600 dark:text-indigo-400 mb-6">
        Medication Adherence Tracker
      </Text>

      {/* Team Members */}
      <View className="bg-gray-100 dark:bg-gray-800 p-6 rounded-2xl mb-8 shadow">
        <Text className="text-xl font-semibold text-gray-800 dark:text-white mb-3">
          Team Members
        </Text>

        <Text className="text-gray-700 dark:text-gray-300">• Parth Gadekar</Text>
        <Text className="text-gray-700 dark:text-gray-300">• Vaibhav Ganeriwala</Text>
        <Text className="text-gray-700 dark:text-gray-300">• Jared Simonetti</Text>
        <Text className="text-gray-700 dark:text-gray-300">• Daniel Storms</Text>
      </View>

      {/* Clients */}
      <View className="bg-gray-100 dark:bg-gray-800 p-6 rounded-2xl mb-8 shadow">
        <Text className="text-xl font-semibold text-gray-800 dark:text-white mb-3">
          Project Clients
        </Text>

        <Text className="text-gray-700 dark:text-gray-300">• Professor: Oyeleke</Text>
        <Text className="text-gray-700 dark:text-gray-300">• Teaching Assistant: Anlan</Text>
      </View>

      {/* Project Description */}
      <View className="bg-gray-100 dark:bg-gray-800 p-6 rounded-2xl mb-10 shadow">
        <Text className="text-xl font-semibold text-gray-800 dark:text-white mb-3">
          About the Project
        </Text>

        <Text className="text-gray-700 dark:text-gray-300 mb-3">
          The Medication Adherence Tracker (MAT) is a full-stack healthcare application 
          designed to help patients stay consistent with their prescribed medications 
          while enabling healthcare providers to monitor adherence and support 
          their patients more effectively.
        </Text>

        <Text className="text-gray-700 dark:text-gray-300 mb-3">
          The platform consists of a mobile application for patients and a provider 
          dashboard for clinicians, supported by a secure backend and intelligent 
          features that improve engagement, accuracy, and communication.
        </Text>

        <Text className="text-gray-700 dark:text-gray-300 mb-3">
          This solution aims to reduce medication non-compliance—one of the most 
          significant challenges in healthcare—through reminders, tracking tools, 
          and real-time data accessibility.
        </Text>
      </View>

      {/* Features */}
      <View className="bg-gray-100 dark:bg-gray-800 p-6 rounded-2xl mb-10 shadow">
        <Text className="text-xl font-semibold text-gray-800 dark:text-white mb-4">
          Key Features
        </Text>

        {[
          "Customizable medication reminders for patients",
          "Medication intake logging with real-time data storage",
          "Calendar interface for viewing upcoming and past medication doses",
          "Provider dashboard for monitoring adherence and patient trends",
          "Role-based authentication system (Admin, Provider, Patient)",
          "Secure backend with structured medication and user data",
          "AI-powered chatbot for answering medication-related questions",
          "Clean, modern UI with dark mode support",
          "Support for patient–provider assignment",
          "Fully functional cross-platform mobile interface",
        ].map((feature, index) => (
          <Text key={index} className="text-gray-700 dark:text-gray-300 mb-2">
            • {feature}
          </Text>
        ))}
      </View>

      {/* GitHub Link */}
      <View className="bg-gray-100 dark:bg-gray-800 p-6 rounded-2xl mb-10 shadow">
        <Text className="text-xl font-semibold text-gray-800 dark:text-white mb-4">
          GitHub Repository
        </Text>

        <TouchableOpacity
          onPress={() =>
            Linking.openURL("https://github.com/VaibhavGaneriwala/CS555-Team-5-Project")
          }
        >
          <Text className="text-blue-500 dark:text-blue-400 text-lg text-center underline">
            github.com/VaibhavGaneriwala/CS555-Team-5-Project
          </Text>
        </TouchableOpacity>
      </View>

      {/* Thank You */}
      <View className="items-center mb-12">
        <Text className="text-xl font-semibold text-gray-800 dark:text-white mb-3">
          Thank You!
        </Text>
        <Text className="text-gray-700 dark:text-gray-300 text-center">
          We appreciate your time and guidance throughout the development of this project.
        </Text>
      </View>

      {/* Back Button */}
      <TouchableOpacity
        onPress={() => router.push("/home")}
        className="bg-indigo-600 py-4 rounded-2xl shadow mx-16 mb-20"
      >
        <Text className="text-white text-center text-lg font-bold">Back to Home</Text>
      </TouchableOpacity>
    </ScrollView>
  );
}
