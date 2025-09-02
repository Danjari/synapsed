"use client";
import { Skeleton } from "@/components/ui/skeleton";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";

export default function TableSkeleton({ columns = 4, rows = 6 }: { columns?: number; rows?: number }) {
  const headerWidths = ["w-24", "w-32", "w-20", "w-12", "w-16"]; // cycle for variety
  const cellWidths = ["w-3/4", "w-1/2", "w-2/3", "w-1/3", "w-1/4"]; // cycle for variety
  return (
    <Table>
      <TableHeader>
        <TableRow>
          {Array.from({ length: columns }).map((_, i) => (
            <TableHead key={i}>
              <Skeleton className={`h-4 ${headerWidths[i % headerWidths.length]}`} />
            </TableHead>
          ))}
        </TableRow>
      </TableHeader>
      <TableBody>
        {Array.from({ length: rows }).map((_, r) => (
          <TableRow key={r}>
            {Array.from({ length: columns }).map((__, c) => (
              <TableCell key={c}>
                <Skeleton className={`h-4 ${cellWidths[(r + c) % cellWidths.length]}`} />
              </TableCell>
            ))}
          </TableRow>
        ))}
      </TableBody>
    </Table>
  );
}

