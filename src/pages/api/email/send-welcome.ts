import type { APIRoute } from "astro";
import { sendEmail } from "../../../utils/email";

export const prerender = false;

export const POST: APIRoute = async ({ request, redirect }) => {
  console.log("🔔 Welcome email API endpoint called");
  
  const formData = await request.formData();
  console.log("Form data received:", Object.fromEntries(formData.entries()));
  
  const to = formData.get("recipient") as string | null;
  const name = formData.get("name") as string | null;
  const subject = "Welcome to Astro Starter!";
  
  console.log(`Sending welcome email - To: ${to}, Name: ${name}, Subject: ${subject}`);

  if (!to || !name) {
    console.error("❌ Missing required fields for welcome email");
    return new Response(JSON.stringify({ error: "Missing required fields" }), {
      status: 400,
      headers: {
        "Content-Type": "application/json"
      }
    });
  }

  try {
    await sendEmail({ to, subject, template: { name: "welcome", params: { name } } });
    console.log("✅ Welcome email sent successfully");
    
    // If redirectPath was provided in form data, redirect there
    const redirectPath = formData.get("redirectPath") as string | null;
    if (redirectPath) {
      console.log(`Redirecting to: ${redirectPath}`);
      return redirect(redirectPath);
    }
    
    console.log("Returning success response");
    return new Response(JSON.stringify({ 
      success: true,
      message: "Welcome email sent successfully"
    }), {
      status: 200,
      headers: {
        "Content-Type": "application/json"
      }
    });
  } catch (error) {
    console.error("❌ Welcome email sending error:", error);
    return new Response(JSON.stringify({ 
      error: "Failed to send welcome email",
      details: error instanceof Error ? error.message : String(error)
    }), {
      status: 500,
      headers: {
        "Content-Type": "application/json"
      }
    });
  }
};