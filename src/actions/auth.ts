import {ActionError, defineAction} from "astro:actions";
import {z} from "astro:schema";
import {auth} from "@/lib/auth";
import {APIError} from "better-auth/api";

export const authentication = {
  signIn: defineAction({
    accept: "form",
    input: z.object({
      email: z.string().email(),
      password: z.string(),
    }),
    handler: async ({email, password}) => {
      console.log(email, password);
      try {
        const {headers, response} = await auth.api.signInEmail({
          body: {email, password},
          returnHeaders: true,
        });

        if (!response.user) {
          throw new ActionError({
            code: "UNAUTHORIZED",
            message: "Invalid email or password",
          });
        }

        return {
          redirect: "/dashboard",
          cookies: headers.get("set-cookie") || "",
        };
      } catch (error) {
        if (error instanceof APIError) {
          if (error.status === "UNAUTHORIZED") {
            throw new ActionError({
              code: "UNAUTHORIZED",
              message: "Invalid email or password. Please try again.",
            });
          }

          if (error.status === "FORBIDDEN") {
            throw new ActionError({
              code: "FORBIDDEN",
              message: "Email not verified. Please verify your email.",
            });
          }
        }
      }
    },
  }),
  signUp: defineAction({
    accept: "form",
    input: z.object({
      name: z.string().min(2),
      email: z.string().email(),
      password: z.string().min(8),
    }),
    handler: async ({name, email, password}) => {
      try {
        const response = await auth.api.signUpEmail({
          body: {name, email, password},
          asResponse: true,
        });

        if (!response.ok) {
          throw new ActionError({
            code: "CONFLICT",
            message: "Email already exists",
          });
        }

        return new Response(null, {
          status: 302,
          headers: {
            Location: "/dashboard",
          },
        });
      } catch (error) {
        if (error instanceof APIError) {
          if (error.status === "CONFLICT") {
            throw new ActionError({
              code: "CONFLICT",
              message: "Email already exists. Please use a different email.",
            });
          } else {
            if (error.body?.code === "PASSWORD_TOO_SHORT") {
              throw new ActionError({
                code: "BAD_REQUEST",
                message: "Password must be at least 8 characters long.",
              });
            } else if (error.body?.code === "USER_ALREADY_EXISTS") {
              throw new ActionError({
                code: "BAD_REQUEST",
                message: "Email already exists. Please use a different email.",
              });
            } else {
              throw new ActionError({
                code: "BAD_REQUEST",
                message:
                  (error.body?.message || "An error occurred during sign up") +
                  ".",
              });
            }
          }
        }
      }
    },
  }),
  forgotPassword: defineAction({
    accept: "form",
    input: z.object({
      email: z.string().email(),
    }),
    handler: async ({email}) => {
      try {
        await auth.api.forgetPassword({
          body: {
            email,
            redirectTo: "/forgot-password?sent=true",
          },
        });
      } catch (error) {
        console.error(error);
        if (error instanceof APIError) {
          throw new ActionError({
            code: "BAD_REQUEST",
            message: "Failed to send reset link.",
          });
        }
      }
    },
  }),
  resetPassword: defineAction({
    input: z.object({
      newPassword: z.string(),
      confirmPassword: z.string(),
      token: z.string(),
    }),
    handler: async ({newPassword, confirmPassword, token}) => {
      if (newPassword !== confirmPassword) {
        throw new ActionError({
          code: "BAD_REQUEST",
          message: "Passwords do not match",
        });
      }

      const {status} = await auth.api.resetPassword({
        body: {
          newPassword: newPassword,
          token,
        },
      });

      if (status) {
        return {redirect: "/sign-in"};
      } else {
        throw new ActionError({
          code: "BAD_REQUEST",
          message: "Failed to reset password",
        });
      }
    },
  }),
};
