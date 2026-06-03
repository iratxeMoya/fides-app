import React from "react";
import { View, Text, Pressable, StyleProp, ViewStyle } from "react-native";
import { cn } from "@/lib/utils/cn";

type SectionHeaderProps = {
  titulo: string;
  /** Subtítulo en Inter, uppercase, debajo del título */
  subtitulo?: string;
  /** Acción secundaria alineada a la derecha */
  accion?: {
    etiqueta: string;
    onPress: () => void;
  };
  style?: StyleProp<ViewStyle>;
  className?: string;
};

export function SectionHeader({
  titulo,
  subtitulo,
  accion,
  style,
  className,
}: SectionHeaderProps) {
  return (
    <View
      style={style}
      className={cn("flex-row items-center justify-between", className)}
    >
      {/* Barra decorativa + texto */}
      <View className="border-l-2 border-acento pl-3 flex-1 mr-4">
        <Text className="text-2xl font-cormorant-semibold leading-tight" style={{ color: "#FFFFFF" }}>
          {titulo}
        </Text>
        {subtitulo ? (
          <Text className="text-[11px] font-inter-medium tracking-widest uppercase mt-0.5" style={{ color: "#888888" }}>
            {subtitulo}
          </Text>
        ) : null}
      </View>

      {/* Acción opcional */}
      {accion ? (
        <Pressable
          onPress={accion.onPress}
          style={({ pressed }) => [{ opacity: pressed ? 0.6 : 1 }]}
          hitSlop={8}
        >
          <Text className="text-sm font-inter-medium" style={{ color: "#FF7D7D" }}>
            {accion.etiqueta}
          </Text>
        </Pressable>
      ) : null}
    </View>
  );
}
