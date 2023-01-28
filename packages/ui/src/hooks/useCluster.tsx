import { create } from "zustand";

type State = {
  id: string | undefined;
  setId: (id: string) => void;
};

export const useCluster = create<State>((set) => ({
  id: undefined,
  setId: (id: string) => set({ id }),
}));
