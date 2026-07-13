import { useEffect } from 'react'
import { useQueryClient } from '@tanstack/react-query'
import { Navigate, Route, Routes } from 'react-router-dom'
import { AppShell } from '@/components/layout/app-shell'
import { onWsEvent } from '@/lib/events'
import { wsClient } from '@/lib/ws'
import { useConnection } from '@/stores/connection'
import { useDeviceStore } from '@/stores/device'
import AccountPage from '@/pages/account'
import ChatsPage from '@/pages/chats'
import ConnectPage from '@/pages/connect'
import DashboardPage from '@/pages/dashboard'
import GroupsPage from '@/pages/groups'
import MessagesPage from '@/pages/messages'
import MiscPage from '@/pages/misc'
import SendPage from '@/pages/send'
import SettingsPage from '@/pages/settings'

function useBootstrap() {
  const queryClient = useQueryClient()

  useEffect(() => {
    void useConnection.getState().boot()
  }, [])

  useEffect(() => {
    wsClient.sync()
    const unsubscribeConnection = useConnection.subscribe(() => wsClient.sync())
    const unsubscribeDevice = useDeviceStore.subscribe(() => wsClient.sync())
    return () => {
      unsubscribeConnection()
      unsubscribeDevice()
      wsClient.stop()
    }
  }, [])

  useEffect(
    () =>
      onWsEvent((event) => {
        switch (event.code) {
          case 'LOGIN_SUCCESS':
          case 'LIST_DEVICES':
          case 'DEVICE_LOGGED_OUT':
            void queryClient.invalidateQueries({ queryKey: ['devices'] })
            break
          case 'DEVICE_REMOVED': {
            void queryClient.invalidateQueries({ queryKey: ['devices'] })
            const removed = (event.result as { device_id?: string } | null)?.device_id
            const { selectedDeviceId, selectDevice } = useDeviceStore.getState()
            if (removed && removed === selectedDeviceId) selectDevice(null)
            break
          }
          default:
            break
        }
      }),
    [queryClient],
  )
}

function App() {
  useBootstrap()

  return (
    <Routes>
      <Route path="/connect" element={<ConnectPage />} />
      <Route element={<AppShell />}>
        <Route path="/" element={<DashboardPage />} />
        <Route path="/send" element={<SendPage />} />
        <Route path="/messages" element={<MessagesPage />} />
        <Route path="/groups" element={<GroupsPage />} />
        <Route path="/chats" element={<ChatsPage />} />
        <Route path="/account" element={<AccountPage />} />
        <Route path="/misc" element={<MiscPage />} />
        <Route path="/settings" element={<SettingsPage />} />
      </Route>
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  )
}

export default App
