import { useMemo } from 'react'
import { Link } from 'react-router-dom'
import { Satellite, ArrowRight } from 'lucide-react'
import { formatDistanceToNow, parseISO } from 'date-fns'
import { MapContainer, TileLayer, CircleMarker, Popup } from 'react-leaflet'
import L from 'leaflet'
import 'leaflet/dist/leaflet.css'
import { useTags, useTrackingLogs } from '@/features/tracking'
import { useVehicles } from '@/features/fleet'
import { Card, CardHeader, CardTitle, CardContent } from '@/shared/ui/card'
import { EmptyState } from '@/shared/ui/empty-state'

const PH_CENTER: [number, number] = [12.8797, 121.7740]

interface VehiclePing {
  vehicleId: string
  plateNumber: string
  model: string
  latitude: number
  longitude: number
  timestamp: string
}

export function FleetLiveMapWidget() {
  const { data: tags = [] } = useTags()
  const { data: logs = [] } = useTrackingLogs()
  const { data: vehicles = [] } = useVehicles()

  const vehiclePings = useMemo<VehiclePing[]>(() => {
    const vehicleMap = Object.fromEntries(vehicles.map((v) => [v.id, v]))
    const latest = new Map<string, VehiclePing>()
    for (const log of logs) {
      if (log.entityType !== 'vehicle') continue
      if (log.latitude == null || log.longitude == null) continue
      const v = vehicleMap[log.entityId]
      if (!v || v.status === 'retired') continue
      const existing = latest.get(log.entityId)
      if (existing && existing.timestamp >= log.timestamp) continue
      latest.set(log.entityId, {
        vehicleId: log.entityId,
        plateNumber: v.plateNumber,
        model: v.model,
        latitude: log.latitude,
        longitude: log.longitude,
        timestamp: log.timestamp,
      })
    }
    return Array.from(latest.values())
  }, [vehicles, logs])

  const gpsTagCount = useMemo(
    () =>
      tags.filter(
        (t) => t.boundEntityType === 'vehicle' && t.type === 'gps' && t.status === 'active',
      ).length,
    [tags],
  )

  const bounds = useMemo<L.LatLngBoundsExpression | undefined>(() => {
    if (vehiclePings.length < 2) return undefined
    return L.latLngBounds(vehiclePings.map((p) => [p.latitude, p.longitude] as [number, number]))
  }, [vehiclePings])

  const center: [number, number] =
    vehiclePings.length === 1
      ? [vehiclePings[0].latitude, vehiclePings[0].longitude]
      : PH_CENTER

  return (
    <Card>
      <CardHeader className="flex-row items-center justify-between flex">
        <div className="flex items-center gap-2">
          <CardTitle>Live Vehicle Map</CardTitle>
          <span className="text-[11px] text-zinc-400">
            {gpsTagCount} GPS · {vehiclePings.length} pinged
          </span>
        </div>
        <Link
          to="/module/tracking"
          className="text-[12px] text-zinc-500 hover:text-zinc-900 inline-flex items-center gap-1"
        >
          Full map
          <ArrowRight className="w-3.5 h-3.5" />
        </Link>
      </CardHeader>
      <CardContent className="p-0">
        {vehiclePings.length === 0 ? (
          <div className="px-4 pb-4">
            <EmptyState
              icon={Satellite}
              title="No vehicle pings yet"
              description="Bind a GPS tag to a vehicle to see live positions here."
            />
          </div>
        ) : (
          <div className="h-[260px] rounded-b-xl overflow-hidden">
            <MapContainer
              center={center}
              zoom={6}
              bounds={bounds}
              boundsOptions={{ padding: [20, 20], maxZoom: 12 }}
              scrollWheelZoom={false}
              className="h-full w-full"
            >
              <TileLayer
                attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OSM</a>'
                url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
              />
              {vehiclePings.map((p) => (
                <CircleMarker
                  key={p.vehicleId}
                  center={[p.latitude, p.longitude]}
                  radius={7}
                  pathOptions={{ color: '#0ea5e9', fillColor: '#0ea5e9', fillOpacity: 0.7, weight: 2 }}
                >
                  <Popup>
                    <div className="text-[12px] leading-snug">
                      <p className="font-medium text-zinc-900">{p.plateNumber}</p>
                      <p className="text-zinc-500">{p.model}</p>
                      <p className="text-zinc-400 mt-1">
                        {formatDistanceToNow(parseISO(p.timestamp), { addSuffix: true })}
                      </p>
                    </div>
                  </Popup>
                </CircleMarker>
              ))}
            </MapContainer>
          </div>
        )}
      </CardContent>
    </Card>
  )
}
