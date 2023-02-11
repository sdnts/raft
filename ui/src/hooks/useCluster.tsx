import { create } from "zustand";
import { NodeIds } from "../rpc";

type State = {
  // Cluster Id
  id: string | undefined;
  setId: (id: string) => void;

  size: number;

  // How many Nodes are off?
  off: number;
  incrementOff: () => void;
  decrementOff: () => void;
};

export const useCluster = create<State>((set) => ({
  id: undefined,
  setId: (id: string) => set({ id }),

  size: NodeIds.length,

  off: 0,
  incrementOff: () => set((state) => ({ off: state.off + 1 })),
  decrementOff: () => set((state) => ({ off: state.off - 1 })),
}));
