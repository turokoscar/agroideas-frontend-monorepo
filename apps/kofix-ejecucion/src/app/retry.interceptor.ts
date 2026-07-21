import { HttpInterceptorFn, HttpErrorResponse } from '@angular/common/http';
import { retry, timer } from 'rxjs';

const RETRY_COUNT = 2;
const RETRY_STATUS_CODES = new Set([502, 503, 504]);

function shouldRetry(error: HttpErrorResponse): boolean {
  if (RETRY_STATUS_CODES.has(error.status)) return true;
  if (error.status === 0 && !navigator.onLine) return true;
  return false;
}

export const retryInterceptor: HttpInterceptorFn = (req, next) => {
  if (req.method !== 'GET') return next(req);

  return next(req).pipe(
    retry({
      count: RETRY_COUNT,
      delay: (error: HttpErrorResponse, retryCount: number) => {
        if (!shouldRetry(error)) throw error;
        return timer(1000 * Math.pow(2, retryCount - 1));
      }
    })
  );
};
