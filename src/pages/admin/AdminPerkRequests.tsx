import { useCallback, useEffect, useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { adminListPerkRequests } from "@/auth/backend";

const HIGH_DEMAND_THRESHOLD = 25;

type SortOption = "popular" | "newest" | "category" | "high_demand";

export default function AdminPerkRequests() {
  const [sort, setSort] = useState<SortOption>("popular");
  const [rows, setRows] = useState<
    Awaited<ReturnType<typeof adminListPerkRequests>>["data"]
  >([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    const res = await adminListPerkRequests({ sort });
    if (res.ok && res.data) {
      setRows(res.data);
    } else {
      setRows([]);
      setError(res.error ?? "Failed to load perk requests");
    }
    setLoading(false);
  }, [sort]);

  useEffect(() => {
    void load();
  }, [load]);

  const highDemandCount =
    rows?.filter((row) => row.isHighDemand).length ?? 0;

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold">Perk requests</h2>
          <p className="text-sm text-muted-foreground">
            Member-submitted partnership ideas, aggregated by service. Services
            with {HIGH_DEMAND_THRESHOLD}+ unique requesters are flagged as high
            demand.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Select value={sort} onValueChange={(value) => setSort(value as SortOption)}>
            <SelectTrigger className="w-[200px]">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="popular">Most requested</SelectItem>
              <SelectItem value="high_demand">High demand first</SelectItem>
              <SelectItem value="newest">Newest</SelectItem>
              <SelectItem value="category">Category</SelectItem>
            </SelectContent>
          </Select>
          <Button variant="outline" onClick={() => void load()}>
            Refresh
          </Button>
        </div>
      </div>

      {!loading && highDemandCount > 0 ? (
        <p className="text-sm text-muted-foreground">
          {highDemandCount} service{highDemandCount === 1 ? "" : "s"} at or
          above the high-demand threshold.
        </p>
      ) : null}

      {error ? (
        <p className="text-sm text-destructive">{error}</p>
      ) : null}

      <div className="overflow-x-auto rounded-lg border border-border">
        <table className="min-w-full text-sm">
          <thead className="bg-muted/40 text-left">
            <tr>
              <th className="px-4 py-3 font-medium">Service</th>
              <th className="px-4 py-3 font-medium">Demand</th>
              <th className="px-4 py-3 font-medium">Website</th>
              <th className="px-4 py-3 font-medium">Category</th>
              <th className="px-4 py-3 font-medium">Requests</th>
              <th className="px-4 py-3 font-medium">Unique users</th>
              <th className="px-4 py-3 font-medium">Latest</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr>
                <td className="px-4 py-6 text-muted-foreground" colSpan={7}>
                  Loading…
                </td>
              </tr>
            ) : rows && rows.length > 0 ? (
              rows.map((row) => (
                <tr
                  key={row.serviceKey}
                  className={`border-t border-border ${
                    row.isHighDemand ? "bg-amber-500/5" : ""
                  }`}
                >
                  <td className="px-4 py-3 font-medium">{row.serviceName}</td>
                  <td className="px-4 py-3">
                    {row.isHighDemand ? (
                      <Badge variant="default" className="bg-amber-600 hover:bg-amber-600">
                        High demand
                      </Badge>
                    ) : (
                      <span className="text-muted-foreground">—</span>
                    )}
                  </td>
                  <td className="px-4 py-3">
                    {row.websiteUrl ? (
                      <a
                        href={row.websiteUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-primary underline-offset-4 hover:underline"
                      >
                        {row.websiteUrl}
                      </a>
                    ) : (
                      "—"
                    )}
                  </td>
                  <td className="px-4 py-3 capitalize">
                    {row.category?.replace(/_/g, " ") ?? "—"}
                  </td>
                  <td className="px-4 py-3">{row.requestCount}</td>
                  <td className="px-4 py-3">
                    {row.uniqueUsers}
                    {row.isHighDemand ? (
                      <span className="ml-1 text-xs text-amber-700 dark:text-amber-400">
                        (≥{HIGH_DEMAND_THRESHOLD})
                      </span>
                    ) : null}
                  </td>
                  <td className="px-4 py-3">
                    {new Date(row.latestRequestedAt).toLocaleString()}
                  </td>
                </tr>
              ))
            ) : (
              <tr>
                <td className="px-4 py-6 text-muted-foreground" colSpan={7}>
                  No perk requests yet.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
