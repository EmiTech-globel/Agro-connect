"""
Website Inspector Tool
Use this to analyze the HTML structure of a website before scraping
"""
import requests
from bs4 import BeautifulSoup
import sys

def inspect_website(url: str):
    """Inspect website structure to help build scrapers"""
    
    print(f"\n🔍 Inspecting: {url}\n")
    print("=" * 80)
    
    try:
        headers = {
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
        }
        
        response = requests.get(url, headers=headers, timeout=30)
        response.raise_for_status()
        
        soup = BeautifulSoup(response.text, 'html.parser')
        
        # Check for tables
        tables = soup.find_all('table')
        print(f"\n📊 Found {len(tables)} table(s)")
        for i, table in enumerate(tables[:3], 1):
            print(f"\n  Table {i}:")
            rows = table.find_all('tr')
            print(f"    - Rows: {len(rows)}")
            if rows:
                first_row = rows[0]
                headers = [th.text.strip() for th in first_row.find_all(['th', 'td'])]
                print(f"    - Headers: {headers[:5]}")
        
        # Check for common price-related classes
        price_classes = [
            'price', 'cost', 'amount', 'value',
            'product', 'item', 'commodity',
            'market', 'location', 'state'
        ]
        
        print(f"\n🏷️  Common Price-Related Elements:")
        for cls in price_classes:
            elements = soup.find_all(class_=lambda x: x and cls in x.lower())
            if elements:
                print(f"    - .{cls}: {len(elements)} elements")
                if elements:
                    sample = elements[0]
                    print(f"      Sample: {sample.name} - {sample.text[:50]}")
        
        # Check for divs/cards
        cards = soup.find_all('div', class_=lambda x: x and any(
            word in x.lower() for word in ['card', 'item', 'product', 'price']
        ))
        print(f"\n📦 Found {len(cards)} card/item div(s)")
        
        # Check for JSON data in scripts
        scripts = soup.find_all('script', type='application/json')
        print(f"\n📜 Found {len(scripts)} JSON script(s)")
        
        # Check for links that might be API endpoints
        links = soup.find_all('a', href=True)
        api_links = [link['href'] for link in links if 'api' in link['href'].lower()]
        if api_links:
            print(f"\n🔗 Possible API endpoints:")
            for link in api_links[:5]:
                print(f"    - {link}")
        
        # Save HTML for inspection
        output_file = 'website_structure.html'
        with open(output_file, 'w', encoding='utf-8') as f:
            f.write(soup.prettify())
        
        print(f"\n💾 Full HTML saved to: {output_file}")
        print("    Open this file to see the complete structure")
        
        print("\n" + "=" * 80)
        print("✅ Inspection complete!")
        print("\nNext steps:")
        print("1. Open 'website_structure.html' in a text editor")
        print("2. Look for tables, divs, or classes containing price data")
        print("3. Update the scraper selectors based on what you find")
        
    except requests.RequestException as e:
        print(f"❌ Error fetching website: {e}")
    except Exception as e:
        print(f"❌ Error: {e}")


if __name__ == '__main__':
    if len(sys.argv) < 2:
        print("Usage: python inspect_website.py <URL>")
        print("Example: python inspect_website.py https://example.com/prices")
        sys.exit(1)
    
    url = sys.argv[1]
    inspect_website(url)