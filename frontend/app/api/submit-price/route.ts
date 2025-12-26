import { NextRequest, NextResponse } from 'next/server';
import { Pool } from 'pg';

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
});

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { product_id, location_id, price, unit, notes } = body;

    // Validation
    if (!product_id || !location_id || !price || !unit) {
      return NextResponse.json(
        { success: false, error: 'Missing required fields' },
        { status: 400 }
      );
    }

    // Get source_id for manual submissions
    const sourceResult = await pool.query(
      "SELECT id FROM sources WHERE name = 'Manual Entry' LIMIT 1"
    );
    
    const source_id = sourceResult.rows[0]?.id || 3; // Default to 3 if not found

    // Insert into scraped_prices table (will go through admin review)
    const result = await pool.query(
      `INSERT INTO scraped_prices 
       (product_id, location_id, source_id, price, unit, currency, scraped_at, status, admin_notes)
       VALUES ($1, $2, $3, $4, $5, 'NGN', NOW(), 'pending', $6)
       RETURNING id`,
      [product_id, location_id, source_id, parseFloat(price), unit, notes || null]
    );

    console.log(`Manual price submitted: ID ${result.rows[0].id}`);

    return NextResponse.json({
      success: true,
      message: 'Price submitted successfully and awaiting review',
      id: result.rows[0].id
    });

  } catch (error) {
    console.error('Error submitting price:', error);
    return NextResponse.json(
      { success: false, error },
      { status: 500 }
    );
  }
}