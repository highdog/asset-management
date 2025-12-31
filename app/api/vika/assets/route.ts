import { Vika } from "@vikadata/vika";

export async function GET(request: Request) {
  try {
    const vika = new Vika({ 
      token: process.env.NEXT_PUBLIC_VIKA_TOKEN || "uskZvw7obpRGbuentzrDUQD",
      fieldKey: "name" 
    });

    // 使用标的表的 datasheetId 和 viewId
    const datasheet = vika.datasheet(process.env.NEXT_PUBLIC_VIKA_ASSETS_DATASHEET_ID || "dstxvJma14X5c88rvk");

    const response = await datasheet.records.query({ 
      viewId: process.env.NEXT_PUBLIC_VIKA_ASSETS_VIEW_ID || "viwnRo6AsEaJU"
    });

    if (response.success) {
      const records = response.data.records || [];

      // 处理记录，提取标的信息
      const assetData = records.map((record: any) => {
        const fields = record.fields || {};
        return {
          recordId: record.recordId,
          标的名称: fields['标的名称'] || '',
          标的代码: fields['标的代码'] || '',
          当前价格: parseFloat(fields['当前价格']) || 0,
          持有数量: parseFloat(fields['持有数量']) || 0,
          持有金额: parseFloat(fields['持有金额']) || 0,
          比例: parseFloat(fields['比例']) || 0,
          总金额: parseFloat(fields['总金额']) || 0,
          东财证券ID: fields['标的代码'] || '', // 使用标的代码作为东财证券ID
        };
      }).filter(asset => asset.标的名称); // 仅保留有标的名称的记录

      return Response.json({ success: true, data: assetData });
    } else {
      return Response.json({ 
        success: false, 
        error: '无法从 Vika 获取数据',
        details: response 
      }, { status: 500 });
    }
  } catch (error) {
    console.error('Vika Assets API Error:', error);
    return Response.json({ 
      success: false, 
      error: error instanceof Error ? error.message : '未知错误'
    }, { status: 500 });
  }
}
