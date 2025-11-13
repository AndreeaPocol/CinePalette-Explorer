/**
 * Utility function to limit concurrent promise execution (pLimit).
 *
 * This function prevents resource exhaustion or throttling by managing a fixed-size queue,
 * ensuring only 'limit' number of asynchronous tasks run at any given time.
 *
 * @param limit - The maximum number of promises to run concurrently.
 * @returns A function (the limiter) that wraps an async task and limits its execution.
 */
export function pLimit<T>(limit: number) {
    // queue stores functions that resolve the promise wrappers, waiting their turn
    // The functions stored here are the 'wrapper' functions defined below.
    const queue: (() => void)[] = []; 
    let activeCount = 0;

    /**
     * Decrements the active count and attempts to run the next task in the queue.
     */
    const next = () => {
        activeCount--;
        
        // Use shift() and check if the result (the next function) is defined
        const nextTask = queue.shift();
        
        if (nextTask) {
            // Safe invocation: nextTask is guaranteed to be a function here
            nextTask();
        }
    };

    /**
     * Executes the core function (fn), manages active count, and calls cleanup.
     * fn must be a function that returns a Promise<T>.
     */
    const run = async (fn: () => Promise<T>): Promise<T> => { 
        activeCount++;
        try {
            // Await the result of the wrapped function
            return await fn();
        } finally {
            // Ensure next is called even if fn() throws an error
            next();
        }
    };

    /**
     * The Limiter function. It takes an async task (fn) and returns a Promise that 
     * resolves when the task is finished (after waiting in the queue, if necessary).
     */
    return (fn: () => Promise<T>): Promise<T> => new Promise<T>(resolve => {
        // Wrapper function that runs the task and resolves the outer Promise
        const wrapper = () => resolve(run(fn));
        
        if (activeCount < limit) {
            // If below the limit, execute immediately
            wrapper();
        } else {
            // If at the limit, add the task to the queue
            queue.push(wrapper);
        }
    });
}