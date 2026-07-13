import { PlaceholderPage } from '@/components/shared/placeholder-page'

export default function ConnectPage() {
  return (
    <div className="flex min-h-svh items-center justify-center p-4">
      <div className="w-full max-w-md">
        <PlaceholderPage
          title="Connect to server"
          description="Server URL and credentials for a self-hosted gowa instance."
          milestone="M1"
        />
      </div>
    </div>
  )
}
