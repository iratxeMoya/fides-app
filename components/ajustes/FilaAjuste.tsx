import { View, Text, Switch, Pressable } from "react-native";
import { Ionicons } from "@expo/vector-icons";

type FilaBase = {
  icono: React.ComponentProps<typeof Ionicons>["name"];
  label: string;
  subtitulo?: string;
  ultimo?: boolean;
  iconColor?: string;
};

type FilaToggle = FilaBase & {
  tipo: "toggle";
  valor: boolean;
  onCambio: (valor: boolean) => void;
  onSubtituloPress?: () => void;
};

type FilaAccion = FilaBase & {
  tipo: "accion";
  valorTexto?: string;
  onPress?: () => void;
};

type Props = FilaToggle | FilaAccion;

export function FilaAjuste(props: Props) {
  const { icono, label, subtitulo, ultimo = false, iconColor = "#555555" } = props;

  const subtituloPresionable =
    props.tipo === "toggle" &&
    props.valor &&
    !!props.onSubtituloPress;

  const contenido = (
    <View
      style={{
        flexDirection: "row",
        alignItems: "center",
        paddingHorizontal: 20,
        paddingVertical: 14,
        gap: 14,
        borderBottomWidth: ultimo ? 0 : 1,
        borderBottomColor: "#2A2A2A",
      }}
    >
      <Ionicons name={icono} size={20} color={iconColor} />

      <View style={{ flex: 1 }}>
        <Text
          style={{
            fontFamily: "Inter_500Medium",
            fontSize: 15,
            color: "#FFFFFF",
          }}
        >
          {label}
        </Text>
        {subtitulo ? (
          subtituloPresionable ? (
            <Pressable
              onPress={(props as FilaToggle).onSubtituloPress}
              style={{ flexDirection: "row", alignItems: "center", gap: 3, marginTop: 3 }}
              android_ripple={null}
            >
              <Text
                style={{
                  fontFamily: "Inter_400Regular",
                  fontSize: 12,
                  color: "#FF7D7D",
                }}
              >
                {subtitulo}
              </Text>
              <Ionicons name="chevron-forward" size={10} color="#FF7D7D" />
            </Pressable>
          ) : (
            <Text
              style={{
                fontFamily: "Inter_400Regular",
                fontSize: 12,
                color: "#555555",
                marginTop: 3,
              }}
            >
              {subtitulo}
            </Text>
          )
        ) : null}
      </View>

      {props.tipo === "toggle" ? (
        <Switch
          value={props.valor}
          onValueChange={props.onCambio}
          trackColor={{ false: "#2A2A2A", true: "#FF7D7D" }}
          thumbColor="#FFFFFF"
          ios_backgroundColor="#2A2A2A"
        />
      ) : (
        <View style={{ flexDirection: "row", alignItems: "center", gap: 6 }}>
          {props.valorTexto ? (
            <Text
              style={{
                fontFamily: "Inter_400Regular",
                fontSize: 14,
                color: "#555555",
              }}
            >
              {props.valorTexto}
            </Text>
          ) : null}
          <Ionicons name="chevron-forward" size={16} color="#555555" />
        </View>
      )}
    </View>
  );

  if (props.tipo === "accion" && props.onPress) {
    return (
      <Pressable onPress={props.onPress} android_ripple={null}>
        {contenido}
      </Pressable>
    );
  }

  return contenido;
}
