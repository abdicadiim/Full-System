import React, { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";

export function HelpTooltip({ text, children }: { text: React.ReactNode; children: React.ReactNode }) {
  const [show, setShow] = useState(false);
  const [position, setPosition] = useState({ top: 0, left: 0 });
  const targetRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (show && targetRef.current) {
      const rect = targetRef.current.getBoundingClientRect();
      setPosition({
        top: rect.top - 10,
        left: rect.left + rect.width / 2,
      });
    }
  }, [show]);

  return (
    <div
      ref={targetRef}
      className="inline-block relative"
      onMouseEnter={() => setShow(true)}
      onMouseLeave={() => setShow(false)}
    >
      {children}
      {show && createPortal(
        <div
          className="fixed z-[999999] pointer-events-none"
          style={{
            top: `${position.top}px`,
            left: `${position.left}px`,
            transform: "translate(-50%, -100%)",
          }}
        >
          <div className="bg-[#1f2937] text-white text-[13px] leading-relaxed py-3 px-4 rounded-lg shadow-xl max-w-[320px] relative font-medium text-left">
            {text}
            <div className="absolute top-full left-1/2 -translate-x-1/2 border-[6px] border-transparent border-t-[#1f2937]" />
          </div>
        </div>,
        document.body
      )}
    </div>
  );
}
