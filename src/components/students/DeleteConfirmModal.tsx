import { AlertCircle } from 'lucide-react';
import { Modal } from '../ui/Modal';
import { Button } from '../ui/Button';

interface DeleteConfirmModalProps {
  onClose: () => void;
  onConfirm: () => void;
}

export function DeleteConfirmModal({ onClose, onConfirm }: DeleteConfirmModalProps) {
  return (
    <Modal onClose={onClose} title="System Deletion Authority">
      <div className="space-y-6 -m-2">
        <div className="flex items-center gap-4 text-rose-600 bg-rose-50 p-4 rounded-3xl border border-rose-100">
          <div className="w-12 h-12 bg-rose-600 rounded-2xl flex items-center justify-center text-white shrink-0 shadow-lg shadow-rose-200">
            <AlertCircle className="w-6 h-6" />
          </div>
          <div>
            <h4 className="font-bold">Permanent Delete</h4>
            <p className="text-[10px] uppercase font-bold tracking-widest opacity-70">Security Protocol Alpha-6</p>
          </div>
        </div>

        <p className="text-slate-600 text-sm leading-relaxed px-2 text-center font-medium">
          You are about to permanently remove this record from the system.
          This action is <span className="text-rose-600 font-bold underline decoration-rose-200">irreversible</span>.
        </p>

        <div className="flex gap-3">
          <Button
            variant="ghost"
            onClick={onClose}
            className="flex-1 h-12 rounded-2xl border-slate-200 font-bold uppercase tracking-widest text-xs"
          >
            Go Back
          </Button>
          <Button
            onClick={onConfirm}
            className="flex-1 h-12 rounded-2xl bg-rose-600 hover:bg-rose-700 text-white font-bold uppercase tracking-widest text-xs shadow-xl shadow-rose-100"
          >
            Confirm Removal
          </Button>
        </div>
      </div>
    </Modal>
  );
}
