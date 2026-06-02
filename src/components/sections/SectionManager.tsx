import type React from 'react';
import { useState } from 'react';
import { Loader2, Plus, Trash2, Edit2, X, Check } from 'lucide-react';
import type { Section, Student } from '../../types';
import { Button } from '../ui/Button';
import { Input } from '../ui/Input';
import { Modal } from '../ui/Modal';

interface SectionFormProps {
  initial?: Section;
  onSubmit: (name: string, description: string) => Promise<void>;
  onCancel: () => void;
}

export function SectionForm({ initial, onSubmit, onCancel }: SectionFormProps) {
  const [name, setName] = useState(initial?.name ?? '');
  const [description, setDescription] = useState(initial?.description ?? '');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;
    setLoading(true);
    try {
      await onSubmit(name.trim(), description.trim());
    } finally {
      setLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div>
        <label className="text-xs font-semibold text-text-muted uppercase tracking-wide">Section Name</label>
        <Input
          value={name}
          onChange={e => setName(e.target.value)}
          placeholder="e.g. Daycare 1"
          required
          className="mt-1"
        />
      </div>
      <div>
        <label className="text-xs font-semibold text-text-muted uppercase tracking-wide">Description (optional)</label>
        <Input
          value={description}
          onChange={e => setDescription(e.target.value)}
          placeholder="e.g. Ages 3-4"
          className="mt-1"
        />
      </div>
      <div className="flex gap-2 pt-2">
        <Button type="button" variant="ghost" onClick={onCancel} className="flex-1">Cancel</Button>
        <Button type="submit" disabled={loading || !name.trim()} className="flex-1">
          {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : initial ? 'Update' : 'Create'}
        </Button>
      </div>
    </form>
  );
}

interface SectionManagerProps {
  sections: Section[];
  students: Student[];
  onCreate: (name: string, description: string) => Promise<void>;
  onUpdate: (section: Section) => Promise<void>;
  onDelete: (sectionId: string) => Promise<void>;
  onClose: () => void;
}

export function SectionManager({
  sections,
  students,
  onCreate,
  onUpdate,
  onDelete,
  onClose,
}: SectionManagerProps) {
  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState<Section | null>(null);

  const studentCountBySection = (sectionId: string) =>
    students.filter(s => s.sectionId === sectionId).length;

  return (
    <Modal onClose={onClose} title="Manage Sections">
      <div className="space-y-4">
        <p className="text-sm text-text-muted">
          Create daycare sections first, then assign students when adding or editing their profiles.
        </p>

        {!showForm && !editing && (
          <Button onClick={() => setShowForm(true)} className="w-full">
            <Plus className="w-4 h-4 mr-2" /> Add Section
          </Button>
        )}

        {(showForm || editing) && (
          <SectionForm
            initial={editing ?? undefined}
            onSubmit={async (name, description) => {
              if (editing) {
                await onUpdate({ ...editing, name, description });
                setEditing(null);
              } else {
                await onCreate(name, description);
                setShowForm(false);
              }
            }}
            onCancel={() => { setShowForm(false); setEditing(null); }}
          />
        )}

        <div className="space-y-2 max-h-64 overflow-y-auto scrollbar-thin">
          {sections.length === 0 ? (
            <p className="text-sm text-text-muted text-center py-6">No sections yet. Create Daycare 1, Daycare 2, etc.</p>
          ) : (
            sections.map(section => {
              const count = studentCountBySection(section.id);
              return (
                <div key={section.id} className="flex items-center justify-between p-3 rounded-xl border border-border bg-surface">
                  <div>
                    <p className="font-semibold text-text">{section.name}</p>
                    {section.description && (
                      <p className="text-xs text-text-muted">{section.description}</p>
                    )}
                    <p className="text-xs text-primary mt-0.5">{count} student{count !== 1 ? 's' : ''}</p>
                  </div>
                  <div className="flex gap-1">
                    <button
                      onClick={() => { setEditing(section); setShowForm(false); }}
                      className="p-2 text-text-muted hover:text-primary rounded-lg hover:bg-primary-light"
                    >
                      <Edit2 className="w-4 h-4" />
                    </button>
                    <button
                      onClick={() => {
                        if (count > 0) {
                          alert(`Cannot delete "${section.name}" — ${count} student(s) are assigned. Reassign them first.`);
                          return;
                        }
                        if (confirm(`Delete section "${section.name}"?`)) onDelete(section.id);
                      }}
                      className="p-2 text-text-muted hover:text-danger rounded-lg hover:bg-danger-light"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              );
            })
          )}
        </div>
      </div>
    </Modal>
  );
}
