import * as React from "react";
import {Input} from "@/components/ui/input";
import {cn} from "@/lib/utils";
import * as LucideIcons from "lucide-react";

type IconName = keyof typeof LucideIcons;

interface IconInputFieldProps
  extends React.InputHTMLAttributes<HTMLInputElement> {
  className?: string;
  iconName?: IconName;
}

export function IconInputField({
  className,
  iconName,
  ...props
}: IconInputFieldProps) {
  const Icon = iconName
    ? (LucideIcons[iconName] as React.ComponentType<{className?: string}>)
    : null;

  return (
    <div
      className={cn(
        "focus-within:ring-ring relative flex items-center rounded-md border focus-within:ring-1",
        Icon ? "pl-2" : "px-2",
        className
      )}
    >
      {Icon && <Icon className="text-muted-foreground mr-1 h-5 w-5" />}
      <Input
        {...props}
        className="border-0 bg-transparent shadow-none focus-visible:ring-0 dark:bg-transparent"
      />
    </div>
  );
}
