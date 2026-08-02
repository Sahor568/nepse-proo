import React from "react";

export interface GuestAccessPromptProps {
  open: boolean;
  onLogin: () => void;
  onCancel: () => void;
  message?: string;
}

const GuestAccessPrompt: React.FC<GuestAccessPromptProps> = ({ open, onLogin, onCancel, message }) => {
  if (!open) return null;

  return (
    <div className="fixed inset-0 flex items-center justify-center z-50 bg-black/40">
      <div className="bg-panel border border-border rounded-xl shadow-lg p-6 min-w-[320px] max-w-[90vw] mx-auto">
        <p className="mb-6 text-center text-white font-semibold text-base">
          {message || 'You need to login to access this feature. Continue?'}
        </p>
        <div className="flex gap-3 justify-center">
          <button
            className="btn btn-primary"
            onClick={onLogin}
          >
            Continue Login
          </button>
          <button
            className="btn btn-ghost"
            onClick={onCancel}
          >
            No
          </button>
        </div>
      </div>
    </div>
  );
};

export default GuestAccessPrompt;
