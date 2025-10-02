import * as React from "react";
import {Eye, EyeOff, Lock} from "lucide-react";
import {Input} from "@/components/ui/input";
import {cn} from "@/lib/utils";

interface PasswordFieldProps
  extends React.InputHTMLAttributes<HTMLInputElement> {
  className?: string;
}

export function PasswordField({className, ...props}: PasswordFieldProps) {
  const [showPassword, setShowPassword] = React.useState(false);

  return (
    <div
      className={cn(
        "focus-within:ring-ring relative flex items-center rounded-md border pl-2 focus-within:ring-1",
        className
      )}
    >
      <Lock className="text-muted-foreground mr-1 h-5 w-5" />
      <Input
        {...props}
        type={showPassword ? "text" : "password"}
        className="border-0 bg-transparent pr-10 shadow-none focus-visible:ring-0 dark:bg-transparent"
      />
      <button
        type="button"
        className="text-muted-foreground hover:text-foreground absolute right-3"
        onClick={() => setShowPassword(!showPassword)}
        aria-label={showPassword ? "Hide password" : "Show password"}
      >
        {showPassword ? (
          <EyeOff className="h-4 w-4" />
        ) : (
          <Eye className="h-4 w-4" />
        )}
      </button>
    </div>
  );
}
