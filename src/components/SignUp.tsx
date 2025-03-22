import React, {useState} from "react";
import {Button} from "@/components/primitives/button";
import {Input} from "@/components/primitives/input";
import {EyeIcon, EyeOffIcon, LockIcon, MailIcon, UserIcon} from "lucide-react";
import {authClient} from "@/lib/auth-client";

interface SignUpProps {
  onSuccess?: () => void;
}

export function SignUp({onSuccess}: SignUpProps) {
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    try {
      const result = await authClient.signUp.email({
        name,
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
        setError(result.error?.message || "An error occurred during sign up");
      }
    } catch (err) {
      setError("An unexpected error occurred");
      console.error(err);
    }
  };

  const togglePasswordVisibility = () => {
    setShowPassword(!showPassword);
  };

  return (
    <div className="flex flex-col items-center justify-center w-full my-12 min-h-[70dvh]">
      <div className="w-full max-w-xs">
        <h1 className="text-2xl font-bold mb-8 text-center">Create Account</h1>

        {error && <p className="text-red-500 mb-4 text-sm">{error}</p>}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="relative flex items-center rounded-md border focus-within:ring-1 focus-within:ring-ring pl-2">
            <UserIcon className="h-5 w-5 text-muted-foreground" />
            <Input
              type="text"
              placeholder="Name"
              className="border-0 focus-visible:ring-0 shadow-none bg-transparent dark:bg-transparent"
              value={name}
              onChange={(e) => setName(e.target.value)}
              required
            />
          </div>

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

          <div className="relative flex items-center rounded-md border focus-within:ring-1 focus-within:ring-ring px-2">
            <LockIcon className="h-5 w-5 text-muted-foreground" />
            <Input
              type={showPassword ? "text" : "password"}
              placeholder="Password"
              className="border-0 focus-visible:ring-0 shadow-none bg-transparent dark:bg-transparent"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
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

          <Button type="submit" className="w-full">
            Sign Up
          </Button>

          <p className="text-center text-sm mt-4">
            Already have an account?{" "}
            <a href="/sign-in" className="text-primary underline">
              Sign in here
            </a>
          </p>
        </form>
      </div>
    </div>
  );
}
