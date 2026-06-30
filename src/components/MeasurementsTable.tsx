import { useState } from 'react'
import type { Measurement } from '../types'
import type { Profile } from '../types'
import { calculateFFMI, calculateLeanMassLbs } from '../lib/calculateFFMI'
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

  return (
    <div>
      <div className="overflow-x-auto">
        <table className="w-full">
          <thead>
            <tr className="border-b border-zinc-700 text-left text-sm text-zinc-400">
              <th className="pb-3 pr-4">Date</th>
              <th className="pb-3 pr-4"># Logs</th>
              <th className="pb-3 pr-4">Weight</th>
              <th className="pb-3 pr-4">Body Fat</th>
              <th className="pb-3 pr-4">Lean Mass</th>
              <th className="pb-3 pr-4">FFMI</th>
              <th className="pb-3 w-10"></th>
            </tr>
          </thead>
          <tbody>
            {currentMeasurements.map((m) => {
              const leanMass = calculateLeanMassLbs(m.weight, m.body_fat)
              const ffmi = m.height_inches
                ? calculateFFMI(m.weight, m.body_fat, m.height_inches)
                : (profile?.height_inches
                    ? calculateFFMI(m.weight, m.body_fat, profile.height_inches)
                    : null)

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
                  <td className="py-3 pr-4 text-emerald-400 font-medium text-sm">
                    {ffmi ?? '—'}
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

      {totalPages > 1 && (
        <div className="flex items-center justify-between mt-6 text-sm">
          <button
            onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
            disabled={currentPage === 1}
            className="px-4 py-2 bg-zinc-800 hover:bg-zinc-700 disabled:opacity-40 rounded-xl transition-colors"
          >
            Previous
          </button>

          <span className="text-zinc-400">
            Page {currentPage} of {totalPages}
            <span className="ml-2 text-zinc-500">({measurements.length} total)</span>
          </span>

          <button
            onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
            disabled={currentPage === totalPages}
            className="px-4 py-2 bg-zinc-800 hover:bg-zinc-700 disabled:opacity-40 rounded-xl transition-colors"
          >
            Next
          </button>
        </div>
      )}
    </div>
  )
}