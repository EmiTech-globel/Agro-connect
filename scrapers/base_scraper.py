"""
Base scraper class with common functionality for all scrapers
"""
import json
import logging
from datetime import datetime
from typing import Dict, List, Optional
import pika
import psycopg2
from psycopg2.extras import RealDictCursor
import os
from dotenv import load_dotenv

load_dotenv()

logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)

class BaseScraper:
    def __init__(self, source_name: str):
        self.source_name = source_name
        self.logger = logging.getLogger(source_name)
        self.db_conn = None
        self.rabbitmq_conn = None
        self.channel = None
        self.source_id = None
        
    def connect_db(self):
        """Connect to PostgreSQL database"""
        try:
            self.db_conn = psycopg2.connect(
                os.getenv('DATABASE_URL'),
                cursor_factory=RealDictCursor
            )
            self.logger.info("Database connected successfully")
            
            # Get or create source ID
            with self.db_conn.cursor() as cursor:
                cursor.execute(
                    "SELECT id FROM sources WHERE name = %s",
                    (self.source_name,)
                )
                result = cursor.fetchone()
                if result:
                    self.source_id = result['id']
                else:
                    cursor.execute(
                        """INSERT INTO sources (name, url, source_type) 
                           VALUES (%s, %s, 'website') RETURNING id""",
                        (self.source_name, 'sample')
                    )
                    self.source_id = cursor.fetchone()['id']
                    self.db_conn.commit()
                    
        except Exception as e:
            self.logger.error(f"Database connection failed: {e}")
            raise
    
    def connect_rabbitmq(self):
        """Connect to RabbitMQ"""
        try:
            params = pika.URLParameters(os.getenv('RABBITMQ_URL'))
            self.rabbitmq_conn = pika.BlockingConnection(params)
            self.channel = self.rabbitmq_conn.channel()
            
            # Declare queue
            self.channel.queue_declare(
                queue='scraped_prices',
                durable=True
            )
            self.logger.info("RabbitMQ connected successfully")
            
        except Exception as e:
            self.logger.error(f"RabbitMQ connection failed: {e}")
            raise
    
    def get_product_id(self, product_name: str) -> Optional[int]:
        """Get product ID from database by name"""
        try:
            with self.db_conn.cursor() as cursor:
                cursor.execute(
                    "SELECT id FROM products WHERE LOWER(name) LIKE LOWER(%s)",
                    (f"%{product_name}%",)
                )
                result = cursor.fetchone()
                return result['id'] if result else None
        except Exception as e:
            self.logger.error(f"Error getting product ID: {e}")
            return None
    
    def get_location_id(self, location_name: str) -> Optional[int]:
        """Get location ID from database by name"""
        try:
            with self.db_conn.cursor() as cursor:
                cursor.execute(
                    "SELECT id FROM locations WHERE LOWER(name) LIKE LOWER(%s)",
                    (f"%{location_name}%",)
                )
                result = cursor.fetchone()
                return result['id'] if result else None
        except Exception as e:
            self.logger.error(f"Error getting location ID: {e}")
            return None
    
    def publish_to_queue(self, price_data: Dict):
        """Publish scraped price data to RabbitMQ"""
        try:
            message = json.dumps({
                'source_id': self.source_id,
                'source_name': self.source_name,
                'data': price_data,
                'scraped_at': datetime.utcnow().isoformat()
            })
            
            self.channel.basic_publish(
                exchange='',
                routing_key='scraped_prices',
                body=message,
                properties=pika.BasicProperties(
                    delivery_mode=2,  # make message persistent
                )
            )
            self.logger.info(f"Published: {price_data.get('product_name')} - ₦{price_data.get('price')}")
            
        except Exception as e:
            self.logger.error(f"Failed to publish to queue: {e}")
    
    def scrape(self) -> List[Dict]:
        """Override this method in child classes"""
        raise NotImplementedError("Scrape method must be implemented")
    
    def run(self):
        """Main execution method"""
        try:
            self.logger.info(f"Starting {self.source_name} scraper...")
            self.connect_db()
            self.connect_rabbitmq()
            
            # Run scraping
            results = self.scrape()
            
            self.logger.info(f"Scraped {len(results)} items")
            
            # Process results
            for item in results:
                self.publish_to_queue(item)
            
            self.logger.info("Scraping completed successfully")
            
        except Exception as e:
            self.logger.error(f"Scraper run failed: {e}")
            raise
        finally:
            if self.rabbitmq_conn:
                self.rabbitmq_conn.close()
            if self.db_conn:
                self.db_conn.close()