import { useState, useRef, useEffect } from "react";
import { Manifest } from "../domain/types";

interface Props {
  manifest: Manifest;
  categoryId: string;
  graphId: string;
  onMove: (targetCategoryId: string) => void;
  onDelete: () => void;
}

export default function GraphManagementMenu({
  manifest,
  categoryId,
  graphId,
  onMove,
  onDelete,
}: Props) {
  const [open, setOpen] = useState(false);
  const [moveOpen, setMoveOpen] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setOpen(false);
        setMoveOpen(false);
        setConfirmDelete(false);
      }
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  const otherCategories = manifest.categories.filter(
    (c) => c.id !== categoryId
  );

  return (
    <div className="mgmt-wrapper" ref={menuRef}>
      <button
        className="btn btn-secondary mgmt-trigger"
        onClick={() => {
          setOpen(!open);
          setMoveOpen(false);
          setConfirmDelete(false);
        }}
        aria-label="Graph actions"
      >
        ⋯
      </button>

      {open && (
        <div className="mgmt-menu">
          {otherCategories.length > 0 && (
            <button
              className="mgmt-item"
              onClick={() => {
                setMoveOpen(!moveOpen);
                setConfirmDelete(false);
              }}
            >
              Move to category…
            </button>
          )}

          {moveOpen && (
            <div className="mgmt-submenu">
              {otherCategories.map((c) => (
                <button
                  key={c.id}
                  className="mgmt-item"
                  onClick={() => {
                    onMove(c.id);
                    setOpen(false);
                    setMoveOpen(false);
                  }}
                >
                  → {c.label}
                </button>
              ))}
            </div>
          )}

          <button
            className="mgmt-item mgmt-danger"
            onClick={() => {
              if (confirmDelete) {
                onDelete();
                setOpen(false);
                setConfirmDelete(false);
              } else {
                setConfirmDelete(true);
                setMoveOpen(false);
              }
            }}
          >
            {confirmDelete
              ? `Confirm delete "${graphId}"?`
              : "Delete graph…"}
          </button>
        </div>
      )}
    </div>
  );
}
