import { useRef } from 'react'
import Papa from 'papaparse'
import { Upload } from 'lucide-react'
import toast from 'react-hot-toast'
import { supabase } from '../lib/supabase'
import { useAuth } from '../contexts/AuthContext'

interface ImportCSVProps {
  refetch: () => Promise<void>
}

export default function ImportCSV({ refetch }: ImportCSVProps) {
  const fileInputRef = useRef<HTMLInputElement>(null)
  const { user } = useAuth()

  const handleFileSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    if (!file) return

    Papa.parse(file, {
      header: true,
      skipEmptyLines: true,
      complete: async (results) => {
        const rows = results.data as any[]
        const recordsToInsert: any[] = []
        let skipped = 0

        for (const row of rows) {
          try {
            let dateStr = row.date?.toString().trim()
            if (!dateStr) { skipped++; continue }

            if (dateStr.includes('/')) {
              const p = dateStr.split(/[/\s]/)
              if (p.length >= 3) {
                const m = p[0].padStart(2, '0')
                const d = p[1].padStart(2, '0')
                let y = p[2]
                if (y.length === 2) y = '20' + y
                dateStr = `${y}-${m}-${d}`
              }
            } else {
              dateStr = dateStr.split('T')[0]
            }

            const weight = parseFloat(row.weight)
            if (isNaN(weight) || weight <= 0) { skipped++; continue }

            const body_fat = row.body_fat && row.body_fat.toString().trim() !== '' 
              ? parseFloat(row.body_fat) 
              : null

            recordsToInsert.push({
              user_id: user?.id,
              date: dateStr,
              weight: weight,
              body_fat: body_fat,
            })
          } catch {
            skipped++
          }
        }

        if (recordsToInsert.length === 0) {
          toast.error("No valid rows found")
          return
        }

        const BATCH_SIZE = 500
        let success = 0
        let failed = 0

        for (let i = 0; i < recordsToInsert.length; i += BATCH_SIZE) {
          const batch = recordsToInsert.slice(i, i + BATCH_SIZE)
          const { error } = await supabase.from('measurements').insert(batch)

          if (error) {
            failed += batch.length
          } else {
            success += batch.length
          }
        }

        if (fileInputRef.current) fileInputRef.current.value = ''

        if (success > 0) {
          toast.success(`Imported ${success} measurements`)
          await refetch() // This now updates the main table
        }
        if (skipped > 0) toast(`Skipped ${skipped} invalid rows`, { icon: '⚠️' })
        if (failed > 0) toast.error(`${failed} rows failed`)
      }
    })
  }

  return (
    <div>
      <input type="file" ref={fileInputRef} accept=".csv" onChange={handleFileSelect} className="hidden" />
      <button
        onClick={() => fileInputRef.current?.click()}
        className="flex items-center gap-x-2 px-4 py-2 bg-zinc-700 hover:bg-zinc-600 rounded-2xl text-sm transition-colors"
      >
        <Upload size={16} /> Import CSV
      </button>
    </div>
  )
}