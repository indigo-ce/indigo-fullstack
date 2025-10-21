import {useTheme} from "next-themes";
import {Toaster as Sonner, type ToasterProps} from "sonner";
import {AlertCircle, CheckCircle, Info} from "lucide-react";

const Toaster = ({...props}: ToasterProps) => {
  const {theme = "system"} = useTheme();

  return (
    <Sonner
      theme={theme as ToasterProps["theme"]}
      className="toaster group"
      style={
        {
          "--normal-bg": "var(--popover)",
          "--normal-text": "var(--popover-foreground)",
          "--normal-border": "var(--border)"
        } as React.CSSProperties
      }
      icons={{
        success: <CheckCircle className="h-5 w-5" />,
        error: <AlertCircle className="h-5 w-5" />,
        info: <Info className="h-5 w-5" />
      }}
      {...props}
    />
  );
};

export {Toaster};
