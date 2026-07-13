import { create } from 'zustand'
import { createJSONStorage, persist } from 'zustand/middleware'

interface DeviceStoreState {
  selectedDeviceId: string | null
  selectDevice: (id: string | null) => void
}

export const useDeviceStore = create<DeviceStoreState>()(
  persist(
    (set) => ({
      selectedDeviceId: null,
      selectDevice: (id) => set({ selectedDeviceId: id }),
    }),
    {
      name: 'gowa-ui.device.v1',
      storage: createJSONStorage(() => localStorage),
    },
  ),
)
