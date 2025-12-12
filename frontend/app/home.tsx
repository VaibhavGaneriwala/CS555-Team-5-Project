import React from "react";
import {
  View,
  Text,
  Image,
  TouchableOpacity,
  ScrollView,
} from "react-native";
import { router } from "expo-router";

export default function Home() {
  return (
    <ScrollView className="flex-1 bg-slate-50 dark:bg-gray-900">
      {/* PAGE WRAPPER */}
      <View className="px-6 pt-10 pb-10">

        {/* TOP NAV (FlowCV style) */}
        <View className="flex-row items-center justify-between mb-10">
          {/* Logo + Brand */}
          <View className="flex-row items-center">
            <View className="w-14 h-14 rounded-2xl bg-indigo-600 items-center justify-center mr-3 shadow-lg">
              <Image
                source={require("../assets/images/logo.png")}
                style={{ width: 40, height: 40, resizeMode: "contain" }}
              />
            </View>
            <Text className="text-xl font-bold text-gray-900 dark:text-white">
              MAT HealthTech
            </Text>
          </View>

          {/* Nav links */}
          <View className="flex-row items-center">
            <TouchableOpacity
              onPress={() => router.push("/about")}
              className="mr-4"
            >
              <Text className="text-sm text-gray-700 dark:text-gray-300">
                About
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              onPress={() => router.push("/login")}
              className="px-4 py-2 rounded-full border border-gray-300 dark:border-gray-600 mr-3"
            >
              <Text className="text-sm font-semibold text-gray-800 dark:text-gray-100">
                Login
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              onPress={() => router.push("/Register")}
              className="px-4 py-2 rounded-full bg-indigo-700"
            >
              <Text className="text-sm font-semibold text-white">
                Start now
              </Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* HERO SECTION (headline + subtext + CTA) */}
        <View className="mb-10">
          <Text className="text-xs tracking-[2px] font-semibold text-indigo-600 dark:text-indigo-400 mb-3">
            SMART MEDICATION MANAGEMENT
          </Text>

          <Text className="text-4xl font-extrabold text-gray-900 dark:text-white mb-4">
            Build a medication{"\n"}routine you can trust.
          </Text>

          <Text className="text-base text-gray-700 dark:text-gray-300 mb-6">
            Medication Adherence Tracker helps patients remember every dose and
            gives providers a clear, real-time view of adherence — all in one
            secure, easy-to-use app.
          </Text>

          <View className="flex-row items-center mb-8">
            <TouchableOpacity
              onPress={() => router.push("/Register")}
              className="bg-indigo-700 px-6 py-4 rounded-2xl mr-3"
            >
              <Text className="text-white font-semibold text-base">
                Get started – it&apos;s free ✨
              </Text>
            </TouchableOpacity>

            <TouchableOpacity onPress={() => router.push("/login")}>
              <Text className="text-indigo-700 dark:text-indigo-300 font-semibold">
                Already have an account?
              </Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* PREVIEW CARD (FlowCV-style right panel, but centered on mobile) */}
        <View className="mb-12 items-center">
          <View className="w-full max-w-md rounded-3xl bg-white dark:bg-gray-800 shadow-2xl border border-gray-100 dark:border-gray-700 overflow-hidden">
            {/* Card header */}
            <View className="bg-indigo-700 px-5 py-4">
              <Text className="text-white font-semibold text-lg">
                Today&apos;s Medications
              </Text>
              <Text className="text-indigo-100 text-xs mt-1">
                Example patient · 95% adherence
              </Text>
            </View>

            {/* Card body */}
            <View className="px-5 py-5">
              <View className="mb-4">
                <Text className="text-xs font-semibold text-gray-500 dark:text-gray-400 mb-1">
                  8:00 AM
                </Text>
                <View className="flex-row justify-between items-center bg-indigo-50 dark:bg-indigo-900/40 rounded-2xl px-4 py-3">
                  <View>
                    <Text className="text-sm font-semibold text-gray-900 dark:text-white">
                      Metformin 500 mg
                    </Text>
                    <Text className="text-xs text-gray-600 dark:text-gray-300">
                      1 tablet with breakfast
                    </Text>
                  </View>
                  <Text className="text-xs font-semibold text-emerald-600 dark:text-emerald-400">
                    Taken
                  </Text>
                </View>
              </View>

              <View className="mb-4">
                <Text className="text-xs font-semibold text-gray-500 dark:text-gray-400 mb-1">
                  2:00 PM
                </Text>
                <View className="flex-row justify-between items-center bg-gray-50 dark:bg-gray-700 rounded-2xl px-4 py-3">
                  <View>
                    <Text className="text-sm font-semibold text-gray-900 dark:text-white">
                      Lisinopril 10 mg
                    </Text>
                    <Text className="text-xs text-gray-600 dark:text-gray-300">
                      1 tablet after lunch
                    </Text>
                  </View>
                  <Text className="text-xs font-semibold text-amber-500">
                    Upcoming
                  </Text>
                </View>
              </View>

              <View>
                <Text className="text-xs font-semibold text-gray-500 dark:text-gray-400 mb-1">
                  9:00 PM
                </Text>
                <View className="flex-row justify-between items-center bg-gray-50 dark:bg-gray-700 rounded-2xl px-4 py-3">
                  <View>
                    <Text className="text-sm font-semibold text-gray-900 dark:text-white">
                      Atorvastatin 20 mg
                    </Text>
                    <Text className="text-xs text-gray-600 dark:text-gray-300">
                      1 tablet before bed
                    </Text>
                  </View>
                  <Text className="text-xs font-semibold text-red-500">
                    Missed
                  </Text>
                </View>
              </View>
            </View>
          </View>
        </View>

        {/* ABOUT / DETAILS SECTION */}
        <View className="bg-white dark:bg-gray-800 rounded-3xl p-6 mb-8 shadow border border-gray-100 dark:border-gray-700">
          <Text className="text-xl font-semibold text-gray-900 dark:text-white mb-3">
            About the Application
          </Text>
          <Text className="text-gray-700 dark:text-gray-300 mb-2">
            The Medication Adherence Tracker (MAT) is a comprehensive healthcare
            solution designed to improve patient engagement and support clinical
            decision-making.
          </Text>
          <Text className="text-gray-700 dark:text-gray-300 mb-2">
            Patients receive smart reminders, can log doses they&apos;ve taken, and
            view upcoming and past schedules through an intuitive calendar
            interface.
          </Text>
          <Text className="text-gray-700 dark:text-gray-300">
            Providers gain a dedicated portal to monitor adherence trends,
            review dose histories, and intervene early when patients fall behind.
          </Text>
        </View>

        {/* FEATURES GRID */}
        <View className="bg-white dark:bg-gray-800 rounded-3xl p-6 mb-8 shadow border border-gray-100 dark:border-gray-700">
          <Text className="text-xl font-semibold text-gray-900 dark:text-white mb-4">
            Core Capabilities
          </Text>

          {[
            "Customizable medication reminders",
            "Patient logging for taken doses",
            "Calendar view of upcoming & past medications",
            "Provider portal with adherence dashboards",
            "Role-based authentication (admin, provider, patient)",
            "Secure backend and cloud database storage",
            "AI chatbot for medication guidance",
            "Modern UI with dark mode support",
          ].map((feature, idx) => (
            <Text
              key={idx}
              className="text-gray-700 dark:text-gray-300 mb-2"
            >
              • {feature}
            </Text>
          ))}
        </View>

        {/* DEVELOPERS */}
        <View className="bg-white dark:bg-gray-800 rounded-3xl p-6 mb-8 shadow border border-gray-100 dark:border-gray-700">
          <Text className="text-xl font-semibold text-gray-900 dark:text-white mb-3">
            Developed By
          </Text>
          <Text className="text-gray-700 dark:text-gray-300">• Parth Gadekar</Text>
          <Text className="text-gray-700 dark:text-gray-300">• Vaibhav Ganeriwala</Text>
          <Text className="text-gray-700 dark:text-gray-300">• Jared Simonetti</Text>
          <Text className="text-gray-700 dark:text-gray-300">• Daniel Storms</Text>
        </View>

        {/* FOOTER */}
        <View className="mt-4">
          <Text className="text-center text-gray-500 dark:text-gray-400 mb-2">
            © 2025 MAT HealthTech Solutions
          </Text>
          <Text className="text-center text-gray-700 dark:text-gray-300 mb-1">
            📧 support@matapp.com
          </Text>
          <Text className="text-center text-indigo-700 dark:text-indigo-300 mb-1">
            GitHub: github.com/VaibhavGaneriwala/CS555-Team-5-Project
          </Text>
          <TouchableOpacity onPress={() => router.push("/about")}>
            <Text className="text-center text-indigo-600 dark:text-indigo-300 font-semibold mt-2">
              Learn more about the project →
            </Text>
          </TouchableOpacity>
        </View>
      </View>
    </ScrollView>
  );
}
