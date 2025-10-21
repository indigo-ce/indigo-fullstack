import * as React from "react"
import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import { ErrorMessage } from "@/components/ErrorMessage"
import { authClient } from "@/lib/auth-client"
import { translations } from "@/i18n/constants"
import type { Locale } from "@/i18n/constants"
import { localizeUrl } from "@/i18n/utils"

interface DeleteConfirmationProps {
  locale?: Locale
}

export function DeleteConfirmation({ locale = "en" }: DeleteConfirmationProps) {
  const [open, setOpen] = React.useState(false)
  const [isDeleting, setIsDeleting] = React.useState(false)
  const [error, setError] = React.useState<string | null>(null)

  const t = translations[locale] || translations.en

  const handleDelete = () => {
    setError(null)
    setOpen(true)
  }

  const confirmDelete = async () => {
    try {
      setError(null)
      setIsDeleting(true)
      await authClient.deleteUser()
      const signInUrl = localizeUrl("/sign-in", locale)
      window.location.href = signInUrl
    } catch (err) {
      setError(err instanceof Error ? err.message : t.account.deleteFailed)
    } finally {
      setIsDeleting(false)
    }
  }

  const cancelDelete = () => {
    setError(null)
    setOpen(false)
  }

  return (
    <div className="relative">
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogTrigger asChild>
          <Button variant="destructive" size="sm" onClick={handleDelete}>
            {t.account.deleteAccount}
          </Button>
        </DialogTrigger>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{t.account.deleteAccount}</DialogTitle>
            <DialogDescription>
              {t.account.areYouSure}
            </DialogDescription>
          </DialogHeader>
          <ErrorMessage message={error || undefined} />
          <DialogFooter>
            <Button
              variant="outline"
              onClick={cancelDelete}
              disabled={isDeleting}
            >
              {t.account.no}
            </Button>
            <Button
              variant="destructive"
              onClick={confirmDelete}
              disabled={isDeleting}
            >
              {isDeleting ? t.account.deleting : t.account.yes}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}