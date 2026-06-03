import React, { useEffect, useRef } from "react";
import { Animated, Easing, View, StyleProp, ViewStyle } from "react-native";

// ─── Hook de pulso ────────────────────────────────────────────────────────────

function usePulsarAnim(): Animated.Value {
  const opacidad = useRef(new Animated.Value(0.6)).current;

  useEffect(() => {
    const anim = Animated.loop(
      Animated.sequence([
        Animated.timing(opacidad, {
          toValue:         1.0,
          duration:        900,
          easing:          Easing.inOut(Easing.ease),
          useNativeDriver: true,
        }),
        Animated.timing(opacidad, {
          toValue:         0.6,
          duration:        900,
          easing:          Easing.inOut(Easing.ease),
          useNativeDriver: true,
        }),
      ])
    );
    anim.start();
    return () => anim.stop();
  }, [opacidad]);

  return opacidad;
}

// ─── SkeletonLine ─────────────────────────────────────────────────────────────

type SkeletonLineProps = {
  width?: number | `${number}%`;
  height?: number;
  style?: StyleProp<ViewStyle>;
};

export function SkeletonLine({ width = "100%", height = 14, style }: SkeletonLineProps) {
  const opacidad = usePulsarAnim();
  return (
    <Animated.View
      style={[
        {
          width,
          height,
          borderRadius: 6,
          backgroundColor: "#2C2C2C",
          opacity: opacidad,
        },
        style,
      ]}
    />
  );
}

// ─── SkeletonCard ─────────────────────────────────────────────────────────────

type SkeletonCardProps = {
  style?: StyleProp<ViewStyle>;
};

/** Esqueleto genérico con dos líneas de título y una de subtítulo */
export function SkeletonCard({ style }: SkeletonCardProps) {
  return (
    <View
      style={[
        {
          backgroundColor: "#111111",
          borderWidth:      1,
          borderColor:      "#2A2A2A",
          borderRadius:     16,
          padding:          16,
        },
        style,
      ]}
    >
      <SkeletonLine width="55%" height={12} />
      <SkeletonLine width="80%" height={18} style={{ marginTop: 10 }} />
      <SkeletonLine width="65%" height={14} style={{ marginTop: 6 }} />
      <SkeletonLine width="40%" height={12} style={{ marginTop: 16 }} />
    </View>
  );
}

// ─── SkeletonIglesia ──────────────────────────────────────────────────────────

/** Esqueleto específico para la card de iglesia cercana */
export function SkeletonIglesia() {
  return (
    <View
      style={{
        backgroundColor: "#111111",
        borderWidth:      1,
        borderColor:      "#2A2A2A",
        borderRadius:     16,
        padding:          16,
      }}
    >
      <SkeletonLine width="35%" height={11} />
      <SkeletonLine width="70%" height={20} style={{ marginTop: 8 }} />
      <SkeletonLine width="45%" height={13} style={{ marginTop: 6 }} />
      <View style={{ flexDirection: "row", marginTop: 20, gap: 12 }}>
        <SkeletonLine width="30%" height={13} />
        <SkeletonLine width="25%" height={13} />
      </View>
    </View>
  );
}
