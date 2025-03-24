import type {APIRoute} from "astro";
import {sendEmail} from "@/utils/email";

export const prerender = false;

export const POST: APIRoute = async ({request, redirect}) => {
  const formData = await request.formData();
  const to = formData.get("recipient") as string | null;
  const subject = formData.get("subject") as string | null;
  const html = formData.get("message") as string | null;
  const title = formData.get("title") as string | null;

  if (!to || !subject || !html) {
    return new Response(JSON.stringify({error: "Missing required fields"}), {
      status: 400,
      headers: {
        "Content-Type": "application/json",
      },
    });
  }

  try {
    await sendEmail({
      to,
      subject,
      template: {
        name: "custom",
        params: {
          html,
          title: title || undefined,
        },
      },
    });

    // If redirectPath was provided in form data, redirect there
    const redirectPath = formData.get("redirectPath") as string | null;
    if (redirectPath) {
      return redirect(redirectPath);
    }

    return new Response(
      JSON.stringify({
        success: true,
        message: "Custom email sent successfully",
      }),
      {
        status: 200,
        headers: {
          "Content-Type": "application/json",
        },
      },
    );
  } catch (error) {
    console.error("Email sending error:", error);
    return new Response(
      JSON.stringify({
        error: "Failed to send custom email",
        details: error instanceof Error ? error.message : String(error),
      }),
      {
        status: 500,
        headers: {
          "Content-Type": "application/json",
        },
      },
    );
  }
};
