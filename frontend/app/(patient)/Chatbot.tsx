import React, { useState, useRef, useEffect } from "react";
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  ScrollView,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  LayoutAnimation,
  UIManager,
  Appearance,
} from "react-native";
import Constants from "expo-constants";
import { router } from "expo-router";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { Swipeable } from "react-native-gesture-handler";
import * as Clipboard from "expo-clipboard";
import Markdown from "react-native-markdown-display";
import { useColorScheme } from "nativewind";

// -------------------------
// TYPES
// -------------------------
type Sender = "user" | "bot";

interface ChatMessage {
  sender: Sender;
  text: string;
}

const API_URL =
  Constants.expoConfig?.extra?.API_URL ?? "http://localhost:3000";

const STORAGE_KEY = "medassist_chat_messages";

// -------------------------
// MAIN COMPONENT
// -------------------------
export default function Chatbot() {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState<string>("");
  const [loading, setLoading] = useState<boolean>(false);
  const [isListening, setIsListening] = useState<boolean>(false);

  const scrollRef = useRef<ScrollView | null>(null);

  // THEME STATE
  const { colorScheme } = useColorScheme();
  const isDarkMode = colorScheme === "dark";

  // Enable LayoutAnimation on Android
  useEffect(() => {
    if (
      Platform.OS === "android" &&
      UIManager.setLayoutAnimationEnabledExperimental
    ) {
      UIManager.setLayoutAnimationEnabledExperimental(true);
    }
  }, []);

  // Load chat history on mount
  useEffect(() => {
    const loadMessages = async () => {
      try {
        const stored = await AsyncStorage.getItem(STORAGE_KEY);
        if (stored) {
          const parsed: ChatMessage[] = JSON.parse(stored);
          setMessages(parsed);
        }
      } catch (err) {
        console.error("⚠️ Failed to load chat history:", err);
      }
    };
    loadMessages();
  }, []);

  // Persist chat history whenever it changes
  useEffect(() => {
    if (messages.length === 0) return;

    const saveMessages = async () => {
      try {
        await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(messages));
      } catch (err) {
        console.error("⚠️ Failed to save chat history:", err);
      }
    };

    saveMessages();
  }, [messages]);

  // HELPERS ---------------------------------------------------

  const handleCopy = async (text: string) => {
    try {
      await Clipboard.setStringAsync(text);
    } catch (err) {
    }
  };

  const renderRightActions = (msg: ChatMessage) => (
    <TouchableOpacity
      className="bg-indigo-500 justify-center px-4 rounded-xl ml-2"
      onPress={() => handleCopy(msg.text)}
    >
      <Text className="text-white font-semibold">Copy</Text>
    </TouchableOpacity>
  );

  const handleVoiceInput = () => {
    setIsListening((prev) => !prev);
  };

  // SEND MESSAGE -----------------------------------------------
  const sendMessage = async () => {
    if (!input.trim() || loading) return;

    LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);

    const userMsg: ChatMessage = {
      sender: "user",
      text: input,
    };
    setMessages((prev) => [...prev, userMsg]);

    const textToSend = input;
    setInput("");
    setLoading(true);

    try {
      const token = await AsyncStorage.getItem("token");

      const res = await fetch(`${API_URL}/api/chat`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: token ? `Bearer ${token}` : "",
        },
        body: JSON.stringify({ message: textToSend }),
      });

      const data = await res.json();

      const botMsg: ChatMessage = {
        sender: "bot",
        text:
          res.status === 200
            ? data.reply
            : data.error ||
              "Sorry, I couldn't process that. Please try again.",
      };

      setMessages((prev) => [...prev, botMsg]);
    } catch (err) {
      console.error("⚠️ Chat error:", err);

      const errorMsg: ChatMessage = {
        sender: "bot",
        text: "Something went wrong connecting to the server.",
      };

      setMessages((prev) => [...prev, errorMsg]);
    }

    setLoading(false);

    setTimeout(() => {
      scrollRef.current?.scrollToEnd({ animated: true });
    }, 100);
  };

  // UI ---------------------------------------------------------
  return (
    <KeyboardAvoidingView
      className="flex-1 bg-black/60"
      behavior={Platform.OS === "ios" ? "padding" : undefined}
    >
      <View className="flex-1 justify-center items-center">
        <View className="w-[92%] max-w-2xl h-[80%] rounded-3xl bg-white dark:bg-gray-900 shadow-2xl overflow-hidden">

          {/* HEADER */}
          <View className="px-4 py-3 border-b border-gray-200 dark:border-gray-700 flex-row items-center justify-between bg-blue-600 dark:bg-blue-700">
            <View>
              <Text className="text-xs text-blue-100">Chat with</Text>
              <Text className="text-xl font-bold text-white">MedAssist AI</Text>
            </View>

            <TouchableOpacity onPress={() => router.back()}>
              <Text className="text-2xl text-white">×</Text>
            </TouchableOpacity>
          </View>

          {/* MESSAGES */}
          <ScrollView
            className="flex-1"
            contentContainerStyle={{ padding: 16 }}
            ref={scrollRef}
            onContentSizeChange={() =>
              scrollRef.current?.scrollToEnd({ animated: true })
            }
          >
            {messages.map((msg, index) => {
              return (
                <Swipeable
                  key={index}
                  renderRightActions={() => renderRightActions(msg)}
                >
                  <View
                    className={`max-w-[80%] p-3 rounded-2xl my-2 ${
                      msg.sender === "user"
                        ? "self-end bg-blue-600"
                        : "self-start bg-gray-200 dark:bg-gray-700"
                    }`}
                  >
                    <Markdown
                      style={{
                        body: {
                          color:
                            msg.sender === "user"
                              ? "#FFFFFF"
                              : isDarkMode
                                ? "#F9FAFB"
                                : "#111827",
                          fontSize: 16,
                        },
                      }}
                    >
                      {msg.text}
                    </Markdown>
                  </View>
                </Swipeable>
              );
            })}

            {loading && (
              <View className="mt-2">
                <View className="self-start bg-gray-300 dark:bg-gray-700 rounded-xl p-3 my-1 w-16 flex-row items-center justify-center">
                  <ActivityIndicator size="small" />
                </View>
                <Text className="text-gray-500 dark:text-gray-400 ml-1">
                  MedAssist AI is typing…
                </Text>
              </View>
            )}
          </ScrollView>

          {/* INPUT BAR */}
          <View className="flex-row items-center px-3 py-2 border-t border-gray-200 dark:border-gray-700 bg-gray-100 dark:bg-gray-800">

            <TouchableOpacity
              onPress={handleVoiceInput}
              className={`mr-2 p-3 rounded-full ${
                isListening ? "bg-red-500" : "bg-gray-500"
              }`}
            >
              <Text className="text-white text-lg">
                {isListening ? "●" : "🎤"}
              </Text>
            </TouchableOpacity>

            <TextInput
              className="flex-1 bg-white dark:bg-gray-700 text-black dark:text-white px-3 py-2 rounded-xl border border-gray-300 dark:border-gray-600"
              placeholder="Ask me anything..."
              placeholderTextColor={isDarkMode ? "#9CA3AF" : "#6B7280"}
              value={input}
              onChangeText={setInput}
            />

            <TouchableOpacity
              onPress={sendMessage}
              disabled={loading}
              className={`ml-2 px-4 py-3 rounded-full ${
                loading ? "bg-gray-400" : "bg-blue-600"
              }`}
            >
              <Text className="text-white font-semibold text-base">➤</Text>
            </TouchableOpacity>

          </View>
        </View>
      </View>
    </KeyboardAvoidingView>
  );
}
