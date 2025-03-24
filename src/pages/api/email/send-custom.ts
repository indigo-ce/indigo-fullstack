import type {APIRoute} from "astro";
import {sendEmail} from "@/utils/email";

export const prerender = false;

export const POST: APIRoute = async ({request, redirect}) => {
  console.log("🔔 Custom email API endpoint called");

  const formData = await request.formData();
  console.log("Form data received:", Object.fromEntries(formData.entries()));

  const to = formData.get("recipient") as string | null;
  const subject = formData.get("subject") as string | null;
  const html = formData.get("message") as string | null;
  const title = formData.get("title") as string | null;

  console.log(
    `Sending custom email - To: ${to}, Subject: ${subject}, Title: ${title || "Not provided"}`,
  );
  console.log(`HTML content length: ${html?.length || 0} characters`);

  if (!to || !subject || !html) {
    console.error("❌ Missing required fields for custom email");
    return new Response(JSON.stringify({error: "Missing required fields"}), {
      status: 400,
      headers: {
        "Content-Type": "application/json",
      },
    });
  }

  try {
    console.log("Attempting to send custom email...");
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
      console.log(`Redirecting to: ${redirectPath}`);
      return redirect(redirectPath);
    }

    console.log("Returning success response");
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
    console.error("❌ Custom email sending error:", error);
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
