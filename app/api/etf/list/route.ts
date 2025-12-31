import { NextResponse } from 'next/server';

// ETF列表数据
const ETF_LIST = [
  { code: '512050', name: 'A500ETF', category: 'stock' },
  { code: '513130', name: '恒生科技ETF', category: 'stock' },
  { code: '159545', name: '恒生红利低波', category: 'stock' },
  { code: '159919', name: '沪深300ETF', category: 'stock' },
  { code: '159922', name: '中证500ETF', category: 'stock' },
  { code: '512400', name: '有色金属ETF', category: 'commodity' },
  { code: '512690', name: '酒ETF', category: 'stock' },
  { code: '512890', name: '红利低波ETF', category: 'stock' },
  { code: '513100', name: '纳指ETF', category: 'stock' },
  { code: '515790', name: '光伏ETF', category: 'stock' },
  { code: '561910', name: '电池ETF', category: 'stock' },
  { code: '588000', name: '科创50ETF', category: 'stock' },
  { code: '160323', name: '华夏磐泰LOF', category: 'stock' },
  { code: '513650', name: '标普ETF', category: 'stock' },
  { code: '159399', name: '现金流', category: 'stock' },
  { code: '513000', name: '日经225etf', category: 'stock' },
  { code: '159235', name: '现金流DC', category: 'stock' },
];

/**
 * GET /api/etf/list?category=stock
 * 获取ETF列表，可选按分类筛选
 */
export async function GET(request: Request) {
  try {
    const url = new URL(request.url);
    const category = url.searchParams.get('category');

    let result = ETF_LIST;

    if (category) {
      result = ETF_LIST.filter((etf) => etf.category === category);
    }

    return NextResponse.json({
      count: result.length,
      data: result,
    });
  } catch (error) {
    console.error('API错误:', error);
    return NextResponse.json(
      { error: '服务器错误' },
      { status: 500 }
    );
  }
}
