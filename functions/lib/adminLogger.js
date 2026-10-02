/**
 * functions/lib/adminLogger.js
 * Structured logging for Admin API calls.
 */

export function logAdminRequest({
    endpoint,
    method = 'GET',
    params = {},
    durationMs,
    rowsCount = 0,
    total = null,
    warningBudgetMs = 500,
}) {
    const isSlow = durationMs > warningBudgetMs;
    const badge = isSlow ? '⚠️ [ADMIN SLOW QUERY]' : '[ADMIN API]';
    const totalInfo = total !== null ? ` (total: ${total})` : '';
    const paramStr = Object.keys(params).length ? ` params: ${JSON.stringify(params)}` : '';

    console.log(`${badge} ${method} ${endpoint} - ${durationMs.toFixed(1)}ms - ${rowsCount} rows${totalInfo}${paramStr}`);

    if (isSlow) {
        console.warn(`[ADMIN QUERY BUDGET EXCEEDED] ${method} ${endpoint} took ${durationMs.toFixed(1)}ms (budget: ${warningBudgetMs}ms)`);
    }
}
