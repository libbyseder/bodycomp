import { useState } from 'react'
import type { Measurement } from '../types'
import type { Profile } from '../types'
import { calculateFFMI, calculateNormalizedFFMI, calculateLeanMassLbs } from '../lib/calculateFFMI'
import { Trash2 } from 'lucide-react'

interface MeasurementsTableProps {
  measurements: Measurement[]
  onDelete: (id: string) => void
  profile: Profile | null
}

export default function MeasurementsTable({ measurements, onDelete, profile }: MeasurementsTableProps) {
  const [currentPage, setCurrentPage] = useState(1)
  const itemsPerPage = 25

  const totalPages = Math.ceil(measurements.length / itemsPerPage)
  const startIndex = (currentPage - 1) * itemsPerPage
  const currentMeasurements = measurements.slice(startIndex, startIndex + itemsPerPage)

  const getMetrics = (m: Measurement) => {
    const height = m.height_inches ?? profile?.height_inches ?? null
    const leanMass = calculateLeanMassLbs(m.weight, m.body_fat)
    const ffmi = height ? calculateFFMI(m.weight, m.body_fat, height) : null
    const normalizedFfmi = height ? calculateNormalizedFFMI(m.weight, m.body_fat, height) : null
    return { leanMass, ffmi, normalizedFfmi }
  }

  return (
    <div>
      {/* Desktop table */}
      <div className="hidden md:block overflow-x-auto -mx-2 px-2">
        <table className="w-full min-w-[720px]">
          <thead>
            <tr className="border-b border-zinc-700 text-left text-sm text-zinc-400">
              <th className="pb-3 pr-4">Date</th>
              <th className="pb-3 pr-4"># Logs</th>
              <th className="pb-3 pr-4">Weight</th>
              <th className="pb-3 pr-4">Body Fat</th>
              <th className="pb-3 pr-4">Lean Mass</th>
              <th className="pb-3 pr-4">FFMI</th>
              <th className="pb-3 pr-4">Norm. FFMI</th>
              <th className="pb-3 w-10"></th>
            </tr>
          </thead>
          <tbody>
            {currentMeasurements.map((m) => {
              const { leanMass, ffmi, normalizedFfmi } = getMetrics(m)
              return (
                <tr key={m.id} className="border-b border-zinc-800 last:border-none">
                  <td className="py-3 pr-4 text-white text-sm">{m.date}</td>
                  <td className="py-3 pr-4 text-emerald-400 font-medium text-sm">
                    {m.log_count ?? 1}
                  </td>
                  <td className="py-3 pr-4 font-medium">{m.weight} lbs</td>
                  <td className="py-3 pr-4 text-zinc-300 text-sm">
                    {m.body_fat ? `${m.body_fat}%` : '—'}
                  </td>
                  <td className="py-3 pr-4 text-emerald-400 font-medium text-sm">
                    {leanMass ? `${leanMass} lbs` : '—'}
                  </td>
                  <td className="py-3 pr-4 text-blue-400 font-medium text-sm">
                    {ffmi ?? '—'}
                  </td>
                  <td className="py-3 pr-4 text-indigo-400 font-medium text-sm">
                    {normalizedFfmi ?? '—'}
                  </td>
                  <td className="py-3">
                    <button
                      onClick={() => onDelete(m.id)}
                      className="text-zinc-500 hover:text-red-400 p-1 transition-colors"
                    >
                      <Trash2 size={15} />
                    </button>
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>

      {/* Mobile cards */}
      <div className="md:hidden space-y-3">
        {currentMeasurements.map((m) => {
          const { leanMass, ffmi, normalizedFfmi } = getMetrics(m)
          return (
            <div
              key={m.id}
              className="bg-zinc-800/80 border border-zinc-700 rounded-2xl p-4"
            >
              <div className="flex items-start justify-between gap-3 mb-3">
                <div>
                  <p className="text-white font-medium">{m.date}</p>
                  <p className="text-emerald-400 text-sm mt-0.5">
                    {m.log_count ?? 1} log{(m.log_count ?? 1) === 1 ? '' : 's'}
                  </p>
                </div>
                <button
                  onClick={() => onDelete(m.id)}
                  className="text-zinc-500 hover:text-red-400 p-1 transition-colors shrink-0"
                  aria-label={`Delete measurement for ${m.date}`}
                >
                  <Trash2 size={16} />
                </button>
              </div>
              <div className="grid grid-cols-2 gap-3 text-sm">
                <div>
                  <p className="text-zinc-500 text-xs">Weight</p>
                  <p className="font-medium">{m.weight} lbs</p>
                </div>
                <div>
                  <p className="text-zinc-500 text-xs">Body Fat</p>
                  <p>{m.body_fat ? `${m.body_fat}%` : '—'}</p>
                </div>
                <div>
                  <p className="text-zinc-500 text-xs">Lean Mass</p>
                  <p className="text-emerald-400">{leanMass ? `${leanMass} lbs` : '—'}</p>
                </div>
                <div>
                  <p className="text-zinc-500 text-xs">FFMI</p>
                  <p className="text-blue-400">{ffmi ?? '—'}</p>
                </div>
                <div>
                  <p className="text-zinc-500 text-xs">Norm. FFMI</p>
                  <p className="text-indigo-400">{normalizedFfmi ?? '—'}</p>
                </div>
              </div>
            </div>
          )
        })}
      </div>

      {totalPages > 1 && (
        <div className="flex flex-col sm:flex-row items-center justify-between gap-3 mt-6 text-sm">
          <button
            onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
            disabled={currentPage === 1}
            className="w-full sm:w-auto px-4 py-2 bg-zinc-800 hover:bg-zinc-700 disabled:opacity-40 rounded-xl transition-colors"
          >
            Previous
          </button>

          <span className="text-zinc-400 text-center">
            Page {currentPage} of {totalPages}
            <span className="block sm:inline sm:ml-2 text-zinc-500">
              ({measurements.length} total)
            </span>
          </span>

          <button
            onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
            disabled={currentPage === totalPages}
            className="w-full sm:w-auto px-4 py-2 bg-zinc-800 hover:bg-zinc-700 disabled:opacity-40 rounded-xl transition-colors"
          >
            Next
          </button>
        </div>
      )}
    </div>
  )
}