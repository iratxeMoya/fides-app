import { View, Text } from "react-native";
import { useLocalSearchParams } from "expo-router";
import { SafeAreaView } from "react-native-safe-area-context";

export default function IglesiaDetalleScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();

  return (
    <SafeAreaView className="flex-1 bg-fondo-profundo" edges={["bottom"]}>
      <View className="flex-1 p-4">
        <Text className="text-lg" style={{ color: "#FFFFFF" }}>Parroquia</Text>
        <Text className="text-sm mt-1" style={{ color: "#888888" }}>id: {id}</Text>
      </View>
    </SafeAreaView>
  );
}
