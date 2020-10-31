import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useState,
} from "react";
import uid from "uid";

export interface PlayerSettings {
  uid: string;
  name: string;
}

interface PlayerSettingsContextType {
  settings: PlayerSettings;
  updateSettings: (partial: Partial<Omit<PlayerSettings, "uid">>) => void;
  resetUid: () => void;
}

const PlayerSettingsContext = createContext<PlayerSettingsContextType>({
  settings: {
    uid: "fake-uid",
    name: "Player",
  },
  updateSettings: () => null,
  resetUid: () => null,
});

export function usePlayerSettings() {
  return useContext(PlayerSettingsContext);
}

interface PlayerSettingsProviderProps {
  children: React.ReactNode;
}

const UID_LENGTH = 10;

function createUid() {
  return uid(UID_LENGTH).replaceAll("O", "0").toUpperCase();
}

const LS_SETTINGS_KEY = `card-battle::player-settings`;

export function PlayerSettingsProvider({
  children,
}: PlayerSettingsProviderProps) {
  // TODO: persist settings
  const [settings, setSettings] = useState<PlayerSettings>(() => {
    const persistedSettings = localStorage.getItem(LS_SETTINGS_KEY);

    if (persistedSettings) {
      return JSON.parse(persistedSettings);
    }

    const playerUid = createUid();

    return {
      name: `Player${playerUid.slice(0, 4)}`,
      uid: playerUid,
    };
  });

  useEffect(() => {
    localStorage.setItem(LS_SETTINGS_KEY, JSON.stringify(settings));
  }, [settings]);

  const updateSettings: PlayerSettingsContextType["updateSettings"] = useCallback(
    (partial) => {
      setSettings((current) => ({ ...current, ...partial }));
    },
    []
  );

  const resetUid = useCallback(() => {
    setSettings((current) => ({ ...current, uid: createUid() }));
  }, []);

  return (
    <PlayerSettingsContext.Provider
      value={{ settings, updateSettings, resetUid }}
    >
      {children}
    </PlayerSettingsContext.Provider>
  );
}
