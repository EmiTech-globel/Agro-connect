"""
Master Scraper Runner
Runs all configured scrapers in sequence or parallel
"""
import sys
import os
import time
from datetime import datetime
import logging

# Setup logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(levelname)s - %(message)s',
    handlers=[
        logging.FileHandler('scraper_runs.log'),
        logging.StreamHandler()
    ]
)

logger = logging.getLogger(__name__)

# Import all your scrapers here
# Uncomment as you create them
from scrapers.sample_scraper import SampleScraper
from scrapers.jiji_scraper import JijiScraper

# Configure which scrapers to run
ACTIVE_SCRAPERS = [
    {
        'name': 'Sample Scraper',
        'class': SampleScraper,
        'enabled': True,
        'priority': 1  # Lower number = higher priority
    },

    {
        'name': 'jiji scraper',
        'class': JijiScraper,
        'enabled': True,
        'priority': 2
    }
    # Add more scrapers here
]

def run_scraper(scraper_config):
    """Run a single scraper and return results"""
    scraper_name = scraper_config['name']
    scraper_class = scraper_config['class']
    
    logger.info(f"\n{'='*60}")
    logger.info(f"Starting: {scraper_name}")
    logger.info(f"{'='*60}")
    
    try:
        start_time = time.time()
        
        # Initialize and run scraper
        scraper = scraper_class()
        scraper.run()
        
        elapsed = time.time() - start_time
        logger.info(f"✅ {scraper_name} completed in {elapsed:.2f}s")
        
        return {
            'name': scraper_name,
            'status': 'success',
            'elapsed': elapsed
        }
        
    except Exception as e:
        logger.error(f"{scraper_name} failed: {e}")
        return {
            'name': scraper_name,
            'status': 'failed',
            'error': str(e)
        }

def run_all_scrapers(parallel=False):
    """Run all enabled scrapers"""
    
    logger.info(f"\n{'#'*60}")
    logger.info(f"SCRAPER RUN STARTED: {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}")
    logger.info(f"{'#'*60}\n")
    
    # Filter enabled scrapers and sort by priority
    enabled_scrapers = [s for s in ACTIVE_SCRAPERS if s.get('enabled', True)]
    enabled_scrapers.sort(key=lambda x: x.get('priority', 999))
    
    logger.info(f"Running {len(enabled_scrapers)} scraper(s):\n")
    for scraper in enabled_scrapers:
        logger.info(f"  - {scraper['name']} (Priority: {scraper.get('priority', 'N/A')})")
    
    print()
    
    results = []
    total_start = time.time()
    
    if parallel:
        # TODO: Implement parallel execution with threading/multiprocessing
        logger.warning("Parallel execution not yet implemented, running sequentially")
    
    # Sequential execution
    for scraper_config in enabled_scrapers:
        result = run_scraper(scraper_config)
        results.append(result)
        
        # Small delay between scrapers to be polite to servers
        time.sleep(2)
    
    total_elapsed = time.time() - total_start
    
    # Summary
    logger.info(f"\n{'#'*60}")
    logger.info("SCRAPER RUN SUMMARY")
    logger.info(f"{'#'*60}\n")
    
    successful = [r for r in results if r['status'] == 'success']
    failed = [r for r in results if r['status'] == 'failed']
    
    logger.info(f"Total Time: {total_elapsed:.2f}s")
    logger.info(f"Successful: {len(successful)}/{len(results)}")
    logger.info(f"Failed: {len(failed)}/{len(results)}\n")
    
    if successful:
        logger.info("Successful scrapers:")
        for r in successful:
            logger.info(f"   - {r['name']} ({r['elapsed']:.2f}s)")
    
    if failed:
        logger.info("\n Failed scrapers:")
        for r in failed:
            logger.info(f"   - {r['name']}: {r['error']}")
    
    logger.info(f"\n{'#'*60}\n")
    
    return results

def run_specific_scraper(scraper_name):
    """Run a specific scraper by name"""
    scraper_config = next((s for s in ACTIVE_SCRAPERS if s['name'] == scraper_name), None)
    
    if not scraper_config:
        logger.error(f"Scraper '{scraper_name}' not found")
        logger.info("Available scrapers:")
        for s in ACTIVE_SCRAPERS:
            logger.info(f"  - {s['name']}")
        return
    
    run_scraper(scraper_config)

if __name__ == '__main__':
    import argparse
    
    parser = argparse.ArgumentParser(description='Run agricultural price scrapers')
    parser.add_argument('--scraper', type=str, help='Run specific scraper by name')
    parser.add_argument('--parallel', action='store_true', help='Run scrapers in parallel')
    parser.add_argument('--list', action='store_true', help='List all available scrapers')
    
    args = parser.parse_args()
    
    if args.list:
        print("\nAvailable Scrapers:")
        print("-" * 60)
        for scraper in ACTIVE_SCRAPERS:
            status = "Enabled" if scraper.get('enabled', True) else "Disabled"
            print(f"{scraper['name']:<30} {status:<15} Priority: {scraper.get('priority', 'N/A')}")
        print()
    elif args.scraper:
        run_specific_scraper(args.scraper)
    else:
        run_all_scrapers(parallel=args.parallel)