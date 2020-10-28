import React, { createContext, useCallback, useContext, useState } from "react";
import uid from "uid";

export interface PlayerSettings {
  uid: string;
  name: string;
}

interface PlayerSettingsContextType {
  settings: PlayerSettings;
  updateSettings: (partial: Partial<Omit<PlayerSettings, "uid">>) => void;
}

const PlayerSettingsContext = createContext<PlayerSettingsContextType>({
  settings: {
    uid: "fake-uid",
    name: "Player",
  },
  updateSettings: () => null,
});

export function usePlayerSettings() {
  return useContext(PlayerSettingsContext);
}

interface PlayerSettingsProviderProps {
  children: React.ReactNode;
}

export function PlayerSettingsProvider({
  children,
}: PlayerSettingsProviderProps) {
  // TODO: persist settings
  const [settings, setSettings] = useState<PlayerSettings>(() => {
    const playerUid = uid(4);

    return {
      name: `Player${playerUid}`,
      uid: playerUid,
    };
  });

  const updateSettings: PlayerSettingsContextType["updateSettings"] = useCallback(
    (partial) => {
      setSettings((current) => ({ ...current, ...partial }));
    },
    []
  );

  return (
    <PlayerSettingsContext.Provider value={{ settings, updateSettings }}>
      {children}
    </PlayerSettingsContext.Provider>
  );
}
