import logging
import sys
from typing import Optional

# ANSI colors for terminal output
class Colors:
    BLUE = "\033[94m"
    CYAN = "\033[96m"
    GREEN = "\033[92m"
    YELLOW = "\033[93m"
    RED = "\033[91m"
    MAGENTA = "\033[95m"
    BOLD = "\033[1m"
    UNDERLINE = "\033[4m"
    END = "\033[0m"

class PremiumFormatter(logging.Formatter):
    """Custom formatter for a premium, clean look in the terminal."""
    
    LEVEL_COLORS = {
        logging.DEBUG: Colors.CYAN,
        logging.INFO: Colors.GREEN,
        logging.WARNING: Colors.YELLOW,
        logging.ERROR: Colors.RED,
        logging.CRITICAL: Colors.BOLD + Colors.RED,
    }

    def format(self, record):
        color = self.LEVEL_COLORS.get(record.levelno, Colors.END)
        levelname = f"{color}{Colors.BOLD}{record.levelname:8}{Colors.END}"
        timestamp = f"{Colors.BLUE}{self.formatTime(record, '%H:%M:%S')}{Colors.END}"
        
        # Format: HH:MM:SS | LEVEL    | Message
        msg = f"{timestamp} | {levelname} | {record.getMessage()}"
        
        if record.exc_info:
            msg += "\n" + self.formatException(record.exc_info)
        
        return msg

def setup_logger(name: str = "app", level: int = logging.INFO) -> logging.Logger:
    """Configures and returns a centralized logger."""
    logger = logging.getLogger(name)
    
    if not logger.handlers:
        logger.setLevel(level)
        
        # Stream Handler (Stdout)
        handler = logging.StreamHandler(sys.stdout)
        handler.setFormatter(PremiumFormatter())
        logger.addHandler(handler)
        
        # Prevent propagation to the root logger to avoid duplicate logs in some environments
        logger.propagate = False
        
    return logger

# Singleton instance
logger = setup_logger("RealtimeSTT")
