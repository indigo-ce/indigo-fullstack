import {AlertCircle} from "lucide-react";
import {cn} from "@/lib/utils";

interface ErrorMessageProps {
  message?: string;
  className?: string;
}

/**
 * Unified error message component for displaying all errors.
 * Place at the top of forms to show server errors, validation errors, or any error messages.
 * All errors should display here - no inline field errors.
 */
export function ErrorMessage({message, className}: ErrorMessageProps) {
  if (!message) return null;

  return (
    <div
      className={cn(
        "flex gap-3 rounded-md border border-destructive/20 bg-destructive/10 p-4",
        className
      )}
      role="alert"
    >
      <AlertCircle
        className="text-destructive mt-0.5 h-5 w-5 shrink-0"
        aria-hidden="true"
      />
      <p className="text-destructive text-sm">{message}</p>
    </div>
  );
}
