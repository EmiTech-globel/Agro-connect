"""
Scraper Scheduler
Runs scrapers automatically at configured intervals
"""
import schedule
import time
import logging
from datetime import datetime
from run_all_scrapers import run_all_scrapers, run_specific_scraper

logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(levelname)s - %(message)s'
)

logger = logging.getLogger(__name__)

# SCHEDULE CONFIGURATION
# Adjust these based on your needs
SCHEDULES = {
    'all_scrapers': {
        'interval': 30,  # minutes
        'enabled': True
    },
    # You can add specific scraper schedules
    # 'Sample Scraper': {
    #     'interval': 15,
    #     'enabled': False
    # }
}

def scheduled_run_all():
    """Scheduled execution of all scrapers"""
    logger.info(f"\n⏰ Scheduled run triggered at {datetime.now()}")
    run_all_scrapers()

def setup_schedules():
    """Configure all schedules"""
    if SCHEDULES['all_scrapers']['enabled']:
        interval = SCHEDULES['all_scrapers']['interval']
        schedule.every(interval).minutes.do(scheduled_run_all)
        logger.info(f"✅ Scheduled: All scrapers every {interval} minutes")
    
    # Add more specific schedules here
    # schedule.every().hour.do(lambda: run_specific_scraper("Lagos Market Board"))
    # schedule.every().day.at("09:00").do(scheduled_run_all)

def run_scheduler():
    """Main scheduler loop"""
    logger.info("\n" + "="*60)
    logger.info("🕐 SCRAPER SCHEDULER STARTED")
    logger.info("="*60)
    
    setup_schedules()
    
    logger.info("\n📅 Active Schedules:")
    for job in schedule.get_jobs():
        logger.info(f"   - {job}")
    
    logger.info("\n⏳ Waiting for scheduled runs... (Press Ctrl+C to stop)\n")
    
    # Optional: Run once immediately
    # logger.info("🚀 Running initial scrape...")
    # run_all_scrapers()
    
    try:
        while True:
            schedule.run_pending()
            time.sleep(60)  # Check every minute
    except KeyboardInterrupt:
        logger.info("\n\n🛑 Scheduler stopped by user")

if __name__ == '__main__':
    run_scheduler()
    