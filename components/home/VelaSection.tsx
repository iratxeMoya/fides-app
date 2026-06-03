import React, { useCallback, useRef, useState } from "react";
import { View, Text, Pressable, Share } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { BottomSheetModal, BottomSheetView } from "@gorhom/bottom-sheet";

import { BIZUM_NUMERO } from "@/constants/donacion";

export function VelaSection() {
  const sheetRef = useRef<BottomSheetModal>(null);
  const [copiado, setCopiado] = useState(false);

  const abrirSheet = useCallback(() => {
    sheetRef.current?.present();
  }, []);

  const copiarNumero = useCallback(async () => {
    await Share.share({ message: BIZUM_NUMERO });
    setCopiado(true);
    setTimeout(() => setCopiado(false), 2000);
  }, []);

  return (
    <>
      {/* ── Bloque visible en home ── */}
      <View
        style={{
          borderTopWidth: 1,
          borderTopColor: "#1A1A1A",
          paddingTop: 20,
          alignItems: "center",
        }}
      >
        <Ionicons name="flame-outline" size={22} color="#FF7D7D" style={{ marginBottom: 8 }} />

        <Text
          style={{
            fontFamily: "CormorantGaramond_600SemiBold",
            fontSize:   18,
            color:      "#FFFFFF",
            marginBottom: 6,
          }}
        >
          Enciende una vela
        </Text>

        <Text
          style={{
            fontFamily:  "Inter_400Regular",
            fontSize:    13,
            color:       "#666666",
            textAlign:   "center",
            lineHeight:  19,
            marginBottom: 16,
          }}
        >
          Si Fides te es útil y te ayuda, puedes contribuir{"\n"}
          con lo que quieras — es voluntario y se agradece.{"\n"}
          Las contribuciones se destinan exclusivamente{"\n"}
          al mantenimiento de la app.
        </Text>

        <Pressable
          onPress={abrirSheet}
          style={{
            borderWidth:   1,
            borderColor:   "rgba(255,125,125,0.3)",
            backgroundColor: "rgba(255,125,125,0.08)",
            borderRadius:  20,
            paddingVertical:   8,
            paddingHorizontal: 20,
            flexDirection: "row",
            alignItems:    "center",
            gap:           6,
          }}
        >
          <Ionicons name="flame-outline" size={14} color="#FF7D7D" />
          <Text
            style={{
              fontFamily: "Inter_500Medium",
              fontSize:   13,
              color:      "#FF7D7D",
              flexShrink: 0,
            }}
          >
            Encender una vela
          </Text>
        </Pressable>
      </View>

      {/* ── Bottom Sheet ── */}
      <BottomSheetModal
        ref={sheetRef}
        snapPoints={["55%"]}
        enablePanDownToClose
        backgroundStyle={{
          backgroundColor:      "#111111",
          borderTopLeftRadius:  20,
          borderTopRightRadius: 20,
        }}
        handleIndicatorStyle={{ backgroundColor: "#444444" }}
        style={{
          shadowColor:   "#000",
          shadowOffset:  { width: 0, height: -4 },
          shadowOpacity: 0.5,
          shadowRadius:  10,
          elevation:     10,
        }}
      >
        <BottomSheetView
          style={{
            flex:            1,
            alignItems:      "center",
            paddingHorizontal: 28,
            paddingTop:      20,
            paddingBottom:   32,
          }}
        >
          <Ionicons name="flame-outline" size={32} color="#FF7D7D" style={{ marginBottom: 12 }} />

          <Text
            style={{
              fontFamily:   "CormorantGaramond_600SemiBold",
              fontSize:     22,
              color:        "#FFFFFF",
              marginBottom: 12,
            }}
          >
            Enciende una vela
          </Text>

          <Text
            style={{
              fontFamily: "Inter_400Regular",
              fontSize:   14,
              color:      "#888888",
              textAlign:  "center",
              lineHeight: 21,
              marginBottom: 24,
            }}
          >
            Si Fides te es útil y te ayuda, puedes contribuir con lo que quieras
            — es voluntario y se agradece. Las contribuciones se destinan
            exclusivamente al mantenimiento de la app.
          </Text>

          <Text
            style={{
              fontFamily:   "Inter_600SemiBold",
              fontSize:     22,
              color:        "#FFFFFF",
              marginBottom: 16,
              letterSpacing: 1,
            }}
          >
            {BIZUM_NUMERO}
          </Text>

          <Pressable
            onPress={copiarNumero}
            style={{
              backgroundColor: copiado ? "rgba(255,125,125,0.15)" : "rgba(255,255,255,0.06)",
              borderWidth:     1,
              borderColor:     copiado ? "rgba(255,125,125,0.4)" : "rgba(255,255,255,0.1)",
              borderRadius:    10,
              paddingVertical:   10,
              paddingHorizontal: 24,
              marginBottom:    16,
            }}
          >
            <Text
              style={{
                fontFamily: "Inter_500Medium",
                fontSize:   14,
                color:      copiado ? "#FF7D7D" : "#FFFFFF",
              }}
            >
              {copiado ? "¡Copiado!" : "Copiar número"}
            </Text>
          </Pressable>

          <Text
            style={{
              fontFamily: "Inter_400Regular",
              fontSize:   13,
              color:      "#666666",
              textAlign:  "center",
              marginBottom: 12,
            }}
          >
            Abre tu app bancaria → Bizum → pega este número
          </Text>

          <Text
            style={{
              fontFamily: "Inter_400Regular",
              fontSize:   11,
              color:      "#444444",
            }}
          >
            Importe libre · Sin comisiones
          </Text>
        </BottomSheetView>
      </BottomSheetModal>
    </>
  );
}
