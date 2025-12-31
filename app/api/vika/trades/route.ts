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

      // 如果指定了标的，需要从标的表中查找对应的 recordId
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
            // 过滤交易记录 - 通过标的字段中是否包含目标recordId来筛选
            records = records.filter((record: any) => {
              const fields = record.fields || {};
              const assetField = fields['标的'];
              if (Array.isArray(assetField)) {
                return assetField.includes(targetRecordId);
              }
              return assetField === targetRecordId;
            });
          }
        }
      }

      const tradeData = records.map((record: any) => {
        const fields = record.fields || {};
        // 买入日期是时间戳，需要转换为 ISO 格式 (YYYY-MM-DD)
        let buyDate = '';
        if (fields['买入日期']) {
          const timestamp = fields['买入日期'];
          if (typeof timestamp === 'number') {
            const date = new Date(timestamp);
            buyDate = date.toISOString().split('T')[0];
          } else {
            buyDate = String(fields['买入日期']) || '';
          }
        }

        let sellDate = '';
        if (fields['卖出日期']) {
          const timestamp = fields['卖出日期'];
          if (typeof timestamp === 'number') {
            const date = new Date(timestamp);
            sellDate = date.toISOString().split('T')[0];
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
