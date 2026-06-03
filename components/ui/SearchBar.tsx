import React, { useState } from "react";
import {
  View,
  TextInput,
  Pressable,
  StyleProp,
  ViewStyle,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";

type SearchBarProps = {
  value: string;
  onChangeText: (texto: string) => void;
  placeholder?: string;
  onClear?: () => void;
  onSubmit?: () => void;
  autoFocus?: boolean;
  style?: StyleProp<ViewStyle>;
};

export function SearchBar({
  value,
  onChangeText,
  placeholder = "Buscar parroquia...",
  onClear,
  onSubmit,
  autoFocus = false,
  style,
}: SearchBarProps) {
  const [focused, setFocused] = useState(false);

  function handleClear() {
    onChangeText("");
    onClear?.();
  }

  return (
    <View
      style={[
        {
          flexDirection:   "row",
          alignItems:      "center",
          height:          56,
          paddingHorizontal: 16,
          borderRadius:    12,
          backgroundColor: "#111111",
          borderWidth:     1,
          borderColor:     focused ? "#FF7D7D" : "#2A2A2A",
        },
        style,
      ]}
    >
      <Ionicons
        name="search-outline"
        size={18}
        color={focused ? "#FF7D7D" : "#666666"}
      />

      <TextInput
        value={value}
        onChangeText={onChangeText}
        placeholder={placeholder}
        placeholderTextColor="#555555"
        autoFocus={autoFocus}
        returnKeyType="search"
        onSubmitEditing={onSubmit}
        onFocus={() => setFocused(true)}
        onBlur={() => setFocused(false)}
        style={{
          flex:          1,
          marginLeft:    12,
          paddingVertical: 0,
          fontFamily:    "Inter_400Regular",
          fontSize:      14,
          color:         "#FFFFFF",
        }}
      />

      {value.length > 0 ? (
        <Pressable
          onPress={handleClear}
          hitSlop={8}
          style={({ pressed }) => [{ opacity: pressed ? 0.6 : 1, marginLeft: 8 }]}
        >
          <Ionicons name="close-circle" size={18} color="#555555" />
        </Pressable>
      ) : null}
    </View>
  );
}
