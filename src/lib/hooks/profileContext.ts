"use client";

import { createContext, useContext } from "react";
import type { Profile } from "@/types";

interface Ctx {
  profile: Profile | null;
  reload: () => Promise<void>;
  setProfile: (p: Profile | null) => void;
}

export const ProfileContext = createContext<Ctx>({
  profile: null,
  reload: async () => {},
  setProfile: () => {},
});

export function useProfileContext() {
  return useContext(ProfileContext);
}
