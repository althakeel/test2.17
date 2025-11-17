// Request throttling utility to prevent server overload
class RequestThrottler {
  constructor(maxConcurrent = 3, delayMs = 100) {
    this.maxConcurrent = maxConcurrent;
    this.delayMs = delayMs;
    this.queue = [];
    this.activeRequests = 0;
  }

  async throttle(fn) {
    return new Promise((resolve, reject) => {
      this.queue.push({ fn, resolve, reject });
      this.process();
    });
  }

  async process() {
    if (this.activeRequests >= this.maxConcurrent || this.queue.length === 0) {
      return;
    }

    const { fn, resolve, reject } = this.queue.shift();
    this.activeRequests++;

    try {
      const result = await fn();
      resolve(result);
    } catch (error) {
      reject(error);
    } finally {
      this.activeRequests--;
      setTimeout(() => this.process(), this.delayMs);
    }
  }
}

// Global throttler instance - max 3 concurrent requests with 100ms delay
export const apiThrottler = new RequestThrottler(3, 100);

// Batch request helper
export const batchRequests = async (requests, batchSize = 3) => {
  const results = [];
  for (let i = 0; i < requests.length; i += batchSize) {
    const batch = requests.slice(i, i + batchSize);
    const batchResults = await Promise.all(batch);
    results.push(...batchResults);
    // Add delay between batches
    if (i + batchSize < requests.length) {
      await new Promise(resolve => setTimeout(resolve, 200));
    }
  }
  return results;
};

export default apiThrottler;
