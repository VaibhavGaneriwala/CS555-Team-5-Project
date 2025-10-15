// __tests__/navigation.test.tsx
import React from "react";
import { render, fireEvent } from "@testing-library/react-native";
import { View, Text, Pressable } from "react-native";

function LoginPage({ onNavigate }: { onNavigate: (route: string) => void }) {
  return (
    <View>
      <Pressable onPress={() => onNavigate("/AdminHome")}>
        <Text>Admin Home</Text>
      </Pressable>
      <Pressable onPress={() => onNavigate("/HealthcareProviderHome")}>
        <Text>Healthcare Provider Home</Text>
      </Pressable>
      <Pressable onPress={() => onNavigate("/PatientHome")}>
        <Text>Patient Home</Text>
      </Pressable>
    </View>
  );
}

describe("LoginPage navigation buttons", () => {
  it("triggers /AdminHome navigation", () => {
    const mockNav = jest.fn();
    const { getByText } = render(<LoginPage onNavigate={mockNav} />);
    fireEvent.press(getByText("Admin Home"));
    expect(mockNav).toHaveBeenCalledWith("/AdminHome");
  });

  it("triggers /HealthcareProviderHome navigation", () => {
    const mockNav = jest.fn();
    const { getByText } = render(<LoginPage onNavigate={mockNav} />);
    fireEvent.press(getByText("Healthcare Provider Home"));
    expect(mockNav).toHaveBeenCalledWith("/HealthcareProviderHome");
  });

  it("triggers /PatientHome navigation", () => {
    const mockNav = jest.fn();
    const { getByText } = render(<LoginPage onNavigate={mockNav} />);
    fireEvent.press(getByText("Patient Home"));
    expect(mockNav).toHaveBeenCalledWith("/PatientHome");
  });
});