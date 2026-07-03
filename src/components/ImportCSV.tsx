import { useState } from 'react'
import Papa from 'papaparse'
import { supabase } from '../lib/supabase'
import { parseCsvDate, parseCsvWeight, cleanCsvCell } from '../lib/parseCsvDate'
import { mergeAggregates, readingToAggregate, type DailyAggregate } from '../lib/mergeMeasurement'
import { Upload } from 'lucide-react'
import toast from 'react-hot-toast'
import { apiUrl } from '../lib/apiBase'

interface ImportCSVProps {
  refetch: () => Promise<void>
  className?: string
}

function getCell(row: Record<string, unknown>, keys: string[]): string | undefined {
  for (const key of keys) {
    if (row[key] !== undefined && row[key] !== null && row[key] !== '') {
      return String(row[key])
    }
  }
  const lower = Object.fromEntries(
    Object.entries(row).map(([k, v]) => [k.toLowerCase().trim(), v])
  )
  for (const key of keys) {
    const val = lower[key.toLowerCase()]
    if (val !== undefined && val !== null && val !== '') {
      return String(val)
    }
  }
  return undefined
}

export default function ImportCSV({ refetch, className = '' }: ImportCSVProps) {
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

          for (let i = 0; i < (results.data as Record<string, unknown>[]).length; i++) {
            const row = (results.data as Record<string, unknown>[])[i]
            const rawDate = getCell(row, [
              'date', 'Date', 'DATE', 'measurement date', 'Measurement Date',
            ])
            const rawWeight = getCell(row, ['weight', 'Weight', 'WEIGHT'])
            const rawBodyFat = getCell(row, [
              'body_fat', 'body fat', 'Body Fat', 'bodyFat', 'BODY_FAT', 'bf', 'BF',
            ])

            const weight = rawWeight ? parseCsvWeight(rawWeight) : NaN
            const parsedBodyFat = rawBodyFat ? parseFloat(cleanCsvCell(rawBodyFat).replace(/,/g, '')) : null

            if (!rawDate || isNaN(weight)) {
              errors.push(`Row ${i + 1}: missing or invalid date/weight`)
              continue
            }

            const isoDate = parseCsvDate(rawDate)
            if (!isoDate) {
              errors.push(`Row ${i + 1}: unrecognized date "${rawDate}"`)
              continue
            }

            const bodyFat = parsedBodyFat !== null && !isNaN(parsedBodyFat) ? parsedBodyFat : null
            const reading = readingToAggregate({ weight, body_fat: bodyFat })

            csvByDate[isoDate] = mergeAggregates(csvByDate[isoDate] || null, reading)
            totalLogs++
          }

          const uniqueDays = Object.keys(csvByDate).length

          if (totalLogs === 0) {
            toast.error('No valid measurements found in CSV')
            if (errors.length > 0) console.warn('CSV import errors:', errors)
            return
          }

          // Replace each date with CSV averages (idempotent — re-import won't double log_count)
          const records = Object.entries(csvByDate).map(([isoDate, agg]) => ({
            user_id: user.id,
            date: isoDate,
            weight: agg.weight,
            body_fat: agg.body_fat,
            log_count: agg.log_count,
            body_fat_log_count: agg.body_fat_log_count,
            logged_at: new Date().toISOString(),
          }))

          let daysUpdated = 0
          const BATCH_SIZE = 100

          for (let i = 0; i < records.length; i += BATCH_SIZE) {
            const batch = records.slice(i, i + BATCH_SIZE)
            const { error } = await supabase
              .from('measurements')
              .upsert(batch, { onConflict: 'user_id,date' })

            if (error) {
              for (const record of batch) {
                const { error: rowError } = await supabase
                  .from('measurements')
                  .upsert(record, { onConflict: 'user_id,date' })
                if (rowError) {
                  errors.push(`Error on ${record.date}: ${rowError.message}`)
                } else {
                  daysUpdated++
                }
              }
            } else {
              daysUpdated += batch.length
            }
          }

          if (daysUpdated > 0) {
            // Reset Withings dedup so Sync Now can merge on top of CSV data
            const { data: { session } } = await supabase.auth.getSession()
            if (session) {
              await fetch(apiUrl('/api/reset-withings-sync'), {
                method: 'POST',
                headers: { Authorization: `Bearer ${session.access_token}` },
              })
            }

            const failedDays = uniqueDays - daysUpdated
            toast.success(
              `Imported ${totalLogs} logs across ${daysUpdated} day${daysUpdated === 1 ? '' : 's'}` +
              (failedDays > 0 ? ` (${failedDays} failed)` : '') +
              `. Click Sync Now to add Withings data.`
            )
            await refetch()
          } else {
            toast.error('No measurements were imported')
          }

          if (errors.length > 0) {
            console.warn('CSV import errors:', errors)
            toast.error(`${errors.length} issues — open browser console (F12) for details`)
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
    <label className={`flex items-center justify-center gap-x-2 px-4 py-2.5 bg-zinc-800 hover:bg-zinc-700 rounded-2xl text-sm cursor-pointer transition-colors w-full ${className}`}>
      <Upload size={16} className="shrink-0" />
      <span className="truncate">{isImporting ? 'Importing...' : 'Import CSV'}</span>
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