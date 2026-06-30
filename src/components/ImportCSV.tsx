import { useState } from 'react'
import Papa from 'papaparse'
import { supabase } from '../lib/supabase'
import { parseCsvDate } from '../lib/parseCsvDate'
import { mergeAggregates, readingToAggregate, type DailyAggregate } from '../lib/mergeMeasurement'
import { upsertDailyAggregate } from '../lib/upsertDailyMeasurement'
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
            toast.error('Please log in first')
            setIsImporting(false)
            return
          }

          const errors: string[] = []
          const csvByDate: Record<string, DailyAggregate> = {}
          let totalLogs = 0

          for (let i = 0; i < (results.data as any[]).length; i++) {
            const row = (results.data as any[])[i]
            const rawDate = row.date || row.Date || row.DATE
            const weight = parseFloat(row.weight || row.Weight || row.WEIGHT)
            const rawBodyFat = row.body_fat || row['body fat'] || row['Body Fat'] || row.bodyFat
            const parsedBodyFat =
              rawBodyFat !== undefined && rawBodyFat !== '' && rawBodyFat !== null
                ? parseFloat(rawBodyFat)
                : null

            if (!rawDate || isNaN(weight)) {
              errors.push(`Row ${i + 1}: missing or invalid date/weight`)
              continue
            }

            const isoDate = parseCsvDate(String(rawDate))
            if (!isoDate) {
              errors.push(`Row ${i + 1}: unrecognized date format "${rawDate}"`)
              continue
            }

            const bodyFat = parsedBodyFat !== null && !isNaN(parsedBodyFat) ? parsedBodyFat : null
            const reading = readingToAggregate({ weight, body_fat: bodyFat })

            csvByDate[isoDate] = mergeAggregates(csvByDate[isoDate] || null, reading)
            totalLogs++
          }

          if (totalLogs === 0) {
            toast.error('No valid measurements found in CSV')
            if (errors.length > 0) console.warn('CSV import errors:', errors)
            return
          }

          let daysUpdated = 0

          for (const [isoDate, csvAggregate] of Object.entries(csvByDate)) {
            const { error } = await upsertDailyAggregate(supabase, user.id, isoDate, csvAggregate)
            if (error) {
              errors.push(`Error on ${isoDate}: ${error.message}`)
            } else {
              daysUpdated++
            }
          }

          if (daysUpdated > 0) {
            toast.success(
              `Imported ${totalLogs} logs across ${daysUpdated} day${daysUpdated === 1 ? '' : 's'}`
            )
            await refetch()
          } else {
            toast.error('No measurements were imported')
          }

          if (errors.length > 0) {
            console.warn('CSV import errors:', errors)
            toast.error(`${errors.length} rows had issues (check browser console)`)
          }
        } catch (err) {
          console.error(err)
          toast.error('Failed to import CSV')
        } finally {
          setIsImporting(false)
          e.target.value = ''
        }
      },
      error: (err) => {
        console.error(err)
        toast.error('Failed to parse CSV file')
        setIsImporting(false)
      },
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