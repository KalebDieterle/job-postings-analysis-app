import Link from "next/link";
import { Button } from "@/components/ui/button";
import {
  ChevronLeft,
  ChevronRight,
  ChevronsLeft,
  ChevronsRight,
} from "lucide-react";

interface PaginationControlsProps {
  currentPage: number;
  hasNextPage: boolean;
  hasPrevPage: boolean;
  buildPageUrl: (page: number) => string;
  totalPages?: number;
}

export function PaginationControls({
  currentPage,
  hasNextPage,
  hasPrevPage,
  buildPageUrl,
  totalPages,
}: PaginationControlsProps) {
  const showPageNumbers = totalPages && totalPages <= 10;

  return (
    <div className="flex items-center justify-center gap-2">
      {/* First Page */}
      {hasPrevPage && currentPage > 2 && (
        <Button variant="outline" size="icon" asChild className="h-9 w-9">
          <Link href={buildPageUrl(1)}>
            <ChevronsLeft className="h-4 w-4" />
          </Link>
        </Button>
      )}

      {/* Previous Page */}
      {hasPrevPage && (
        <Button variant="outline" asChild className="gap-1">
          <Link href={buildPageUrl(currentPage - 1)}>
            <ChevronLeft className="h-4 w-4" />
            Previous
          </Link>
        </Button>
      )}

      {/* Page Numbers */}
      {showPageNumbers ? (
        <div className="flex gap-1">
          {Array.from({ length: totalPages }, (_, i) => i + 1).map((page) => (
            <Button
              key={page}
              variant={page === currentPage ? "default" : "outline"}
              size="icon"
              asChild
              className="h-9 w-9"
            >
              <Link href={buildPageUrl(page)}>{page}</Link>
            </Button>
          ))}
        </div>
      ) : (
        <div className="flex items-center gap-2 px-4">
          <span className="text-sm font-medium">Page {currentPage}</span>
          {totalPages && (
            <span className="text-sm text-muted-foreground">
              of {totalPages}
            </span>
          )}
        </div>
      )}

      {/* Next Page */}
      {hasNextPage && (
        <Button variant="outline" asChild className="gap-1">
          <Link href={buildPageUrl(currentPage + 1)}>
            Next
            <ChevronRight className="h-4 w-4" />
          </Link>
        </Button>
      )}

      {/* Last Page */}
      {hasNextPage && totalPages && currentPage < totalPages - 1 && (
        <Button variant="outline" size="icon" asChild className="h-9 w-9">
          <Link href={buildPageUrl(totalPages)}>
            <ChevronsRight className="h-4 w-4" />
          </Link>
        </Button>
      )}
    </div>
  );
}
