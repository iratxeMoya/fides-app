import React from "react";
import { View, Text, StyleProp, ViewStyle } from "react-native";
import { cn } from "@/lib/utils/cn";

export type BadgeVariant = "warning" | "neutral" | "success";

type BadgeProps = {
  label: string;
  variant?: BadgeVariant;
  size?: "sm" | "md";
  style?: StyleProp<ViewStyle>;
  className?: string;
};

// Los estilos de fondo con opacidad se aplican inline para garantizar
// compatibilidad entre plataformas con rgba.
const bgStyle: Record<BadgeVariant, { backgroundColor: string }> = {
  warning: { backgroundColor: "rgba(255, 125, 125, 0.15)" },
  neutral: { backgroundColor: "rgba(255, 255, 255, 0.06)" },
  success: { backgroundColor: "rgba(134, 239, 172, 0.12)" },
};

const textClass: Record<BadgeVariant, string> = {
  warning: "",
  neutral: "",
  success: "text-green-400",
};

const textColor: Record<BadgeVariant, string | undefined> = {
  warning: "#FF7D7D",
  neutral: "#888888",
  success: undefined,
};

const sizeContainer: Record<"sm" | "md", string> = {
  sm: "px-2 py-0.5",
  md: "px-3 py-1",
};

const sizeText: Record<"sm" | "md", string> = {
  sm: "text-[10px]",
  md: "text-xs",
};

export function Badge({
  label,
  variant = "neutral",
  size = "md",
  style,
  className,
}: BadgeProps) {
  return (
    <View
      style={[bgStyle[variant], style]}
      className={cn(
        "rounded-full self-start items-center justify-center",
        sizeContainer[size],
        className
      )}
    >
      <Text
        className={cn(
          "font-inter-medium tracking-widest uppercase",
          textClass[variant],
          sizeText[size]
        )}
        style={textColor[variant] ? { color: textColor[variant] } : undefined}
      >
        {label}
      </Text>
    </View>
  );
}
