import { useForm } from 'react-hook-form'
import { z } from 'zod/v4'
import { zodResolver } from '@hookform/resolvers/zod'
import { useMutation } from '@tanstack/react-query'
import { toast } from 'sonner'
import { useAuthStore } from '@/features/auth/store/auth-store'
import { usersApi } from '@/features/users/api/users-api'
import { Button } from '@/shared/ui/button'
import { Input } from '@/shared/ui/input'
import { Modal } from '@/shared/ui/modal'
import type { ModuleKey } from '@/config/modules'

const inviteSchema = z.object({
  name: z.string().min(2, 'Name is required'),
  email: z.string().email('Invalid email'),
  phone: z.string().optional(),
})

type InviteForm = z.infer<typeof inviteSchema>

interface InviteUserModalProps {
  open: boolean
  onClose: () => void
  /** The module the user is being invited to. Stored on user.modules. */
  moduleKey: ModuleKey
  /** Display name used in the audit log (matches module log filters). */
  auditModule: string
  /** Friendly name shown in modal copy and toasts (e.g., "SDMS"). */
  moduleLabel: string
  /** Called after successful invite so the parent can invalidate caches. */
  onInvited?: () => void
}

export function InviteUserModal({
  open,
  onClose,
  moduleKey,
  auditModule,
  moduleLabel,
  onInvited,
}: InviteUserModalProps) {
  const { user: currentUser } = useAuthStore()

  const { register, handleSubmit, formState: { errors }, reset } = useForm<InviteForm>({
    resolver: zodResolver(inviteSchema),
    defaultValues: { name: '', email: '', phone: '' },
  })

  const inviteMutation = useMutation({
    mutationFn: (input: InviteForm) => {
      if (!currentUser) throw new Error('Not signed in')
      return usersApi.inviteToModule({
        name: input.name,
        email: input.email,
        phone: input.phone,
        moduleKey,
        auditModule,
        invitedBy: currentUser.id,
      })
    },
    onSuccess: ({ user, created }) => {
      toast.success(created ? `Invited ${user.name}` : `Granted ${user.name} ${moduleLabel} access`)
      reset()
      onInvited?.()
      onClose()
    },
    onError: (err) => {
      toast.error('Invite failed', { description: err instanceof Error ? err.message : 'Unknown error' })
    },
  })

  const close = () => {
    if (inviteMutation.isPending) return
    reset()
    onClose()
  }

  return (
    <Modal
      open={open}
      onClose={close}
      title={`Invite User to ${moduleLabel}`}
      size="md"
      footer={
        <>
          <Button variant="ghost" onClick={close} disabled={inviteMutation.isPending}>Cancel</Button>
          <Button onClick={handleSubmit((v) => inviteMutation.mutate(v))} loading={inviteMutation.isPending}>
            Send Invite
          </Button>
        </>
      }
    >
      <form className="space-y-4" onSubmit={handleSubmit((v) => inviteMutation.mutate(v))}>
        <p className="text-[13px] text-zinc-500">
          If the email already belongs to a user, this just grants them {moduleLabel} access.
          Otherwise a new user record is created.
        </p>
        <Input
          label="Name *"
          placeholder="e.g. Alex Rivera"
          {...register('name')}
          error={errors.name?.message}
        />
        <Input
          label="Email *"
          type="email"
          placeholder="alex.rivera@example.com"
          {...register('email')}
          error={errors.email?.message}
        />
        <Input
          label="Phone"
          placeholder="Optional"
          {...register('phone')}
          error={errors.phone?.message}
        />
      </form>
    </Modal>
  )
}
