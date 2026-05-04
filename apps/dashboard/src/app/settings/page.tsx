import { SettingsForm } from "@/components/settings-form";
import { PricingEditor } from "@/components/pricing-editor";
import { BrandEditor } from "@/components/brand-editor";
import Link from "next/link";

export default function SettingsPage() {
  return (
    <div className="mx-auto w-full max-w-4xl space-y-6">
      <div className="flex items-baseline justify-between gap-3 flex-wrap">
        <h2 className="text-xl font-semibold">Settings</h2>
        <div className="flex items-center gap-3 text-xs">
          <Link href="/settings/currency" className="text-accent hover:underline">/settings/currency</Link>
          <Link href="/settings/pricing" className="text-accent hover:underline">/settings/pricing</Link>
        </div>
      </div>
      <BrandEditor />
      <SettingsForm />
      <PricingEditor />
    </div>
  );
}
