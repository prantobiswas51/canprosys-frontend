import type { ReactNode } from 'react';
import { createPortal } from 'react-dom';

interface ModalProps {
  open: boolean;
  onClose: () => void;
  title: string;
  children: ReactNode;
}

export default function Modal({ open, onClose, title, children }: ModalProps) {
  if (!open) return null;

  // Portaled straight onto <body> -- MainLayout's content column uses
  // backdrop-blur (for its own glass effect), and CSS backdrop-filter (like
  // transform/filter/perspective) creates a new containing block for any
  // `position: fixed` descendant. Rendered in-place, this overlay would be
  // fixed relative to THAT blurred box instead of the real viewport, so it
  // wouldn't cover the sidebar/header and "the middle" would mean the
  // middle of the content column, not the screen. Escaping to document.body
  // via a portal sidesteps that entirely -- this is the standard way to
  // build a modal in React for exactly this reason.
  return createPortal(
    <div
      className="fixed inset-0 z-[200] flex items-center justify-center overflow-y-auto bg-black/40 backdrop-blur-sm p-4"
      onClick={onClose}
    >
      <div
        // Vertically centered against the actual screen height (flex
        // items-center above), capped so it never runs off the top/bottom
        // on short screens -- flex-col + the header's shrink-0 + the body's
        // overflow-y-auto below keeps the title/close button pinned in view
        // while only the body scrolls when content is too tall to fit.
        className="flex max-h-[90vh] w-full max-w-[480px] flex-col overflow-hidden rounded-2xl border border-[#e8e8e8] bg-white shadow-[0_20px_25px_-5px_rgba(0,0,0,0.15),0_8px_10px_-6px_rgba(0,0,0,0.1)] animate-[fade-in-up_0.25s_cubic-bezier(0.16,1,0.3,1)_both]"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex shrink-0 items-center justify-between border-b border-[#e8e8e8] px-6 py-4">
          <h3 className="text-[1.05rem] font-extrabold text-[#1E1E1E]">{title}</h3>
          <button
            type="button"
            onClick={onClose}
            className="flex h-8 w-8 items-center justify-center rounded-lg text-[#545454] hover:bg-[#f8fafc] hover:text-[#1E1E1E] transition-colors duration-200 cursor-pointer"
          >
            <i className="fa-solid fa-xmark" />
          </button>
        </div>
        <div className="overflow-y-auto px-6 py-5">{children}</div>
      </div>
    </div>,
    document.body,
  );
}
