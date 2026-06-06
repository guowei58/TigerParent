import Link from "next/link";
import {
  AuthInlineLink,
  AuthLinkRow,
  AuthMessage,
  AuthShell,
} from "@/components/auth/AuthShell";
import { Button } from "@/components/ui/Button";
import { SIGNUP_CLOSED_MESSAGE } from "@/lib/signup-policy";

export default function SignupPage() {
  return (
    <AuthShell
      title="TigerParent"
      subtitle="Accounts are invite-only"
      footer={
        <AuthLinkRow>
          <p>
            Already have an account? <AuthInlineLink href="/login">Sign in</AuthInlineLink>
          </p>
        </AuthLinkRow>
      }
    >
      <AuthMessage tone="error">{SIGNUP_CLOSED_MESSAGE}</AuthMessage>
      <Link href="/login" className="block mt-4">
        <Button type="button" variant="secondary" size="lg" className="w-full">
          Back to sign in
        </Button>
      </Link>
    </AuthShell>
  );
}
