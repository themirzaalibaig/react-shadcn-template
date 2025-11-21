import { useMemo, useCallback, useState } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { testSchema } from '@/features/tests'
import { useTests } from '@/features/tests'
import { Button, Input } from '@/components/ui'

export const TestsPage = () => {
  const { items, create, update, remove, api } = useTests()
  const [selectedId, setSelectedId] = useState<number | null>(null)
  const form = useForm({ resolver: zodResolver(testSchema), defaultValues: { name: '', status: 'active' } })

  const onCreate = useCallback(() => {
    const v = form.getValues()
    const status = (v.status ?? 'active') as 'active' | 'inactive'
    const payload = { id: Math.floor(Math.random() * 100000), name: v.name, status }
    create(payload)
    form.reset({ name: '', status: 'active' })
  }, [form, create])

  const onUpdate = useCallback(() => {
    if (selectedId == null) return
    const v = form.getValues()
    const status = (v.status ?? 'active') as 'active' | 'inactive'
    update({ id: selectedId, name: v.name, status })
  }, [selectedId, form, update])

  const onDelete = useCallback(() => {
    if (selectedId == null) return
    remove(selectedId)
    setSelectedId(null)
  }, [selectedId, remove])

  const list = useMemo(() => (Array.isArray(items) ? items.slice(0, 10) : []), [items])

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2">
        <Input placeholder="Name" {...form.register('name')} className="w-48" />
        <select {...form.register('status')} className="border px-2 py-1 rounded">
          <option value="active">active</option>
          <option value="inactive">inactive</option>
        </select>
        <Button onClick={onCreate} variant="outline">Create</Button>
        <Button onClick={onUpdate} variant="outline" disabled={selectedId == null}>Update</Button>
        <Button onClick={onDelete} variant="destructive" disabled={selectedId == null}>Delete</Button>
        <Button onClick={api.refetch} variant="outline">Refetch</Button>
      </div>
      <div className="text-sm">Status: {api.status} • Loading: {String(api.isLoading)} • Error: {String(api.isError)}</div>
      <ul className="space-y-1">
        {list.map((t) => (
          <li key={t.id} className="border rounded px-2 py-1 flex justify-between">
            <button className="text-left" onClick={() => setSelectedId(Number(t.id))}>{t.name} ({t.status})</button>
            <span>{selectedId === Number(t.id) ? 'selected' : ''}</span>
          </li>
        ))}
      </ul>
    </div>
  )
}