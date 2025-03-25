"use server";

import { Resend } from "resend";

export async function sendEmail({
  to,
  subject,
  react,
}: {
  to: string | string[];
  subject: string;
  react: React.ReactNode;
}) {
  const resend = new Resend(process.env.RESEND_API_KEY || "");

  try {
    console.log("From sendEmail");
    console.table({ to, subject, react });
    const data = await resend.emails.send({
      from: "Bachat <onboarding@resend.dev>",
      to:
        process.env.NODE_ENV === "development"
          ? process.env.MY_EMAIL || ""
          : to,
      subject,
      react,
    });

    console.log("Email sent:", data);
    return { success: true, data };
  } catch (error) {
    console.error("Failed to send email:", error);
    return { success: false, error };
  }
}
