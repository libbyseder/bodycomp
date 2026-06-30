import { useState } from 'react'
import Papa from 'papaparse'
import { supabase } from '../lib/supabase'
import { Upload } from 'lucide-react'
import toast from 'react-hot-toast'

interface ImportCSVProps {
  refetch: () => Promise<void>
}

export default function ImportCSV({ refetch }: ImportCSVProps) {
  const [isImporting, setIsImporting] = useState(false)

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    setIsImporting(true)

    Papa.parse(file, {
      header: true,
      skipEmptyLines: true,
      complete: async (results) => {
        try {
          const { data: { user } } = await supabase.auth.getUser()
          if (!user) {
            toast.error("Please log in first")
            setIsImporting(false)
            return
          }

          let imported = 0
          const errors: string[] = []

          for (const row of results.data as any[]) {
            const date = row.date || row.Date || row.DATE
            const weight = parseFloat(row.weight || row.Weight || row.WEIGHT)
            const body_fat = row.body_fat || row["body fat"] || row["Body Fat"] 
              ? parseFloat(row.body_fat || row["body fat"] || row["Body Fat"]) 
              : null

            if (!date || isNaN(weight)) {
              errors.push(`Skipped row with missing/invalid data: ${JSON.stringify(row)}`)
              continue
            }

            const { error } = await supabase.from('measurements').upsert({
              user_id: user.id,
              date: date.trim(),
              weight,
              body_fat,
            }, {
              onConflict: 'user_id,date'
            })

            if (error) {
              errors.push(`Error on ${date}: ${error.message}`)
            } else {
              imported++
            }
          }

          if (imported > 0) {
            toast.success(`Imported ${imported} measurements from CSV`)
            await refetch()
          } else {
            toast.error("No valid measurements were imported")
          }

          if (errors.length > 0) {
            console.warn("CSV import errors:", errors)
            toast.error(`${errors.length} rows had issues (check console)`)
          }
        } catch (err) {
          console.error(err)
          toast.error("Failed to import CSV")
        } finally {
          setIsImporting(false)
          // Reset file input
          e.target.value = ''
        }
      },
      error: (err) => {
        console.error(err)
        toast.error("Failed to parse CSV file")
        setIsImporting(false)
      }
    })
  }

  return (
    <label className="flex items-center gap-x-2 px-4 py-2 bg-zinc-800 hover:bg-zinc-700 rounded-2xl text-sm cursor-pointer transition-colors">
      <Upload size={16} />
      {isImporting ? 'Importing...' : 'Import CSV'}
      <input
        type="file"
        accept=".csv"
        onChange={handleFileSelect}
        disabled={isImporting}
        className="hidden"
      />
    </label>
  )
}
