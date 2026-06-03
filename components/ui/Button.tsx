import React from "react";
import {
  Pressable,
  Text,
  ActivityIndicator,
  StyleProp,
  ViewStyle,
  View,
} from "react-native";
import { cn } from "@/lib/utils/cn";

export type ButtonVariant = "primary" | "ghost" | "text";
export type ButtonSize = "sm" | "md" | "lg";

type ButtonProps = {
  label: string;
  onPress: () => void;
  variant?: ButtonVariant;
  size?: ButtonSize;
  disabled?: boolean;
  loading?: boolean;
  /** Icono a la izquierda del texto */
  leftIcon?: React.ReactNode;
  style?: StyleProp<ViewStyle>;
  className?: string;
};

const containerVariant: Record<ButtonVariant, string> = {
  primary: "bg-acento rounded-xl items-center justify-center flex-row",
  ghost:
    "bg-transparent border border-borde rounded-xl items-center justify-center flex-row",
  text: "bg-transparent items-center justify-center flex-row",
};

const textVariant: Record<ButtonVariant, string> = {
  primary: "text-white font-inter-semibold",
  ghost: "font-inter-medium",
  text: "font-inter-medium",
};

const textColor: Record<ButtonVariant, string> = {
  primary: "#FFFFFF",
  ghost: "#FFFFFF",
  text: "#C0C0C0",
};

const containerSize: Record<ButtonSize, string> = {
  sm: "py-2 px-4 gap-1.5",
  md: "py-3 px-6 gap-2",
  lg: "py-4 px-8 gap-2",
};

const textSize: Record<ButtonSize, string> = {
  sm: "text-sm",
  md: "text-base",
  lg: "text-lg",
};

export function Button({
  label,
  onPress,
  variant = "primary",
  size = "md",
  disabled = false,
  loading = false,
  leftIcon,
  style,
  className,
}: ButtonProps) {
  return (
    <Pressable
      onPress={onPress}
      disabled={disabled || loading}
      style={({ pressed }) => [
        { opacity: pressed || disabled ? 0.55 : 1 },
        style,
      ]}
      className={cn(containerVariant[variant], containerSize[size], className)}
    >
      {loading ? (
        <ActivityIndicator
          size="small"
          color={variant === "primary" ? "#FFFFFF" : "#FF7D7D"}
        />
      ) : (
        <>
          {leftIcon && <View>{leftIcon}</View>}
          <Text
            className={cn(textVariant[variant], textSize[size])}
            style={{ color: textColor[variant] }}
          >
            {label}
          </Text>
        </>
      )}
    </Pressable>
  );
}
