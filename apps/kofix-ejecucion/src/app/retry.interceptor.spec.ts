import { fakeAsync, tick } from '@angular/core/testing';
import { HttpErrorResponse, HttpHandlerFn, HttpRequest, HttpResponse } from '@angular/common/http';
import { defer, of, throwError } from 'rxjs';
import { retryInterceptor } from './retry.interceptor';

describe('retryInterceptor', () => {
    const originalOnLine = window.navigator.onLine;

    const setOnline = (online: boolean) => {
        Object.defineProperty(window.navigator, 'onLine', { value: online, configurable: true });
    };

    afterEach(() => setOnline(originalOnLine));

    const errorResponse = (status: number) => new HttpErrorResponse({ status });
    const successResponse = new HttpResponse({ status: 200, body: { ok: true } });

    it('should not retry non-GET requests, even on a retryable status', () => {
        const req = new HttpRequest('POST', '/api/foo', null);
        const next: HttpHandlerFn = jest.fn(() => throwError(() => errorResponse(503)));

        let error: HttpErrorResponse | undefined;
        retryInterceptor(req, next).subscribe({ error: (err) => (error = err) });

        expect(next).toHaveBeenCalledTimes(1);
        expect(error?.status).toBe(503);
    });

    it('should not retry GET requests when the error is outside the retryable set', () => {
        const req = new HttpRequest('GET', '/api/foo');
        const next: HttpHandlerFn = jest.fn(() => throwError(() => errorResponse(404)));

        let error: HttpErrorResponse | undefined;
        retryInterceptor(req, next).subscribe({ error: (err) => (error = err) });

        expect(next).toHaveBeenCalledTimes(1);
        expect(error?.status).toBe(404);
    });

    it('should retry GET requests on retryable status codes with exponential backoff, then succeed', fakeAsync(() => {
        const req = new HttpRequest('GET', '/api/foo');
        let attempts = 0;
        // next(req) is invoked once by the interceptor; retry() resubscribes to that same
        // Observable, so the per-attempt behavior must live inside defer(), not in the next() call.
        const next: HttpHandlerFn = jest.fn(() =>
            defer(() => {
                attempts++;
                return attempts < 3 ? throwError(() => errorResponse(503)) : of(successResponse);
            })
        );

        let result: unknown;
        retryInterceptor(req, next).subscribe({ next: (res) => (result = res) });

        tick(1000); // primer reintento: 1000 * 2^0
        tick(2000); // segundo reintento: 1000 * 2^1

        expect(next).toHaveBeenCalledTimes(1);
        expect(attempts).toBe(3);
        expect(result).toBe(successResponse);
    }));

    it('should retry when status is 0 and the browser is offline', fakeAsync(() => {
        setOnline(false);
        const req = new HttpRequest('GET', '/api/foo');
        let attempts = 0;
        const next: HttpHandlerFn = jest.fn(() =>
            defer(() => {
                attempts++;
                return attempts < 2 ? throwError(() => errorResponse(0)) : of(successResponse);
            })
        );

        let result: unknown;
        retryInterceptor(req, next).subscribe({ next: (res) => (result = res) });

        tick(1000);

        expect(attempts).toBe(2);
        expect(result).toBe(successResponse);
    }));

    it('should not retry status 0 while the browser is online', () => {
        setOnline(true);
        const req = new HttpRequest('GET', '/api/foo');
        const next: HttpHandlerFn = jest.fn(() => throwError(() => errorResponse(0)));

        let error: HttpErrorResponse | undefined;
        retryInterceptor(req, next).subscribe({ error: (err) => (error = err) });

        expect(next).toHaveBeenCalledTimes(1);
        expect(error?.status).toBe(0);
    });

    it('should stop retrying after the configured retry count and propagate the error', fakeAsync(() => {
        const req = new HttpRequest('GET', '/api/foo');
        let attempts = 0;
        const next: HttpHandlerFn = jest.fn(() =>
            defer(() => {
                attempts++;
                return throwError(() => errorResponse(503));
            })
        );

        let error: HttpErrorResponse | undefined;
        retryInterceptor(req, next).subscribe({ error: (err) => (error = err) });

        tick(1000);
        tick(2000);

        expect(attempts).toBe(3); // intento inicial + 2 reintentos (RETRY_COUNT)
        expect(error?.status).toBe(503);
    }));
});
