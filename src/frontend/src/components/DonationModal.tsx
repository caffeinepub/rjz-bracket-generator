import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Bitcoin, Copy, Heart } from "lucide-react";
import { toast } from "sonner";

const CRYPTO = [
  {
    label: "Bitcoin (BTC)",
    address: "bc1qldmtgspmhlu7qtfdrsuy96rkaxugs2jglu2k0v",
  },
  {
    label: "USDT / USDC (ETH)",
    address: "0x747b25AdfB6cec93c4A0f6B7B952DAee6c7b799b",
  },
  {
    label: "USDT / USDC (SOL)",
    address: "8c9bSHWgf6Fk5KVtdsQTGhpyotRXzQq932Bc2yZTGbFu",
  },
];

const PAYPAL = "admin@rocketjump.zone";

function CopyRow({ label, value }: { label: string; value: string }) {
  const copy = () => {
    navigator.clipboard.writeText(value);
    toast.success(`${label} address copied!`);
  };
  return (
    <div className="rounded-lg border border-border bg-background p-3">
      <p className="mb-1 font-display text-[10px] font-bold uppercase tracking-widest text-muted-foreground">
        {label}
      </p>
      <div className="flex items-center gap-2">
        <code className="flex-1 truncate text-xs text-foreground">{value}</code>
        <button
          type="button"
          onClick={copy}
          className="shrink-0 rounded p-1 text-muted-foreground hover:text-foreground transition-colors"
          title="Copy"
        >
          <Copy className="h-3.5 w-3.5" />
        </button>
      </div>
    </div>
  );
}

interface Props {
  open: boolean;
  onClose: () => void;
}

export default function DonationModal({ open, onClose }: Props) {
  return (
    <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="max-w-md border-primary/30 bg-card">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 font-display text-xl font-black uppercase tracking-wide text-foreground">
            <Heart className="h-5 w-5 text-primary" />
            Support the Platform
          </DialogTitle>
        </DialogHeader>

        <p className="text-sm text-muted-foreground">
          Do you enjoy using RJZ Bracket Generator? Consider making a donation
          to help keep the platform free and running for everyone.
        </p>

        {/* Crypto */}
        <div>
          <div className="mb-2 flex items-center gap-1.5">
            <Bitcoin className="h-4 w-4 text-esports-orange" />
            <span className="font-display text-xs font-bold uppercase tracking-widest text-esports-orange">
              Crypto
            </span>
          </div>
          <div className="flex flex-col gap-2">
            {CRYPTO.map((c) => (
              <CopyRow key={c.label} label={c.label} value={c.address} />
            ))}
          </div>
        </div>

        {/* PayPal */}
        <div>
          <div className="mb-2">
            <span className="font-display text-xs font-bold uppercase tracking-widest text-primary">
              PayPal
            </span>
          </div>
          <CopyRow label="PayPal Email" value={PAYPAL} />
        </div>

        <Button
          onClick={onClose}
          className="mt-1 w-full bg-primary font-display font-bold uppercase tracking-wide text-white hover:bg-primary/90"
        >
          Continue
        </Button>
      </DialogContent>
    </Dialog>
  );
}
