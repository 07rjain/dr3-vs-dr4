import type { Direction } from "@/lib/format";
import type { ErrorCode } from "@/lib/messages";

export type RatingSuccess = {
  host: string;
  subdomain: boolean;
  dr3: number | null;
  dr4: number | null;
  delta: number | null;
  direction: Direction;
  license: string | null;
  retrievedAt: string;
  cached: boolean;
};

export type RatingFailure = {
  error: ErrorCode;
  message: string;
};
