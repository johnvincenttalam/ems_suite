import { useEffect } from 'react'
import { useForm, useWatch } from 'react-hook-form'
import { z } from 'zod/v4'
import { zodResolver } from '@hookform/resolvers/zod'
import { toast } from 'sonner'
import { Upload, X } from 'lucide-react'
import { Modal } from '@/shared/ui/modal'
import { Input } from '@/shared/ui/input'
import { Select } from '@/shared/ui/select'
import { Button } from '@/shared/ui/button'
import { useAuthStore } from '@/features/auth'
import { useDrivers } from '@/features/drivers'
import { useAssets } from '@/features/assets'
import { useTemplates } from '@/features/checklists'
import { useCreateVehicle, useUpdateVehicle } from '@/features/fleet/hooks/use-fleet'
import { VehicleThumbnail } from '@/features/fleet/components/vehicle-thumbnail'
import type { Vehicle } from '@/features/fleet/types'

const FORM_ID = 'vehicle-form'

const schema = z.object({
  plateNumber: z.string().min(2, 'Plate number is required'),
  model: z.string().min(2, 'Model is required'),
  year: z.number().int().min(1990).max(2100),
  fuelType: z.enum(['petrol', 'diesel', 'electric']),
  currentOdometer: z.number().int().min(0),
  fuelCapacityLiters: z.number().min(0).optional(),
  assignedDriverId: z.string().optional(),
  linkedAssetId: z.string().optional(),
  checklistId: z.string().optional(),
  nextServiceDate: z.string().optional(),
  photoUrl: z.string().optional(),
  status: z.enum(['active', 'maintenance', 'retired']).optional(),
})

type FormValues = z.infer<typeof schema>

interface VehicleFormModalProps {
  open: boolean
  onClose: () => void
  /** Present = edit, absent = create. */
  vehicle?: Vehicle | null
  onSaved?: (vehicle: Vehicle) => void
}

const numericOrUndef = (v: unknown) =>
  v === '' || v == null || Number.isNaN(v) ? undefined : Number(v)

export function VehicleFormModal({ open, onClose, vehicle, onSaved }: VehicleFormModalProps) {
  const { user } = useAuthStore()
  const { data: drivers = [] } = useDrivers()
  const { data: assets = [] } = useAssets()
  const { data: templates = [] } = useTemplates()
  const createVehicle = useCreateVehicle()
  const updateVehicle = useUpdateVehicle()

  const isEdit = !!vehicle
  const pending = createVehicle.isPending || updateVehicle.isPending

  const defaults: FormValues = vehicle
    ? {
        plateNumber: vehicle.plateNumber,
        model: vehicle.model,
        year: vehicle.year,
        fuelType: vehicle.fuelType,
        currentOdometer: vehicle.currentOdometer,
        fuelCapacityLiters: vehicle.fuelCapacityLiters,
        assignedDriverId: vehicle.assignedDriverId,
        linkedAssetId: vehicle.linkedAssetId,
        checklistId: vehicle.checklistId,
        nextServiceDate: vehicle.nextServiceDate,
        photoUrl: vehicle.photoUrl,
        status: vehicle.status,
      }
    : {
        plateNumber: '',
        model: '',
        year: new Date().getFullYear(),
        fuelType: 'diesel',
        currentOdometer: 0,
        fuelCapacityLiters: undefined,
        assignedDriverId: undefined,
        linkedAssetId: undefined,
        checklistId: undefined,
        nextServiceDate: undefined,
        photoUrl: undefined,
        status: 'active',
      }

  const { register, handleSubmit, reset, watch, control, setValue, formState: { errors } } = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: defaults,
  })

  useEffect(() => {
    if (open) reset(defaults)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, vehicle?.id])

  const fuelType = watch('fuelType')

  const onSubmit = async (data: FormValues) => {
    if (!user) {
      toast.error('You must be signed in')
      return
    }
    try {
      if (vehicle) {
        const updated = await updateVehicle.mutateAsync({
          id: vehicle.id,
          patch: {
            plateNumber: data.plateNumber,
            model: data.model,
            year: data.year,
            fuelType: data.fuelType,
            currentOdometer: data.currentOdometer,
            fuelCapacityLiters: data.fuelType === 'electric' ? 0 : data.fuelCapacityLiters,
            // Empty string from a Select means "unassigned" — translate to null
            // so the API treats it as a clear, not as no-op.
            assignedDriverId: data.assignedDriverId ? data.assignedDriverId : null,
            linkedAssetId: data.linkedAssetId ? data.linkedAssetId : null,
            checklistId: data.checklistId ? data.checklistId : null,
            nextServiceDate: data.nextServiceDate ? data.nextServiceDate : null,
            photoUrl: data.photoUrl ? data.photoUrl : null,
            status: data.status,
            updatedBy: user.id,
          },
        })
        toast.success(`${updated.plateNumber} updated`)
        onSaved?.(updated)
      } else {
        const created = await createVehicle.mutateAsync({
          plateNumber: data.plateNumber,
          model: data.model,
          year: data.year,
          fuelType: data.fuelType,
          currentOdometer: data.currentOdometer,
          fuelCapacityLiters: data.fuelCapacityLiters,
          assignedDriverId: data.assignedDriverId || undefined,
          linkedAssetId: data.linkedAssetId || undefined,
          checklistId: data.checklistId || undefined,
          nextServiceDate: data.nextServiceDate || undefined,
          photoUrl: data.photoUrl || undefined,
          status: data.status,
          createdBy: user.id,
        })
        toast.success(`${created.plateNumber} registered`)
        onSaved?.(created)
      }
      onClose()
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Save failed')
    }
  }

  const driverOptions = drivers
    .filter((d) => d.status === 'active')
    .map((d) => ({ value: d.id, label: d.name }))

  const assetOptions = assets
    .filter((a) => a.status !== 'disposed')
    .map((a) => ({ value: a.id, label: `${a.assetCode} — ${a.name}` }))

  const templateOptions = templates.map((t) => ({ value: t.id, label: t.name }))

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={isEdit ? `Edit ${vehicle?.plateNumber ?? 'Vehicle'}` : 'Register Vehicle'}
      size="lg"
      footer={
        <>
          <Button type="button" variant="secondary" onClick={onClose} disabled={pending}>
            Cancel
          </Button>
          <Button type="submit" form={FORM_ID} loading={pending}>
            {isEdit ? 'Save Changes' : 'Register Vehicle'}
          </Button>
        </>
      }
    >
      <form id={FORM_ID} onSubmit={handleSubmit(onSubmit)} className="space-y-4">
        <VehiclePhotoField
          control={control}
          onChange={(url) => setValue('photoUrl', url, { shouldDirty: true })}
        />

        <div className="grid grid-cols-2 gap-3">
          <Input
            label="Plate Number *"
            {...register('plateNumber')}
            error={errors.plateNumber?.message}
            placeholder="e.g. SGX 5482 K"
          />
          <Input
            label="Model *"
            {...register('model')}
            error={errors.model?.message}
            placeholder="e.g. Toyota Hilux"
          />
        </div>
        <div className="grid grid-cols-3 gap-3">
          <Input
            label="Year *"
            type="number"
            {...register('year', { valueAsNumber: true })}
            error={errors.year?.message}
          />
          <Select
            label="Fuel Type *"
            {...register('fuelType')}
            error={errors.fuelType?.message}
            options={[
              { value: 'petrol', label: 'Petrol' },
              { value: 'diesel', label: 'Diesel' },
              { value: 'electric', label: 'Electric' },
            ]}
          />
          <Input
            label="Odometer *"
            type="number"
            {...register('currentOdometer', { valueAsNumber: true })}
            error={errors.currentOdometer?.message}
            helperText="km"
          />
        </div>
        <div className="grid grid-cols-2 gap-3">
          <Input
            label={fuelType === 'electric' ? 'Fuel Capacity (n/a for EV)' : 'Fuel Capacity (L)'}
            type="number"
            disabled={fuelType === 'electric'}
            {...register('fuelCapacityLiters', { setValueAs: numericOrUndef })}
            error={errors.fuelCapacityLiters?.message}
          />
          <Select
            label="Status"
            {...register('status')}
            error={errors.status?.message}
            options={[
              { value: 'active', label: 'Active' },
              { value: 'maintenance', label: 'In Maintenance' },
              { value: 'retired', label: 'Retired' },
            ]}
          />
        </div>
        <div className="grid grid-cols-2 gap-3">
          <Select
            label="Assigned Driver"
            {...register('assignedDriverId')}
            error={errors.assignedDriverId?.message}
            placeholder="Unassigned"
            options={driverOptions}
          />
          <Input
            label="Next Service Date"
            type="date"
            {...register('nextServiceDate')}
            error={errors.nextServiceDate?.message}
            helperText="Drives the Maintenance Due card on the dashboard"
          />
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <Select
              label="Linked Asset"
              {...register('linkedAssetId')}
              error={errors.linkedAssetId?.message}
              placeholder="None"
              options={assetOptions}
            />
            <p className="text-[11px] text-zinc-400 mt-1">
              Required to escalate vehicle issues to maintenance.
            </p>
          </div>
          <div>
            <Select
              label="Pre-trip Checklist"
              {...register('checklistId')}
              error={errors.checklistId?.message}
              placeholder="None"
              options={templateOptions}
            />
            <p className="text-[11px] text-zinc-400 mt-1">
              Enables the pre-trip inspection action.
            </p>
          </div>
        </div>
      </form>
    </Modal>
  )
}

const MAX_PHOTO_BYTES = 2 * 1024 * 1024

interface VehiclePhotoFieldProps {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  control: any
  onChange: (url: string) => void
}

/**
 * Vehicle photo input. Accepts either a pasted URL or a small file upload
 * (PNG / JPG / WEBP, ≤ 2 MB → base64 data URL). Mirrors the DriverPhotoField
 * shape so users get the same affordances across the app.
 */
function VehiclePhotoField({ control, onChange }: VehiclePhotoFieldProps) {
  const photoUrl = useWatch({ control, name: 'photoUrl' }) as string | undefined

  const handleFile = (file: File) => {
    if (!['image/png', 'image/jpeg', 'image/webp'].includes(file.type)) {
      toast.error('Only PNG, JPG, or WEBP files are accepted')
      return
    }
    if (file.size > MAX_PHOTO_BYTES) {
      toast.error('Photo must be under 2 MB')
      return
    }
    const reader = new FileReader()
    reader.onload = () => {
      if (typeof reader.result === 'string') onChange(reader.result)
    }
    reader.readAsDataURL(file)
  }

  return (
    <div>
      <p className="text-[11px] uppercase tracking-wider text-zinc-400 font-semibold mb-2">Photo</p>
      <div className="flex items-start gap-4">
        <VehicleThumbnail size="xl" imageUrl={photoUrl} />
        <div className="flex-1 space-y-2">
          <Input
            placeholder="Paste an image URL — https://…"
            value={photoUrl ?? ''}
            onChange={(e) => onChange(e.target.value)}
          />
          <div className="flex items-center gap-2">
            <input
              type="file"
              accept="image/png,image/jpeg,image/webp"
              onChange={(e) => {
                const file = e.target.files?.[0]
                if (file) handleFile(file)
                e.target.value = ''
              }}
              className="hidden"
              id="vehicle-photo-upload"
            />
            <label
              htmlFor="vehicle-photo-upload"
              className="inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-md border border-zinc-200 bg-white text-[12px] text-zinc-600 hover:border-zinc-400 hover:text-zinc-900 cursor-pointer transition-colors"
            >
              <Upload className="w-3.5 h-3.5" />
              Upload file
            </label>
            {photoUrl && (
              <button
                type="button"
                onClick={() => onChange('')}
                className="inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-md text-[12px] text-zinc-500 hover:text-red-600 hover:bg-red-50 transition-colors"
              >
                <X className="w-3.5 h-3.5" />
                Clear
              </button>
            )}
          </div>
          <p className="text-[11px] text-zinc-400">PNG, JPG, or WEBP · max 2 MB. Falls back to a Car icon if unset.</p>
        </div>
      </div>
    </div>
  )
}
