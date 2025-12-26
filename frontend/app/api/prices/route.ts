import { NextRequest, NextResponse } from 'next/server';
import { pool } from '../../../lib/db';

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const productId = searchParams.get('product_id');
    const locationId = searchParams.get('location_id');
    const limit = parseInt(searchParams.get('limit') || '50');

    let query = `
      SELECT 
        time,
        product_id,
        product_name,
        category,
        location_id,
        location_name,
        state,
        price,
        unit,
        currency,
        price_per_kg,
        source_name
      FROM latest_prices
      WHERE 1=1
    `;
    
    const params: (string | number)[] = [];
    
    if (productId) {
      params.push(productId);
      query += ` AND product_id = $${params.length}`;
    }
    
    if (locationId) {
      params.push(locationId);
      query += ` AND location_id = $${params.length}`;
    }
    
    params.push(limit);
    query += ` ORDER BY time DESC LIMIT $${params.length}`;

    const result = await pool.query(query, params);

    return NextResponse.json({
      success: true,
      data: result.rows,
      count: result.rows.length
    });

  } catch (error) {
    console.error('Error fetching prices:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to fetch prices' },
      { status: 500 }
    );
  }
}