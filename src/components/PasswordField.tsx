import * as React from "react";
import {Eye, EyeOff} from "lucide-react";
import {Input} from "@/components/ui/input";

interface PasswordFieldProps
  extends React.InputHTMLAttributes<HTMLInputElement> {
  className?: string;
}

export function PasswordField({className, ...props}: PasswordFieldProps) {
  const [showPassword, setShowPassword] = React.useState(false);

  return (
    <div className="relative">
      <Input
        {...props}
        type={showPassword ? "text" : "password"}
        className={className}
      />
      <button
        type="button"
        className="text-muted-foreground hover:text-foreground absolute top-1/2 right-3 -translate-y-1/2"
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
