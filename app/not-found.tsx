import Link from "next/link";
import { DexShell } from "../components/dex-shell.tsx";

/** What the device shows for an entry it does not hold. */
export default function NotFound() {
  return (
    <DexShell lens="#9e9e9e">
      <main className="p-6 sm:p-10">
        <h1 className="text-2xl font-bold">That entry is not in the Dex.</h1>
        <p className="mt-3">
          <Link href="/" className="font-bold underline decoration-shell decoration-2 underline-offset-4">
            Back to the list
          </Link>
        </p>
      </main>
    </DexShell>
  );
}
