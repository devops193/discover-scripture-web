'use client';

import { useCallback, useEffect, useRef, useState } from 'react';

type MoreInfoButtonProps = {
  label?: string;
  message?: string;
  className?: string;
  ariaLabel?: string;
};

const DEFAULT_MESSAGE = 'Check back for additional information.';

export function MoreInfoButton({
  label = 'More Info',
  message = DEFAULT_MESSAGE,
  className,
  ariaLabel,
}: MoreInfoButtonProps) {
  const dialogRef = useRef<HTMLDialogElement | null>(null);
  const [open, setOpen] = useState(false);

  const close = useCallback(() => {
    const dialog = dialogRef.current;
    if (dialog && dialog.open) dialog.close();
    setOpen(false);
  }, []);

  const openDialog = useCallback(() => {
    const dialog = dialogRef.current;
    if (!dialog) return;
    if (typeof dialog.showModal === 'function') {
      if (!dialog.open) dialog.showModal();
    } else {
      dialog.setAttribute('open', '');
    }
    setOpen(true);
  }, []);

  useEffect(() => {
    if (!open) return;
    function onKey(event: KeyboardEvent) {
      if (event.key === 'Escape') close();
    }
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [open, close]);

  function onBackdropClick(event: React.MouseEvent<HTMLDialogElement>) {
    if (event.target === dialogRef.current) close();
  }

  const buttonClass = className ? `more-info-btn ${className}` : 'more-info-btn';

  return (
    <>
      <button
        type="button"
        className={buttonClass}
        onClick={openDialog}
        aria-haspopup="dialog"
        aria-label={ariaLabel}
      >
        {label}
      </button>
      <dialog
        ref={dialogRef}
        className="more-info-dialog"
        aria-labelledby="more-info-title"
        onClose={() => setOpen(false)}
        onClick={onBackdropClick}
      >
        <div className="more-info-dialog-body">
          <h2 id="more-info-title" className="more-info-dialog-title">More info</h2>
          <p className="more-info-dialog-message">{message}</p>
          <div className="more-info-dialog-actions">
            <button type="button" className="button" onClick={close} autoFocus>Close</button>
          </div>
        </div>
      </dialog>
    </>
  );
}
