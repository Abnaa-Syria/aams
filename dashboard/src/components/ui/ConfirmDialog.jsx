import Modal from './Modal';

export default function ConfirmDialog({ isOpen, onClose, onConfirm, title = 'تأكيد', message, confirmText = 'تأكيد', danger = false }) {
  return (
    <Modal isOpen={isOpen} onClose={onClose} title={title} width={400}>
      <p style={{ marginBottom: 24, color: 'var(--text-secondary)' }}>{message}</p>
      <div style={{ display: 'flex', gap: 12, justifyContent: 'flex-start' }}>
        <button className={danger ? 'btn btn-danger' : 'btn btn-primary'} onClick={onConfirm}>{confirmText}</button>
        <button className="btn btn-secondary" onClick={onClose}>إلغاء</button>
      </div>
    </Modal>
  );
}
