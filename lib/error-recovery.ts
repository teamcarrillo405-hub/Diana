type RetryErrorBoundaryOptions = {
  reset: () => void;
  refresh: () => void;
  reload: () => void;
};

export function retryErrorBoundary({
  reset,
  refresh,
  reload,
}: RetryErrorBoundaryOptions) {
  reset();
  refresh();
  reload();
}