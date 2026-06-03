import React from "react";
import { View, Pressable, StyleProp, ViewStyle } from "react-native";
import { cn } from "@/lib/utils/cn";

type CardProps = {
  children: React.ReactNode;
  onPress?: () => void;
  /** Relleno interno. Por defecto "md" (16px). "none" para contenido que gestiona su propio padding. */
  padding?: "none" | "sm" | "md" | "lg";
  style?: StyleProp<ViewStyle>;
  className?: string;
};

const paddingClasses = {
  none: "",
  sm: "p-3",
  md: "p-4",
  lg: "p-5",
} as const;

const BASE = "bg-fondo-base border border-borde rounded-2xl overflow-hidden";

export function Card({
  children,
  onPress,
  padding = "md",
  style,
  className,
}: CardProps) {
  const classes = cn(BASE, paddingClasses[padding], className);

  if (onPress) {
    return (
      <Pressable
        onPress={onPress}
        style={({ pressed }) => [{ opacity: pressed ? 0.75 : 1 }, style]}
        className={classes}
        android_ripple={{ color: "rgba(255,255,255,0.05)" }}
      >
        {children}
      </Pressable>
    );
  }

  return (
    <View style={style} className={classes}>
      {children}
    </View>
  );
}
