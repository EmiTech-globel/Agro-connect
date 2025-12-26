"""
Sample scraper - generates realistic test data for agricultural prices
"""
import sys
import os
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from base_scraper import BaseScraper
import random
from typing import List, Dict

class SampleScraper(BaseScraper):
    def __init__(self):
        super().__init__("Lagos Sample Market Data")
        
        # Sample products and their typical price ranges (in Naira)
        self.product_prices = {
            'Rice (Local)': (45000, 55000),      # per 50kg bag
            'Rice (Foreign)': (65000, 75000),    # per 50kg bag
            'Beans (Brown)': (150000, 180000),   # per 100kg bag
            'Tomatoes': (8000, 15000),           # per basket
            'Onions': (35000, 45000),            # per 100kg bag
            'Palm Oil': (1800, 2500),            # per liter
            'Yam': (1500, 3000),                 # per tuber
            'Garri (White)': (25000, 35000),     # per 50kg bag
        }
        
        self.locations = ['Mile 12 Market', 'Bodija Market']
    
    def scrape(self) -> List[Dict]:
        """Generate sample price data"""
        results = []
        
        for product_name, (min_price, max_price) in self.product_prices.items():
            for location_name in self.locations:
                # Get IDs from database
                product_id = self.get_product_id(product_name)
                location_id = self.get_location_id(location_name)
                
                if not product_id or not location_id:
                    self.logger.warning(f"Skipping {product_name} at {location_name} - IDs not found")
                    continue
                
                # Generate realistic price with some variation
                base_price = random.uniform(min_price, max_price)
                variation = random.uniform(-0.05, 0.05)  # ±5% variation
                price = round(base_price * (1 + variation), 2)
                
                # Determine unit based on product
                if 'Rice' in product_name or 'Garri' in product_name:
                    unit = 'bag (50kg)'
                elif 'Beans' in product_name or 'Onions' in product_name:
                    unit = 'bag (100kg)'
                elif 'Tomatoes' in product_name:
                    unit = 'basket'
                elif 'Palm Oil' in product_name:
                    unit = 'liter'
                else:
                    unit = 'tuber'
                
                price_data = {
                    'product_id': product_id,
                    'product_name': product_name,
                    'location_id': location_id,
                    'location_name': location_name,
                    'price': price,
                    'unit': unit,
                    'currency': 'NGN'
                }
                
                results.append(price_data)
        
        return results

if __name__ == '__main__':
    scraper = SampleScraper()
    scraper.run()