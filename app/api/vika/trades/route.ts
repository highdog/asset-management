import { Vika } from "@vikadata/vika";

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const selectedAsset = searchParams.get('asset');

    const vika = new Vika({ 
      token: process.env.NEXT_PUBLIC_VIKA_TOKEN || "uskZvw7obpRGbuentzrDUQD",
      fieldKey: "name" 
    });

    // 使用交易记录表的 datasheetId 和 viewId
    const datasheet = vika.datasheet(process.env.NEXT_PUBLIC_VIKA_DATASHEET_ID || "dstV5njpAs8gdUiZsM");

    const response = await datasheet.records.query({ 
      viewId: process.env.NEXT_PUBLIC_VIKA_VIEW_ID || "viwoU2a7v3HLE"
    });

    if (response.success) {
      let records = response.data.records || [];

      // 如果指定了标的，则过滤
      // selectedAsset 可以是标的名称
      if (selectedAsset) {
        records = records.filter((record: any) => {
          const fields = record.fields || {};
          const assetField = fields['标的'];
          // 标的字段可能是数组（匹配 ID）或字符串（匹配名称）
          if (Array.isArray(assetField)) {
            // 如果是数组，仅作为筛选条件，不过滤
            // 应为节目和交易记录之间是国际化字段
            return true; // 再过滤器中按名称过滤
          }
          return assetField === selectedAsset || (typeof assetField === 'string' && assetField.includes(selectedAsset));
        });
      }

      // 处理记录，提取买卖信息
      const tradeData = records.map((record: any) => {
        const fields = record.fields || {};
        // 买入日期是时间戳，需要转换为日期字符串
        let buyDate = '';
        if (fields['买入日期']) {
          const timestamp = fields['买入日期'];
          if (typeof timestamp === 'number') {
            const date = new Date(timestamp);
            buyDate = date.toLocaleDateString('zh-CN');
          } else {
            buyDate = String(fields['买入日期']) || '';
          }
        }

        let sellDate = '';
        if (fields['卖出日期']) {
          const timestamp = fields['卖出日期'];
          if (typeof timestamp === 'number') {
            const date = new Date(timestamp);
            sellDate = date.toLocaleDateString('zh-CN');
          } else {
            sellDate = String(fields['卖出日期']) || '';
          }
        }

        return {
          id: record.recordId,
          标的: fields['标的'] || '',
          买入日期: buyDate,
          买入价格: parseFloat(fields['买入价格']) || 0,
          买入数量: parseFloat(fields['买入数量']) || 0,
          买入金额: parseFloat(fields['买入金额']) || 0,
          卖出日期: sellDate,
          卖出价格: parseFloat(fields['卖出价格']) || 0,
          卖出数量: parseFloat(fields['卖出数量']) || 0,
          卖出金额: parseFloat(fields['卖出金额']) || 0,
          状态: fields['状态'] || '',
          盈亏金额: parseFloat(fields['盈亏金额']) || 0,
          盈亏比例: parseFloat(fields['盈亏比例']) || 0,
          手续费: parseFloat(fields['手续费']) || 0,
        };
      });

      // 下一步：如果 selectedAsset 是标的名称，需要从标的表中查找沐应的 recordId
      if (selectedAsset) {
        // 获取标的表中指定名称的 recordId
        const assetDatasheet = vika.datasheet(process.env.NEXT_PUBLIC_VIKA_ASSETS_DATASHEET_ID || "dstxvJma14X5c88rvk");
        const assetResponse = await assetDatasheet.records.query({ 
          viewId: process.env.NEXT_PUBLIC_VIKA_ASSETS_VIEW_ID || "viwnRo6AsEaJU"
        });

        if (assetResponse.success) {
          const assets = assetResponse.data.records || [];
          const targetAsset = assets.find((a: any) => a.fields['标的名称'] === selectedAsset);
          
          if (targetAsset) {
            const targetRecordId = targetAsset.recordId;
            // 过滤交易记录
            return Response.json({ 
              success: true, 
              data: tradeData.filter((trade: any) => {
                const assetField = trade.标的;
                if (Array.isArray(assetField)) {
                  return assetField.includes(targetRecordId);
                }
                return assetField === targetRecordId || assetField === selectedAsset;
              })
            });
          }
        }
      }

      return Response.json({ success: true, data: tradeData });
    } else {
      return Response.json({ 
        success: false, 
        error: '无法从 Vika 获取数据',
        details: response 
      }, { status: 500 });
    }
  } catch (error) {
    console.error('Vika API Error:', error);
    return Response.json({ 
      success: false, 
      error: error instanceof Error ? error.message : '未知错误'
    }, { status: 500 });
  }
}
