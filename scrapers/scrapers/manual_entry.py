"""
Manual Price Entry Tool
Use this to manually enter prices when scraping isn't possible
"""
import sys
import os
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from base_scraper import BaseScraper
from typing import List, Dict

class ManualEntry(BaseScraper):
    def __init__(self):
        super().__init__("Manual Entry")
    
    def scrape(self) -> List[Dict]:
        """Interactive manual price entry"""
        results = []
        
        print("\n" + "="*60)
        print("📝 MANUAL PRICE ENTRY TOOL")
        print("="*60)
        print("\nEnter agricultural prices (type 'done' to finish)")
        print("-"*60)
        
        while True:
            print("\n")
            product_name = input("Product name (or 'done'): ").strip()
            
            if product_name.lower() == 'done':
                break
            
            location_name = input("Location/Market: ").strip()
            price_str = input("Price (₦): ").strip().replace(',', '')
            unit = input("Unit (e.g., 'bag (50kg)'): ").strip()
            
            try:
                price = float(price_str)
                
                # Get IDs from database
                product_id = self.get_product_id(product_name)
                location_id = self.get_location_id(location_name)
                
                if not product_id:
                    print(f"⚠️  Product '{product_name}' not found in database")
                    print("   Available products:")
                    # Show available products
                    with self.db_conn.cursor() as cursor:
                        cursor.execute("SELECT name FROM products")
                        for row in cursor.fetchall():
                            print(f"     - {row['name']}")
                    continue
                
                if not location_id:
                    print(f"⚠️  Location '{location_name}' not found")
                    print("   Available locations:")
                    with self.db_conn.cursor() as cursor:
                        cursor.execute("SELECT name, state FROM locations")
                        for row in cursor.fetchall():
                            print(f"     - {row['name']}, {row['state']}")
                    continue
                
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
                print(f"✅ Added: {product_name} - ₦{price:,.2f} at {location_name}")
                
            except ValueError:
                print("❌ Invalid price. Please enter a number.")
            except Exception as e:
                print(f"❌ Error: {e}")
        
        print(f"\n📊 Total entries: {len(results)}")
        return results


if __name__ == '__main__':
    scraper = ManualEntry()
    scraper.run()