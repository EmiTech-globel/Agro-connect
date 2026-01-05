import sys
import os
import requests
from bs4 import BeautifulSoup
from typing import List, Dict
import re
import time
import random

# Fix import path to find base_scraper in the parent directory
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from base_scraper import BaseScraper

class JijiScraper(BaseScraper):
    def __init__(self):
        super().__init__("Jiji.ng Marketplace")
        
        self.base_url = "https://jiji.ng"
        
        # STRICT RULES CONFIGURATION
        self.product_rules = {
            'Rice (Local)': {
                'query': 'mango+rice',
                'must_include': ['local', 'nigeria', 'mango', 'ofada', 'stone free', 'abakaliki'],
                'must_not_include': ['foreign', 'long grain', 'thailand', 'caprice', 'vape'], 
                'default_unit': 'bag (50kg)'
            },
            'Rice (Foreign)': {
                'query': 'mama+gold+rice',
                'must_include': ['foreign', 'royal', 'stallion', 'caprice', 'thailand', 'mama gold'], 
                'must_not_include': ['local', 'ofada', 'nigeria'],
                'default_unit': 'bag (50kg)'
            },
            'Beans (Brown)': {
                'query': 'brown+beans',
                'must_include': ['brown', 'honey', 'oloyin', 'drum'],
                'must_not_include': ['white', 'black'],
                'default_unit': 'bag (100kg)'
            },
            'Tomatoes': {
                'query': 'basket+tomatoes',
                'must_include': ['basket', 'fresh', 'rafia'],
                'must_not_include': ['paste', 'tin', 'sachet'],
                'default_unit': 'basket'
            },
             'Onions': {
                'query': 'bag+onions',
                'must_include': ['dry', 'bag', 'white', 'red'],
                'must_not_include': ['spring', 'powder'],
                'default_unit': 'bag (100kg)'
            },
            'Palm Oil': {
                'query': 'palm+oil+25+liters',
                'must_include': ['red', 'palm', 'oil'],
                'must_not_include': ['kernel', 'vegetable', 'kings'],
                'default_unit': 'liter'
            },
            'Yam': {
                'query': 'tubers+yam',
                'must_include': ['tuber', 'fresh', 'benue', 'abuja'],
                'must_not_include': ['flour', 'pounded', 'dried'],
                'default_unit': 'tuber'
            },
            'Garri (White)': {
                'query': 'bag+garri',
                'must_include': ['white', 'ijebu', 'bag'],
                'must_not_include': ['yellow', 'fried'],
                'default_unit': 'bag (50kg)'
            }
        }
        
        # Headers to mimic a real browser
        self.headers = {
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
            'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
            'Referer': 'https://jiji.ng/',
            'Accept-Language': 'en-US,en;q=0.5',
        }
        
        # Map website location text to Database Location IDs
        # Update these IDs to match your database 'locations' table
        # Mapping updated to match IDs inserted into the DB.
        # IDs assumed from `init-db.sql` insertion order:
        # 1 Mile 12 Market (Lagos), 2 Wuse Market (FCT), 3 Ariaria (Abia),
        # 4 Bodija (Oyo), 5 Dawanau (Kano), 6 Oil Mill Market (Rivers),
        # 7 New Benin (Edo), 8 Onitsha Main (Anambra), 9 Terminus (Plateau),
        # 10+ additional markets inserted later (Port Harcourt, Obio-Akpor, ...)
        
        self.location_map = {
            # State-level defaults
            'Lagos': 1,
            'FCT': 2,
            'Abuja': 2,
            'Abia': 3,
            'Oyo': 4,
            'Kano': 5,
            'Rivers': 10,   # default to Port Harcourt Market (ID 10)
            'Edo': 7,
            'Anambra': 8,
            'Plateau': 9,
            'Ogun': 29,     # Ado-Odo/Ota Market (ID 29)
            'Kwara': 17,
            'Borno': 19,
            'Delta': 26,
            'Ebonyi': 27,
            'Nasarawa': 28,
            'Benue': 25,
            'Osun': 32,

            # City / market specific mappings (substring match)
            'Port Harcourt': 10,
            'Port-Harcourt': 10,
            'Obio-Akpor': 11,
            'Shomolu': 12,
            'Ajah': 13,
            'Agege': 14,
            'Kosofe': 15,
            'Mushin': 16,
            'Ilorin West': 17,
            'Karu': 18,
            'Maiduguri': 19,
            'Ojo': 20,
            'Ikorodu': 21,
            'Lagos Island': 22,
            'Eko': 22,
            'Dei-Dei': 23,
            'Apo District': 24,
            'Oju': 25,
            'Warri': 26,
            'Abakaliki': 27,
            'Obi-Nasarawa': 28,
            'Ado-Odo': 29,
            'Ota': 29,
            'Ipaja': 30,
            'Kubwa': 31,
            'Ede': 32,
            'Ilorin South': 33,
            'Sagamu': 34,

            # Fallbacks
            'Ibadan': 4,
        }
    
    def scrape(self) -> List[Dict]:
        """Scrape prices from Jiji.ng with strict filtering"""
        all_results = []
        
        for product_name, rules in self.product_rules.items():
            self.logger.info(f"\n🔍 Searching for: {product_name}")
            
            try:
                # 1. Build Search URL
                search_url = f"{self.base_url}/search?query={rules['query']}"
                
                # Random delay to avoid getting blocked
                time.sleep(random.uniform(2, 5))
                
                response = requests.get(search_url, headers=self.headers, timeout=30)
                response.raise_for_status()
                
                soup = BeautifulSoup(response.text, 'html.parser')
                
                # 2. Parse Listings
                results = self.parse_listings(soup, product_name, rules)
                all_results.extend(results)
                
                self.logger.info(f"✅ Found {len(results)} valid listings for {product_name}")
                
            except Exception as e:
                self.logger.error(f"❌ Error scraping {product_name}: {e}")
                continue
        
        return all_results
    
    def parse_listings(self, soup: BeautifulSoup, product_name: str, rules: Dict) -> List[Dict]:
        """Parse individual listings with strict filtering rules"""
        results = []
        
        # Jiji structure often changes, looking for the main item container
        listings = soup.find_all('div', class_=lambda x: x and 'b-list-advert__gallery__item' in str(x))
        
        if not listings:
            listings = soup.find_all('div', class_='masonry-item')
            
        for listing in listings:
            try:
                # A. Extract Title
                title_elem = listing.find('div', class_='b-advert-title-inner') or \
                             listing.find('h3') or \
                             listing.find('div', class_='qa-advert-title')
                             
                if not title_elem:
                    continue
                    
                title_text = title_elem.get_text(strip=True).lower()
                
                # B. STRICT FILTERING
                # Check Negative Keywords (e.g. remove "vape")
                if any(bad_word in title_text for bad_word in rules['must_not_include']):
                    # self.logger.debug(f"Skipped (Bad keyword): {title_text}")
                    continue

                # Check Positive Keywords (must have at least one)
                if not any(good_word in title_text for good_word in rules['must_include']):
                    # self.logger.debug(f"Skipped (Irrelevant): {title_text}")
                    continue
                
                # C. Extract Price
                price_elem = listing.find('div', class_='qa-advert-price') or \
                             listing.find('span', class_=lambda x: x and 'price' in str(x))
                
                if not price_elem:
                    continue
                    
                price_text = price_elem.get_text(strip=True)
                price = self.extract_price(price_text)
                
                if not price or price <= 1000: # Filter out unrealistic low prices
                    continue
                
                # D. Extract & Map Location
                location_elem = listing.find('span', class_='b-list-advert__region') or \
                                listing.find('div', class_='b-list-advert__region')
                                
                raw_location = location_elem.get_text(strip=True) if location_elem else "Unknown"
                location_id = self.get_location_id(raw_location)
                
                # E. Get Product ID
                product_id = self.get_product_id(product_name)
                
                if not product_id:
                    self.logger.warning(f"Skipping - Product ID not found for {product_name}")
                    continue
                
                # F. Add to Results
                price_data = {
                    'product_id': product_id,
                    'product_name': product_name,
                    'location_id': location_id,
                    'location_name': raw_location, # Sending raw location for verification
                    'price': price,
                    'unit': rules['default_unit'],
                    'currency': 'NGN'
                }
                
                results.append(price_data)
                self.logger.info(f"  ✓ Found: ₦{price:,.0f} in {raw_location}")
                
            except Exception as e:
                # self.logger.error(f"Error parsing listing: {e}")
                continue
        
        return results
    
    def extract_price(self, price_text: str) -> float:
        """Extract numeric price from text"""
        try:
            # Remove currency symbols and commas
            cleaned = re.sub(r'[^\d.]', '', price_text)
            return float(cleaned)
        except:
            return 0.0
    
    def get_location_id(self, raw_location_text: str) -> int:
        """Map raw location string to database ID"""
        for key, loc_id in self.location_map.items():
            if key.lower() in raw_location_text.lower():
                return loc_id
        
        # Default to Lagos (Mile 12) if unknown, but log it
        # You might want to change this default behavior later
        return 1

if __name__ == '__main__':
    scraper = JijiScraper()
    scraper.run()