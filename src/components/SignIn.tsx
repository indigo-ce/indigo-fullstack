import React, {useState} from "react";
import {Button} from "@/components/primitives/button";
import {Input} from "@/components/primitives/input";
import {EyeIcon, EyeOffIcon, LockIcon, MailIcon} from "lucide-react";
import {authClient} from "@/lib/auth-client";

interface PasswordFieldProps {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  required?: boolean;
}

function PasswordField({
  value,
  onChange,
  placeholder = "Password",
  required = false,
}: PasswordFieldProps) {
  const [showPassword, setShowPassword] = useState(false);

  const togglePasswordVisibility = () => {
    setShowPassword(!showPassword);
  };

  return (
    <div className="relative flex items-center rounded-md border focus-within:ring-1 focus-within:ring-ring px-2">
      <LockIcon className="h-5 w-5 text-muted-foreground" />
      <Input
        type={showPassword ? "text" : "password"}
        placeholder={placeholder}
        className="border-0 focus-visible:ring-0 shadow-none bg-transparent dark:bg-transparent"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        required={required}
      />
      <button
        type="button"
        onClick={togglePasswordVisibility}
        className="focus:outline-none"
      >
        {showPassword ? (
          <EyeOffIcon className="h-5 w-5 text-muted-foreground" />
        ) : (
          <EyeIcon className="h-5 w-5 text-muted-foreground" />
        )}
      </button>
    </div>
  );
}

interface SignInProps {
  onSuccess?: () => void;
}

export function SignIn({onSuccess}: SignInProps) {
  const [error, setError] = useState<string | null>(null);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    try {
      const result = await authClient.signIn.email({
        email,
        password,
      });

      if (Boolean(result.error) === false) {
        if (onSuccess) {
          onSuccess();
        } else {
          window.location.href = "/";
        }
      } else {
        setError(result.error?.message || "An error occurred during sign in");
      }
    } catch (err) {
      setError("An unexpected error occurred");
      console.error(err);
    }
  };

  return (
    <div className="flex flex-col items-center justify-center w-full my-12 min-h-[70dvh]">
      <div className="w-full max-w-xs">
        <h1 className="text-2xl font-bold mb-8 text-center">Sign In</h1>

        {error && <p className="text-red-500 mb-4 text-sm">{error}</p>}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="relative flex items-center rounded-md border focus-within:ring-1 focus-within:ring-ring pl-2">
            <MailIcon className="h-5 w-5 text-muted-foreground" />
            <Input
              type="email"
              placeholder="Email"
              className="border-0 focus-visible:ring-0 shadow-none bg-transparent dark:bg-transparent"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
            />
          </div>

          <PasswordField value={password} onChange={setPassword} required />

          <Button type="submit" className="w-full">
            Sign In
          </Button>

          <p className="text-center text-sm mt-4">
            Don't have an account?{" "}
            <a href="/sign-up" className="text-primary underline">
              Sign up here
            </a>
          </p>
        </form>
      </div>
    </div>
  );
}
