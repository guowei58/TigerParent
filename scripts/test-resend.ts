import { sendAuthEmail } from "../src/lib/email";

async function main() {
  try {
    await sendAuthEmail({
      to: "guowei58@gmail.com",
      subject: "TigerParent test",
      title: "Test",
      body: "If you see this, email works.",
      actionLabel: "Open app",
      actionUrl: "http://localhost:3001/login",
    });
    console.log("Email sent successfully");
  } catch (error) {
    console.error("Send failed:", error);
  }
}

main();
