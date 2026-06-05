import { View, Text } from "react-native";

type Props = {
  titulo: string;
  children: React.ReactNode;
};

export function SeccionAjuste({ titulo, children }: Props) {
  return (
    <View style={{ marginTop: 32 }}>
      <Text
        style={{
          fontFamily: "Inter_500Medium",
          fontSize: 11,
          letterSpacing: 1.2,
          color: "#FF7D7D",
          textTransform: "uppercase",
          marginBottom: 12,
          paddingHorizontal: 20,
        }}
      >
        {titulo}
      </Text>
      <View
        style={{
          backgroundColor: "#111111",
          borderTopWidth: 1,
          borderBottomWidth: 1,
          borderColor: "#2A2A2A",
        }}
      >
        {children}
      </View>
    </View>
  );
}
