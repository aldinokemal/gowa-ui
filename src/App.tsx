import { Navigate, Route, Routes } from 'react-router-dom'
import { AppShell } from '@/components/layout/app-shell'
import AccountPage from '@/pages/account'
import ChatsPage from '@/pages/chats'
import ConnectPage from '@/pages/connect'
import DashboardPage from '@/pages/dashboard'
import GroupsPage from '@/pages/groups'
import MessagesPage from '@/pages/messages'
import MiscPage from '@/pages/misc'
import SendPage from '@/pages/send'
import SettingsPage from '@/pages/settings'

function App() {
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
