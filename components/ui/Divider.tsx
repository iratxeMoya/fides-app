import React from "react";
import { View, StyleProp, ViewStyle } from "react-native";
import { cn } from "@/lib/utils/cn";

type DividerProps = {
  /** "horizontal" (por defecto) o "vertical" */
  orientation?: "horizontal" | "vertical";
  style?: StyleProp<ViewStyle>;
  className?: string;
};

export function Divider({
  orientation = "horizontal",
  style,
  className,
}: DividerProps) {
  return (
    <View
      style={style}
      className={cn(
        "bg-fondo-elevado",
        orientation === "horizontal" ? "h-px w-full my-3" : "w-px h-full mx-3",
        className
      )}
    />
  );
}
