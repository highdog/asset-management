import { supabase } from '@/lib/supabase';
import { NextRequest, NextResponse } from 'next/server';

/**
 * GET /api/etf/kline?symbol=512050&days=30
 * 获取ETF的K线数据
 */
export async function GET(request: NextRequest) {
  try {
    const symbol = request.nextUrl.searchParams.get('symbol');
    const days = request.nextUrl.searchParams.get('days') || '30';

    if (!symbol) {
      return NextResponse.json(
        { error: '缺少参数: symbol' },
        { status: 400 }
      );
    }

    // 从Supabase查询K线数据
    const { data, error } = await supabase
      .from('etf_kline')
      .select('*')
      .eq('symbol', symbol)
      .order('date', { ascending: false })
      .limit(parseInt(days));

    if (error) {
      console.error('Supabase错误:', error);
      return NextResponse.json(
        { error: '数据库查询失败' },
        { status: 500 }
      );
    }

    return NextResponse.json({
      symbol,
      count: data.length,
      data: data,
    });
  } catch (error) {
    console.error('API错误:', error);
    return NextResponse.json(
      { error: '服务器错误' },
      { status: 500 }
    );
  }
}
