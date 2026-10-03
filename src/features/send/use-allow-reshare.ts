import { useState } from 'react'
import { isStatus } from '@/lib/jid'
import { useRecipientStore } from '@/stores/recipient'

/**
 * The "Allow resharing" choice for a Status post. It turns off whenever the
 * recipient leaves Status, so returning to Status starts from off instead of
 * reusing a choice made before the switch was hidden.
 */
export function useAllowReshare() {
  const statusRecipient = useRecipientStore((state) => isStatus(state.recipient.type))
  const [allowReshare, setAllowReshare] = useState(false)
  const [wasStatus, setWasStatus] = useState(statusRecipient)
  if (wasStatus !== statusRecipient) {
    setWasStatus(statusRecipient)
    setAllowReshare(false)
  }
  return { statusRecipient, allowReshare: statusRecipient && allowReshare, setAllowReshare }
}
