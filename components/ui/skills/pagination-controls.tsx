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
  onPageChange?: (page: number) => void;
}

export function PaginationControls({
  currentPage,
  hasNextPage,
  hasPrevPage,
  buildPageUrl,
  totalPages,
  onPageChange,
}: PaginationControlsProps) {
  const showPageNumbers = totalPages && totalPages <= 10;

  const handlePageClick = (page: number) => {
    if (onPageChange) {
      onPageChange(page);
    }
  };

  return (
    <div className="flex items-center justify-center gap-2">
      {/* First Page */}
      {hasPrevPage && currentPage > 2 && (
        <>
          {onPageChange ? (
            <Button
              variant="outline"
              size="icon"
              onClick={() => handlePageClick(1)}
              className="h-9 w-9"
            >
              <ChevronsLeft className="h-4 w-4" />
            </Button>
          ) : (
            <Button variant="outline" size="icon" asChild className="h-9 w-9">
              <Link href={buildPageUrl(1)}>
                <ChevronsLeft className="h-4 w-4" />
              </Link>
            </Button>
          )}
        </>
      )}

      {/* Previous Page */}
      {hasPrevPage && (
        <>
          {onPageChange ? (
            <Button
              variant="outline"
              onClick={() => handlePageClick(currentPage - 1)}
              className="gap-1"
            >
              <ChevronLeft className="h-4 w-4" />
              Previous
            </Button>
          ) : (
            <Button variant="outline" asChild className="gap-1">
              <Link href={buildPageUrl(currentPage - 1)}>
                <ChevronLeft className="h-4 w-4" />
                Previous
              </Link>
            </Button>
          )}
        </>
      )}

      {/* Page Numbers */}
      {showPageNumbers ? (
        <div className="flex gap-1">
          {Array.from({ length: totalPages }, (_, i) => i + 1).map((page) => (
            <>
              {onPageChange ? (
                <Button
                  key={page}
                  variant={page === currentPage ? "default" : "outline"}
                  size="icon"
                  onClick={() => handlePageClick(page)}
                  className="h-9 w-9"
                >
                  {page}
                </Button>
              ) : (
                <Button
                  key={page}
                  variant={page === currentPage ? "default" : "outline"}
                  size="icon"
                  asChild
                  className="h-9 w-9"
                >
                  <Link href={buildPageUrl(page)}>{page}</Link>
                </Button>
              )}
            </>
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
        <>
          {onPageChange ? (
            <Button
              variant="outline"
              onClick={() => handlePageClick(currentPage + 1)}
              className="gap-1"
            >
              Next
              <ChevronRight className="h-4 w-4" />
            </Button>
          ) : (
            <Button variant="outline" asChild className="gap-1">
              <Link href={buildPageUrl(currentPage + 1)}>
                Next
                <ChevronRight className="h-4 w-4" />
              </Link>
            </Button>
          )}
        </>
      )}

      {/* Last Page */}
      {hasNextPage && totalPages && currentPage < totalPages - 1 && (
        <>
          {onPageChange ? (
            <Button
              variant="outline"
              size="icon"
              onClick={() => handlePageClick(totalPages)}
              className="h-9 w-9"
            >
              <ChevronsRight className="h-4 w-4" />
            </Button>
          ) : (
            <Button variant="outline" size="icon" asChild className="h-9 w-9">
              <Link href={buildPageUrl(totalPages)}>
                <ChevronsRight className="h-4 w-4" />
              </Link>
            </Button>
          )}
        </>
      )}
    </div>
  );
}
