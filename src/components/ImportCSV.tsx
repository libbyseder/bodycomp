import { useState } from 'react'
import Papa from 'papaparse'
import { supabase } from '../lib/supabase'
import { parseCsvDate, buildLoggedAt } from '../lib/parseCsvDate'
import { Upload } from 'lucide-react'
import toast from 'react-hot-toast'

interface ImportCSVProps {
  refetch: () => Promise<void>
}

interface CsvRow {
  isoDate: string
  weight: number
  bodyFat: number | null
  loggedAt: string
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
          const validRows: CsvRow[] = []

          for (let i = 0; i < (results.data as any[]).length; i++) {
            const row = (results.data as any[])[i]
            const rawDate = row.date || row.Date || row.DATE
            const weight = parseFloat(row.weight || row.Weight || row.WEIGHT)
            const rawBodyFat = row.body_fat || row['body fat'] || row['Body Fat'] || row.bodyFat
            const parsedBodyFat =
              rawBodyFat !== undefined && rawBodyFat !== '' && rawBodyFat !== null
                ? parseFloat(rawBodyFat)
                : null
            const rawTime = row.time || row.Time || row.TIME

            if (!rawDate || isNaN(weight)) {
              errors.push(`Row ${i + 1}: missing or invalid date/weight`)
              continue
            }

            const isoDate = parseCsvDate(String(rawDate))
            if (!isoDate) {
              errors.push(`Row ${i + 1}: unrecognized date format "${rawDate}"`)
              continue
            }

            const loggedAt = buildLoggedAt(isoDate, rawTime ? String(rawTime) : undefined, i)
            if (!loggedAt) {
              errors.push(`Row ${i + 1}: could not parse time for date "${isoDate}"`)
              continue
            }

            validRows.push({
              isoDate,
              weight,
              bodyFat: parsedBodyFat !== null && !isNaN(parsedBodyFat) ? parsedBodyFat : null,
              loggedAt,
            })
          }

          if (validRows.length === 0) {
            toast.error('No valid measurements found in CSV')
            if (errors.length > 0) console.warn('CSV import errors:', errors)
            return
          }

          // Insert in batches to reduce timeouts on large files
          const BATCH_SIZE = 50
          let imported = 0

          for (let i = 0; i < validRows.length; i += BATCH_SIZE) {
            const batch = validRows.slice(i, i + BATCH_SIZE).map((row) => {
              const record: {
                user_id: string
                date: string
                logged_at: string
                weight: number
                body_fat?: number
              } = {
                user_id: user.id,
                date: row.isoDate,
                logged_at: row.loggedAt,
                weight: row.weight,
              }
              if (row.bodyFat !== null) {
                record.body_fat = row.bodyFat
              }
              return record
            })

            const { error } = await supabase.from('measurements').insert(batch)

            if (error) {
              // Fall back to one-by-one so a single bad row doesn't drop the whole batch
              for (const record of batch) {
                const { error: rowError } = await supabase.from('measurements').insert(record)
                if (rowError) {
                  errors.push(`Error on ${record.date}: ${rowError.message}`)
                } else {
                  imported++
                }
              }
            } else {
              imported += batch.length
            }
          }

          if (imported > 0) {
            const skipped = validRows.length - imported
            if (skipped > 0) {
              toast.success(`Imported ${imported} of ${validRows.length} measurements`)
            } else {
              toast.success(`Imported ${imported} measurements from CSV`)
            }
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