import { View, Text, Pressable, Linking, ScrollView } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useRouter } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import Constants from "expo-constants";

const EMAIL = "iratxe.moya@gmail.com";
const VERSION = Constants.expoConfig?.version ?? "—";

export default function AcercaDeScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();

  return (
    <View style={{ flex: 1, backgroundColor: "#0A0A0A" }}>
      <ScrollView
        style={{ flex: 1 }}
        contentContainerStyle={{
          paddingTop: insets.top + 20,
          paddingBottom: insets.bottom + 32,
          paddingHorizontal: 20,
        }}
      >
        {/* Botón volver */}
        <Pressable
          onPress={() => router.back()}
          style={{ flexDirection: "row", alignItems: "center", gap: 6, marginBottom: 32 }}
          android_ripple={null}
        >
          <Ionicons name="chevron-back" size={18} color="#FF7D7D" />
          <Text
            style={{
              fontFamily: "Inter_500Medium",
              fontSize: 14,
              color: "#FF7D7D",
              letterSpacing: 0.3,
            }}
          >
            Ajustes
          </Text>
        </Pressable>

        {/* Título */}
        <Text
          style={{
            fontFamily: "CormorantGaramond_300Light_Italic",
            fontSize: 52,
            letterSpacing: 6,
            color: "#FFFFFF",
            lineHeight: 56,
          }}
        >
          FIDES
        </Text>
        <Text
          style={{
            fontFamily: "Inter_500Medium",
            fontSize: 11,
            letterSpacing: 1.5,
            color: "#888888",
            textTransform: "uppercase",
            marginTop: 4,
            marginBottom: 40,
          }}
        >
          Acerca de
        </Text>

        {/* Card desarrolladora */}
        <View
          style={{
            backgroundColor: "#111111",
            borderWidth: 1,
            borderColor: "#2A2A2A",
            borderRadius: 16,
            padding: 20,
            marginBottom: 16,
          }}
        >
          <View style={{ flexDirection: "row", alignItems: "center", gap: 12, marginBottom: 14 }}>
            <View
              style={{
                width: 40,
                height: 40,
                borderRadius: 20,
                backgroundColor: "#FF7D7D1A",
                borderWidth: 1,
                borderColor: "#FF7D7D33",
                alignItems: "center",
                justifyContent: "center",
              }}
            >
              <Ionicons name="person" size={18} color="#FF7D7D" />
            </View>
            <View>
              <Text
                style={{
                  fontFamily: "Inter_600SemiBold",
                  fontSize: 15,
                  color: "#FFFFFF",
                }}
              >
                Iratxe Moya
              </Text>
              <Text
                style={{
                  fontFamily: "Inter_400Regular",
                  fontSize: 12,
                  color: "#555555",
                  marginTop: 2,
                }}
              >
                Desarrolladora
              </Text>
            </View>
          </View>

          <View
            style={{
              height: 1,
              backgroundColor: "#2A2A2A",
              marginBottom: 14,
            }}
          />

          <Pressable
            onPress={() => Linking.openURL(`mailto:${EMAIL}`)}
            style={{ flexDirection: "row", alignItems: "center", gap: 10 }}
            android_ripple={null}
          >
            <Ionicons name="mail-outline" size={16} color="#FF7D7D" />
            <Text
              style={{
                fontFamily: "Inter_400Regular",
                fontSize: 14,
                color: "#FF7D7D",
                textDecorationLine: "underline",
              }}
            >
              {EMAIL}
            </Text>
          </Pressable>
        </View>

        {/* Card sugerencias */}
        <View
          style={{
            backgroundColor: "#111111",
            borderWidth: 1,
            borderColor: "#2A2A2A",
            borderRadius: 16,
            padding: 20,
            marginBottom: 32,
          }}
        >
          <Text
            style={{
              fontFamily: "CormorantGaramond_400Regular_Italic",
              fontSize: 18,
              color: "#FFFFFF",
              lineHeight: 26,
              marginBottom: 10,
            }}
          >
            "¿Tienes alguna idea o sugerencia?"
          </Text>
          <Text
            style={{
              fontFamily: "Inter_400Regular",
              fontSize: 14,
              color: "#888888",
              lineHeight: 22,
            }}
          >
            Fides está en constante mejora. Si echas en falta algo, encuentras un fallo o simplemente quieres compartir cómo la usas, escríbeme. Leo todos los mensajes.
          </Text>
        </View>

        {/* Versión */}
        <Text
          style={{
            fontFamily: "Inter_400Regular",
            fontSize: 12,
            color: "#333333",
            textAlign: "center",
            letterSpacing: 0.5,
          }}
        >
          Fides · v{VERSION}
        </Text>
      </ScrollView>
    </View>
  );
}
