import amqp from 'amqplib';
import { Pool } from 'pg';
import dotenv from 'dotenv';

dotenv.config();

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
});

interface ScrapedData {
  product_id: number;
  product_name: string;
  location_id: number;
  location_name: string;
  price: number;
  unit: string;
  currency: string;
}

interface QueueMessage {
  source_id: number;
  source_name: string;
  data: ScrapedData;
  scraped_at: string;
}

async function validateData(data: ScrapedData): Promise<boolean> {
  // Basic validation
  if (!data.product_id || !data.location_id) {
    console.warn('⚠️  Missing product or location ID');
    return false;
  }

  if (!data.price || data.price <= 0) {
    console.warn('⚠️  Invalid price');
    return false;
  }

  if (!data.unit || !data.currency) {
    console.warn('⚠️  Missing unit or currency');
    return false;
  }

  return true;
}

async function detectAnomaly(data: ScrapedData): Promise<{ 
  isAnomaly: boolean; 
  reason?: string 
}> {
  try {
    // Get recent prices for this product/location
    const result = await pool.query(
      `SELECT price FROM scraped_prices 
       WHERE product_id = $1 AND location_id = $2 
       AND status = 'approved'
       AND scraped_at > NOW() - INTERVAL '7 days'
       ORDER BY scraped_at DESC
       LIMIT 10`,
      [data.product_id, data.location_id]
    );

    if (result.rows.length === 0) {
      // No historical data, can't detect anomaly
      return { isAnomaly: false };
    }

    const recentPrices = result.rows.map(r => parseFloat(r.price));
    const avgPrice = recentPrices.reduce((a, b) => a + b, 0) / recentPrices.length;
    const priceChange = Math.abs((data.price - avgPrice) / avgPrice);

    // Flag if price changed more than 30%
    if (priceChange > 0.3) {
      return {
        isAnomaly: true,
        reason: `Price changed ${(priceChange * 100).toFixed(1)}% from recent average (₦${avgPrice.toFixed(2)})`
      };
    }

    return { isAnomaly: false };

  } catch (error) {
    console.error('Error detecting anomaly:', error);
    return { isAnomaly: false };
  }
}

async function saveToDatabase(message: QueueMessage) {
  const client = await pool.connect();
  
  try {
    const { data, source_id, scraped_at } = message;

    // Validate data
    const isValid = await validateData(data);
    if (!isValid) {
      console.log('❌ Invalid data, skipping');
      return;
    }

    // Check for anomalies
    const anomalyCheck = await detectAnomaly(data);
    const status = anomalyCheck.isAnomaly ? 'flagged' : 'pending';
    const flaggedReason = anomalyCheck.reason || null;

    // Insert into scraped_prices table
    await client.query(
      `INSERT INTO scraped_prices 
       (product_id, location_id, source_id, price, unit, currency, 
        scraped_at, status, flagged_reason)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)`,
      [
        data.product_id,
        data.location_id,
        source_id,
        data.price,
        data.unit,
        data.currency,
        scraped_at,
        status,
        flaggedReason
      ]
    );

    const statusEmoji = status === 'flagged' ? '🚩' : '✅';
    console.log(`${statusEmoji} Saved: ${data.product_name} at ${data.location_name} - ₦${data.price.toLocaleString()} [${status}]`);

    if (flaggedReason) {
      console.log(`   ⚠️  ${flaggedReason}`);
    }

  } catch (error) {
    console.error('❌ Error saving to database:', error);
    throw error;
  } finally {
    client.release();
  }
}

async function startWorker() {
  try {
    console.log('🚀 Starting Ingestion Worker...\n');

    // Test database connection
    const testConn = await pool.query('SELECT NOW()');
    console.log('✅ Database connected');

    // Connect to RabbitMQ
    const connection = await amqp.connect(process.env.RABBITMQ_URL!);
    const channel = await connection.createChannel();

    await channel.assertQueue('scraped_prices', { durable: true });
    channel.prefetch(1); // Process one message at a time

    console.log('✅ Connected to RabbitMQ');
    console.log('⏳ Waiting for messages...\n');
    console.log('-----------------------------------');

    // Consume messages
    channel.consume('scraped_prices', async (msg) => {
      if (msg) {
        try {
          const message: QueueMessage = JSON.parse(msg.content.toString());
          
          console.log(`\n📥 Processing: ${message.data.product_name} from ${message.source_name}`);
          
          await saveToDatabase(message);
          
          // Acknowledge message (remove from queue)
          channel.ack(msg);
          
        } catch (error) {
          console.error('❌ Error processing message:', error);
          // Reject and requeue message
          channel.nack(msg, false, true);
        }
      }
    });

    // Handle graceful shutdown
    process.on('SIGINT', async () => {
      console.log('\n\n🛑 Shutting down gracefully...');
      await channel.close();
      await connection.close();
      await pool.end();
      console.log('✅ Closed all connections');
      process.exit(0);
    });

  } catch (error) {
    console.error('❌ Failed to start worker:', error);
    process.exit(1);
  }
}

// Start the worker
startWorker();