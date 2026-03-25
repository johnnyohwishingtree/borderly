/**
 * Navigation Scripts — WebView script generators for navigation operations
 */

/**
 * Generate navigation script for URL change
 */
export function generateNavigationScript(url: string, timeout: number): string {
  return `
    (function() {
      const startTime = Date.now();
      const previousUrl = window.location.href;
      const previousTitle = document.title;

      try {
        window.location.href = ${JSON.stringify(url)};

        return new Promise((resolve) => {
          const checkInterval = 100;
          const maxWait = ${timeout};
          let elapsed = 0;

          function checkNavigation() {
            const currentUrl = window.location.href;
            const currentTitle = document.title;

            if (currentUrl !== previousUrl || elapsed >= maxWait) {
              resolve({
                success: true,
                previousUrl: previousUrl,
                currentUrl: currentUrl,
                currentTitle: currentTitle,
                duration: Date.now() - startTime
              });
            } else {
              elapsed += checkInterval;
              setTimeout(checkNavigation, checkInterval);
            }
          }

          setTimeout(checkNavigation, checkInterval);
        });

      } catch (error) {
        return { success: false, error: error.message };
      }
    })();
  `;
}

/**
 * Generate history navigation script (back/forward)
 */
export function generateHistoryScript(direction: 'back' | 'forward'): string {
  return `
    (function() {
      try {
        const previousUrl = window.location.href;
        window.history.${direction}();

        return new Promise((resolve) => {
          setTimeout(() => {
            resolve({
              success: true,
              previousUrl: previousUrl,
              currentUrl: window.location.href
            });
          }, 1000);
        });
      } catch (error) {
        return { success: false, error: error.message };
      }
    })();
  `;
}

/**
 * Generate page load wait script
 */
export function generatePageLoadScript(timeout: number): string {
  return `
    (function() {
      return new Promise((resolve) => {
        const startTime = Date.now();
        const maxWait = ${timeout};

        function checkLoaded() {
          const isLoaded = document.readyState === 'complete';
          const noActiveRequests = !window.performance ||
            window.performance.getEntriesByType('navigation')[0]?.loadEventEnd > 0;

          if (isLoaded && noActiveRequests) {
            resolve({
              success: true,
              loadTime: Date.now() - startTime,
              readyState: document.readyState
            });
          } else if (Date.now() - startTime > maxWait) {
            resolve({
              success: false,
              error: 'Page load timeout',
              readyState: document.readyState
            });
          } else {
            setTimeout(checkLoaded, 100);
          }
        }

        checkLoaded();
      });
    })();
  `;
}
