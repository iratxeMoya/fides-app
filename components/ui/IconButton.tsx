import React from "react";
import { Pressable, StyleProp, ViewStyle } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { cn } from "@/lib/utils/cn";

type IconoIonicons = React.ComponentProps<typeof Ionicons>["name"];

type IconButtonProps = {
  icono: IconoIonicons;
  onPress: () => void;
  /** "default": fondo transparente. "filled": fondo elevado. "accent": fondo con tono acento. */
  variant?: "default" | "filled" | "accent";
  /** Tamaño del icono. Por defecto 22. */
  tamanoIcono?: number;
  /** Color del icono. Por defecto hereda del variant. */
  colorIcono?: string;
  /** Tamaño del botón circular (ancho = alto). Por defecto 40. */
  tamano?: number;
  disabled?: boolean;
  style?: StyleProp<ViewStyle>;
  className?: string;
};

const variantClasses: Record<"default" | "filled" | "accent", string> = {
  default: "bg-transparent",
  filled: "bg-fondo-elevado border border-borde",
  accent: "bg-acento",
};

const variantIconColor: Record<"default" | "filled" | "accent", string> = {
  default: "#A0A0A0",
  filled: "#A0A0A0",
  accent: "#FFFFFF",
};

export function IconButton({
  icono,
  onPress,
  variant = "default",
  tamanoIcono = 22,
  colorIcono,
  tamano = 40,
  disabled = false,
  style,
  className,
}: IconButtonProps) {
  const iconColor = colorIcono ?? variantIconColor[variant];

  return (
    <Pressable
      onPress={onPress}
      disabled={disabled}
      style={({ pressed }) => [
        {
          width: tamano,
          height: tamano,
          borderRadius: tamano / 2,
          opacity: pressed || disabled ? 0.55 : 1,
        },
        style,
      ]}
      className={cn(
        "items-center justify-center",
        variantClasses[variant],
        className
      )}
      hitSlop={6}
    >
      <Ionicons name={icono} size={tamanoIcono} color={iconColor} />
    </Pressable>
  );
}
