import type { ReactNode } from 'react';

interface ModalProps {
  open: boolean;
  onClose: () => void;
  title: string;
  children: ReactNode;
}

export default function Modal({ open, onClose, title, children }: ModalProps) {
  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-[200] overflow-y-auto bg-black/40 backdrop-blur-sm"
      onClick={onClose}
    >
      {/* min-h-full (not h-full) so this wrapper grows past the viewport
          when the panel below can't shrink any further -- that's what lets
          the overlay itself scroll as a last resort on very short screens,
          instead of clipping the modal's top/bottom with no way to reach it. */}
      <div className="flex min-h-full items-start justify-center px-4 pb-4 pt-[100px]">
        <div
          // Fixed 100px from the top instead of vertically centered -- height
          // capped against what's left of the viewport below that offset, so
          // it still never runs off the bottom of the screen. flex-col + the
          // header's shrink-0 + the body's overflow-y-auto below is what keeps
          // the title/close button pinned in view while only the body scrolls
          // when content is too tall to fit.
          className="flex max-h-[calc(100vh-140px)] w-full max-w-[480px] flex-col overflow-hidden rounded-2xl border border-[#e8e8e8] bg-white shadow-[0_20px_25px_-5px_rgba(0,0,0,0.15),0_8px_10px_-6px_rgba(0,0,0,0.1)] animate-[fade-in-up_0.25s_cubic-bezier(0.16,1,0.3,1)_both]"
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
      </div>
    </div>
  );
}
