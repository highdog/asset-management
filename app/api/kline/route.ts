export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const secid = searchParams.get('secid'); // 东财证券ID，例如 1.510300
    const klt = searchParams.get('klt') || '101'; // K线类型，101=日线
    const lmt = searchParams.get('lmt') || '500'; // 返回记录数

    if (!secid) {
      return Response.json(
        { success: false, error: '缺少必要参数: secid' },
        { status: 400 }
      );
    }

    // 调用东财API获取K线数据
    const eastmoneyUrl = new URL('https://push2his.eastmoney.com/api/qt/stock/kline/get');
    eastmoneyUrl.searchParams.append('secid', secid);
    eastmoneyUrl.searchParams.append('ut', 'bd1d9ddb7ed1f65f860a6');
    eastmoneyUrl.searchParams.append('fields1', 'f1,f2,f3,f4,f5,f6');
    eastmoneyUrl.searchParams.append('fields2', 'f51,f52,f53,f54,f55,f56,f57,f58,f59,f60,f61');
    eastmoneyUrl.searchParams.append('klt', klt);
    eastmoneyUrl.searchParams.append('fqt', '0'); // 不复权
    eastmoneyUrl.searchParams.append('beg', '0');
    eastmoneyUrl.searchParams.append('end', '20500000');
    eastmoneyUrl.searchParams.append('lmt', lmt);
    eastmoneyUrl.searchParams.append('_', Date.now().toString());

    const response = await fetch(eastmoneyUrl.toString());
    
    if (!response.ok) {
      return Response.json(
        { success: false, error: `东财API错误: ${response.statusText}` },
        { status: response.status }
      );
    }

    const data = await response.json();

    if (data.rc !== 0 || !data.data || !data.data.klines) {
      return Response.json(
        { success: false, error: '无法获取K线数据', details: data },
        { status: 400 }
      );
    }

    // 解析K线数据
    const klines = data.data.klines.map((line: string) => {
      const fields = line.split(',');
      return {
        date: fields[0], // 日期
        open: parseFloat(fields[1]), // 开盘价
        close: parseFloat(fields[2]), // 收盘价
        high: parseFloat(fields[3]), // 最高价
        low: parseFloat(fields[4]), // 最低价
        volume: parseInt(fields[5]), // 成交量
        amount: parseFloat(fields[6]), // 成交金额
      };
    });

    // 返回解析后的K线数据
    return Response.json({
      success: true,
      data: {
        secid,
        name: data.data.name,
        code: data.data.code,
        decimal: data.data.decimal,
        dktotal: data.data.dktotal,
        klines,
      },
    });
  } catch (error) {
    console.error('K-line API Error:', error);
    return Response.json(
      {
        success: false,
        error: error instanceof Error ? error.message : '未知错误',
      },
      { status: 500 }
    );
  }
}
