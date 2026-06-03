import { Tabs } from "expo-router";
import { Platform, View, Pressable, Text } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import type { BottomTabBarProps } from "@react-navigation/bottom-tabs";

const TABS = [
  { name: "index",   label: "Inicio",   icon: "home"        },
  { name: "mapa",    label: "Iglesias", icon: "location"    },
  { name: "lectura", label: "Lectura",  icon: "book"        },
] as const;

function CustomTabBar({ state, descriptors, navigation }: BottomTabBarProps) {
  return (
    <View
      style={{
        flexDirection:    "row",
        backgroundColor:  "#111111",
        borderTopWidth:   1,
        borderTopColor:   "#2A2A2A",
        paddingTop:       10,
        paddingBottom:    Platform.OS === "ios" ? 28 : 12,
        paddingHorizontal: 8,
      }}
    >
      {state.routes.map((route, index) => {
        const tab = TABS.find((t) => t.name === route.name);
        if (!tab) return null;

        const isFocused = state.index === index;
        const color     = isFocused ? "#FF7D7D" : "#555555";
        const iconName  = isFocused
          ? (tab.icon as any)
          : (`${tab.icon}-outline` as any);

        function onPress() {
          const event = navigation.emit({
            type: "tabPress",
            target: route.key,
            canPreventDefault: true,
          });
          if (!isFocused && !event.defaultPrevented) {
            navigation.navigate(route.name);
          }
        }

        return (
          <Pressable
            key={route.key}
            onPress={onPress}
            style={{ flex: 1, alignItems: "center", gap: 4 }}
            android_ripple={null}
          >
            {/* Pill indicator behind icon when active */}
            <Ionicons name={iconName} size={22} color={color} />

            <Text
              style={{
                fontFamily:    "Inter_500Medium",
                fontSize:      10,
                letterSpacing: 0.3,
                color,
              }}
            >
              {tab.label}
            </Text>
          </Pressable>
        );
      })}
    </View>
  );
}

export default function TabsLayout() {
  return (
    <Tabs
      tabBar={(props) => <CustomTabBar {...props} />}
      screenOptions={{ headerShown: false }}
    >
      <Tabs.Screen name="index"   options={{ title: "Inicio"   }} />
      <Tabs.Screen name="mapa"    options={{ title: "Iglesias" }} />
      <Tabs.Screen name="lectura" options={{ title: "Lectura"  }} />
    </Tabs>
  );
}
