import time
import functools
import logging

logger = logging.getLogger(__name__)

class CircuitBreakerOpenException(Exception):
    """Exception raised when the circuit breaker is open."""
    pass

class CircuitBreaker:
    """
    A simple Circuit Breaker to prevent cascading failures when an external API is down.
    """
    def __init__(self, failure_threshold: int = 3, recovery_timeout: int = 60):
        self.failure_threshold = failure_threshold
        self.recovery_timeout = recovery_timeout
        self.failure_count = 0
        self.last_failure_time = 0
        self.state = "CLOSED" # "CLOSED", "OPEN", "HALF_OPEN"

    def __call__(self, func):
        @functools.wraps(func)
        async def wrapper(*args, **kwargs):
            if self.state == "OPEN":
                if time.time() - self.last_failure_time > self.recovery_timeout:
                    self.state = "HALF_OPEN"
                    logger.info(f"Circuit breaker transitioning to HALF_OPEN for {func.__name__}")
                else:
                    raise CircuitBreakerOpenException(f"Circuit breaker is OPEN for {func.__name__}")

            try:
                result = await func(*args, **kwargs)
                if self.state == "HALF_OPEN":
                    self.state = "CLOSED"
                    self.failure_count = 0
                    logger.info(f"Circuit breaker transitioning to CLOSED for {func.__name__}")
                return result
            except Exception as e:
                self.failure_count += 1
                self.last_failure_time = time.time()
                logger.error(f"Error in {func.__name__}: {str(e)}. Failure count: {self.failure_count}")
                
                if self.failure_count >= self.failure_threshold:
                    self.state = "OPEN"
                    logger.warning(f"Circuit breaker transitioning to OPEN for {func.__name__}")
                raise e

        return wrapper
