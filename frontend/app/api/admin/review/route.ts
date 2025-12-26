import { NextRequest, NextResponse } from 'next/server';
import { pool } from '../../../../lib/db';

// GET - Fetch pending scraped prices for review
export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const status = searchParams.get('status') || 'pending';
    const limit = parseInt(searchParams.get('limit') || '100');

    const result = await pool.query(
      `SELECT 
        sp.id,
        sp.price,
        sp.unit,
        sp.currency,
        sp.scraped_at,
        sp.status,
        sp.flagged_reason,
        sp.admin_notes,
        p.name as product_name,
        p.category as product_category,
        l.name as location_name,
        l.state,
        s.name as source_name,
        s.reliability_score
      FROM scraped_prices sp
      JOIN products p ON sp.product_id = p.id
      JOIN locations l ON sp.location_id = l.id
      JOIN sources s ON sp.source_id = s.id
      WHERE sp.status = $1
      ORDER BY 
        CASE WHEN sp.status = 'flagged' THEN 0 ELSE 1 END,
        sp.scraped_at DESC
      LIMIT $2`,
      [status, limit]
    );

    return NextResponse.json({
      success: true,
      data: result.rows,
      count: result.rows.length
    });

  } catch (error) {
    console.error('Error fetching review queue:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to fetch review queue' },
      { status: 500 }
    );
  }
}

// expose the Socket.IO server put on `global` by `web/server.js`

declare global {
  var io: import('socket.io').Server | undefined;
}

// POST - Approve or reject scraped price
export async function POST(request: NextRequest) {
  const client = await pool.connect();
  

  
  try {
    const body = await request.json();
    const { id, action, admin_notes } = body;

    if (!id || !action) {
      return NextResponse.json(
        { success: false, error: 'Missing required fields' },
        { status: 400 }
      );
    }

    await client.query('BEGIN');

    // Get the scraped price details
    const scrapedPrice = await client.query(
      `SELECT * FROM scraped_prices WHERE id = $1`,
      [id]
    );

    if (scrapedPrice.rows.length === 0) {
      await client.query('ROLLBACK');
      return NextResponse.json(
        { success: false, error: 'Price not found' },
        { status: 404 }
      );
    }

    const price = scrapedPrice.rows[0];

    if (action === 'approve') {
      // Calculate normalized price per kg
      const pricePerKg = calculatePricePerKg(
        parseFloat(price.price),
        price.unit
      );

      // Insert into approved prices table
      await client.query(
        `INSERT INTO prices 
         (time, product_id, location_id, source_id, price, unit, currency, price_per_kg, approved_by)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)`,
        [
          price.scraped_at,
          price.product_id,
          price.location_id,
          price.source_id,
          price.price,
          price.unit,
          price.currency,
          pricePerKg,
          1 // TODO: Use actual admin ID
        ]
      );

      // Update status to approved
      await client.query(
        `UPDATE scraped_prices 
         SET status = 'approved', admin_notes = $1, reviewed_at = NOW(), reviewed_by = $2
         WHERE id = $3`,
        [admin_notes || null, 1, id]
      );

      await client.query('COMMIT');

      // Broadcast to connected clients
      if (globalThis.io) {
        globalThis.io.to('prices').emit('price_approved', {
          product_id: price.product_id,
          location_id: price.location_id,
          price: price.price,
          product_name: scrapedPrice.rows[0].product_name,
          location_name: scrapedPrice.rows[0].location_name
        });
        console.log('Broadcasted price update via WebSocket');
      }

      return NextResponse.json({
        success: true,
        message: 'Price approved and published'
      });

    } else if (action === 'reject') {
      // Update status to rejected
      await client.query(
        `UPDATE scraped_prices 
         SET status = 'rejected', admin_notes = $1, reviewed_at = NOW(), reviewed_by = $2
         WHERE id = $3`,
        [admin_notes || null, 1, id]
      );

      await client.query('COMMIT');

      return NextResponse.json({
        success: true,
        message: 'Price rejected'
      });
    }

    return NextResponse.json(
      { success: false, error: 'Invalid action' },
      { status: 400 }
    );

  } catch (error) {
    await client.query('ROLLBACK');
    console.error('Error processing review action:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to process action' },
      { status: 500 }
    );
  } finally {
    client.release();
  }
}

// Helper function to normalize prices
function calculatePricePerKg(price: number, unit: string): number {
  const lowerUnit = unit.toLowerCase();
  
  if (lowerUnit.includes('50kg') || lowerUnit.includes('bag (50kg)')) {
    return price / 50;
  }
  if (lowerUnit.includes('100kg') || lowerUnit.includes('bag (100kg)')) {
    return price / 100;
  }
  if (lowerUnit.includes('kg')) {
    return price;
  }
  
  return price;
}